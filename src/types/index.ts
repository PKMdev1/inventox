// Database types matching Supabase schema

export interface Shelf {
  id: string;
  name: string;
  location: string;
  barcode: string;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  serial_number: string;
  current_shelf_id: string | null;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'IN' | 'OUT' | 'MOVE';

export interface Movement {
  id: string;
  item_id: string;
  from_shelf_id: string | null;
  to_shelf_id: string | null;
  movement_type: MovementType;
  user_id: string;
  timestamp: string;
  created_at: string;
}

// Extended types with joins
export interface MovementWithDetails extends Movement {
  item?: Item;
  from_shelf?: Shelf | null;
  to_shelf?: Shelf | null;
  user_email?: string;
}

export interface ItemWithShelf extends Item {
  shelf?: Shelf | null;
}

export interface ShelfWithItemCount extends Shelf {
  item_count?: number;
}

// Offline queue types
export interface QueuedAction {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'MOVE' | 'DELETE_SHELF' | 'DELETE_ITEM';
  payload: {
    serial_number?: string;
    shelf_barcode?: string;
    shelf_id?: string;
    item_id?: string;
    destination_shelf_barcode?: string;
    movement_type?: MovementType;
  };
  timestamp: string;
  synced: boolean;
}

