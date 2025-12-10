/**
 * Offline Queue Service
 * 
 * Manages queuing of actions when offline and syncing when connection is restored.
 * Uses localStorage to persist queued actions across page refreshes.
 */

import { QueuedAction } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const QUEUE_STORAGE_KEY = 'inventory_offline_queue';
const SYNC_IN_PROGRESS_KEY = 'inventory_sync_in_progress';

/**
 * Check if device is online
 */
export const isOnline = (): boolean => {
  return navigator.onLine;
};

/**
 * Get all queued actions from localStorage
 */
export const getQueuedActions = (): QueuedAction[] => {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading queued actions:', error);
    return [];
  }
};

/**
 * Save queued actions to localStorage
 */
const saveQueuedActions = (actions: QueuedAction[]): void => {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(actions));
  } catch (error) {
    console.error('Error saving queued actions:', error);
  }
};

/**
 * Add an action to the offline queue
 */
export const enqueueAction = (action: Omit<QueuedAction, 'id' | 'timestamp' | 'synced'>): string => {
  const queuedAction: QueuedAction = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    synced: false,
    ...action,
  };

  const actions = getQueuedActions();
  actions.push(queuedAction);
  saveQueuedActions(actions);

  return queuedAction.id;
};

/**
 * Remove a queued action (after successful sync)
 * Note: Currently unused but kept for future use
 */
// const removeQueuedAction = (actionId: string): void => {
//   const actions = getQueuedActions();
//   const filtered = actions.filter((a) => a.id !== actionId);
//   saveQueuedActions(filtered);
// };

/**
 * Mark an action as synced
 */
const markAsSynced = (actionId: string): void => {
  const actions = getQueuedActions();
  const updated = actions.map((a) => (a.id === actionId ? { ...a, synced: true } : a));
  saveQueuedActions(updated);
};

/**
 * Process a single queued action
 * Returns true if successful, false otherwise
 */
const processAction = async (action: QueuedAction): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user authenticated');
      return false;
    }

    const { type, payload } = action;

    // Handle DELETE actions first (they don't need item lookup)
    if (type === 'DELETE_SHELF' && payload.shelf_id) {
      // Delete shelf - first remove items from shelf
      await supabase
        .from('items')
        .update({ current_shelf_id: null })
        .eq('current_shelf_id', payload.shelf_id);

      // Then delete the shelf
      const { error } = await supabase
        .from('shelves')
        .delete()
        .eq('id', payload.shelf_id);

      if (error) {
        console.error('Error deleting shelf:', error);
        return false;
      }
      return true;
    }

    if (type === 'DELETE_ITEM' && payload.item_id) {
      // Delete item (movements will be cascade deleted by database)
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', payload.item_id);

      if (error) {
        console.error('Error deleting item:', error);
        return false;
      }
      return true;
    }

    // For other actions, we need to find or create item
    if (!payload.serial_number) {
      console.error('Serial number required for this action');
      return false;
    }

    // Find or create item by serial number
    let itemId: string;
    const { data: existingItem } = await supabase
      .from('items')
      .select('id')
      .eq('serial_number', payload.serial_number)
      .single();

    if (existingItem) {
      itemId = existingItem.id;
    } else {
      // Create new item
      const { data: newItem, error: createError } = await supabase
        .from('items')
        .insert({
          serial_number: payload.serial_number,
          current_shelf_id: null,
        })
        .select('id')
        .single();

      if (createError || !newItem) {
        console.error('Error creating item:', createError);
        return false;
      }
      itemId = newItem.id;
    }

    // Handle different action types
    if (type === 'CHECK_IN' && payload.shelf_barcode) {
      // Find shelf by barcode
      const { data: shelf } = await supabase
        .from('shelves')
        .select('id')
        .eq('barcode', payload.shelf_barcode)
        .single();

      if (!shelf) {
        console.error('Shelf not found:', payload.shelf_barcode);
        return false;
      }

      // Get current shelf for the item
      const { data: currentItem } = await supabase
        .from('items')
        .select('current_shelf_id')
        .eq('id', itemId)
        .single();

      // Update item's current shelf
      await supabase
        .from('items')
        .update({ current_shelf_id: shelf.id })
        .eq('id', itemId);

      // Create movement record
      await supabase.from('movements').insert({
        item_id: itemId,
        from_shelf_id: currentItem?.current_shelf_id || null,
        to_shelf_id: shelf.id,
        movement_type: 'IN',
        user_id: user.id,
        timestamp: action.timestamp,
      });
    } else if (type === 'CHECK_OUT') {
      // Get current shelf
      const { data: currentItem } = await supabase
        .from('items')
        .select('current_shelf_id')
        .eq('id', itemId)
        .single();

      const fromShelfId = currentItem?.current_shelf_id || null;
      let toShelfId: string | null = null;

      if (payload.destination_shelf_barcode) {
        // Moving to another shelf
        const { data: destShelf } = await supabase
          .from('shelves')
          .select('id')
          .eq('barcode', payload.destination_shelf_barcode)
          .single();

        if (destShelf) {
          toShelfId = destShelf.id;
        }
      }

      // Update item's current shelf
      await supabase
        .from('items')
        .update({ current_shelf_id: toShelfId })
        .eq('id', itemId);

      // Create movement record
      await supabase.from('movements').insert({
        item_id: itemId,
        from_shelf_id: fromShelfId,
        to_shelf_id: toShelfId,
        movement_type: toShelfId ? 'MOVE' : 'OUT',
        user_id: user.id,
        timestamp: action.timestamp,
      });
    } else if (type === 'MOVE' && payload.destination_shelf_barcode) {
      // Direct move action
      const { data: fromShelf } = await supabase
        .from('shelves')
        .select('id')
        .eq('barcode', payload.shelf_barcode)
        .single();

      const { data: toShelf } = await supabase
        .from('shelves')
        .select('id')
        .eq('barcode', payload.destination_shelf_barcode)
        .single();

      if (!toShelf) {
        console.error('Destination shelf not found');
        return false;
      }

      // Update item's current shelf
      await supabase
        .from('items')
        .update({ current_shelf_id: toShelf.id })
        .eq('id', itemId);

      // Create movement record
      await supabase.from('movements').insert({
        item_id: itemId,
        from_shelf_id: fromShelf?.id || null,
        to_shelf_id: toShelf.id,
        movement_type: 'MOVE',
        user_id: user.id,
        timestamp: action.timestamp,
      });
    }

    return true;
  } catch (error) {
    console.error('Error processing action:', error);
    return false;
  }
};

/**
 * Process all queued actions
 * This should be called when connection is restored
 */
export const processQueue = async (): Promise<number> => {
  // Prevent concurrent syncs
  if (localStorage.getItem(SYNC_IN_PROGRESS_KEY) === 'true') {
    return 0;
  }

  if (!isOnline()) {
    return 0;
  }

  localStorage.setItem(SYNC_IN_PROGRESS_KEY, 'true');

  try {
    const actions = getQueuedActions().filter((a) => !a.synced);
    let successCount = 0;

    for (const action of actions) {
      const success = await processAction(action);
      if (success) {
        markAsSynced(action.id);
        successCount++;
      } else {
        // Keep failed actions for retry
        console.warn('Failed to sync action:', action.id);
      }
    }

    // Remove synced actions
    const remaining = getQueuedActions().filter((a) => !a.synced);
    saveQueuedActions(remaining);

    if (successCount > 0) {
      toast.success(`${successCount} action(s) synced successfully`);
    }

    return successCount;
  } catch (error) {
    console.error('Error processing queue:', error);
    toast.error('Error syncing actions');
    return 0;
  } finally {
    localStorage.removeItem(SYNC_IN_PROGRESS_KEY);
  }
};

/**
 * Get count of pending actions
 */
export const getPendingActionCount = (): number => {
  return getQueuedActions().filter((a) => !a.synced).length;
};

