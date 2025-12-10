import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShelfWithItemCount } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { isOnline, enqueueAction } from '../services/offlineQueue';
import toast from 'react-hot-toast';

export const Shelves = () => {
  const [shelves, setShelves] = useState<ShelfWithItemCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadShelves();
  }, []);

  const loadShelves = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shelves')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Get item counts for each shelf
      const shelvesWithCounts = await Promise.all(
        (data || []).map(async (shelf) => {
          const { count } = await supabase
            .from('items')
            .select('*', { count: 'exact', head: true })
            .eq('current_shelf_id', shelf.id);

          return {
            ...shelf,
            item_count: count || 0,
          };
        })
      );

      setShelves(shelvesWithCounts);
    } catch (error: any) {
      toast.error(error.message || 'Error loading shelves');
    } finally {
      setLoading(false);
    }
  };

  const handleShelfClick = (barcode: string, e?: React.MouseEvent) => {
    // Don't navigate if clicking the delete button
    if (e && (e.target as HTMLElement).closest('button')) {
      return;
    }
    navigate(`/scan-shelf?barcode=${barcode}`);
  };

  const handleDeleteShelf = async (shelfId: string) => {
    const shelf = shelves.find((s) => s.id === shelfId);
    if (!shelf) return;

    setDeleting(true);
    setShowDeleteDialog(null);

    try {
      if (isOnline()) {
        // First, remove all items from this shelf
        const { error: updateError } = await supabase
          .from('items')
          .update({ current_shelf_id: null })
          .eq('current_shelf_id', shelfId);

        if (updateError) {
          console.error('Error removing items from shelf:', updateError);
          toast.error(`Failed to remove items: ${updateError.message}`);
          throw updateError;
        }

        // Then delete the shelf
        const { error, data } = await supabase
          .from('shelves')
          .delete()
          .eq('id', shelfId)
          .select();

        if (error) {
          console.error('Error deleting shelf:', error);
          // Check if it's an RLS policy error
          if (error.message.includes('policy') || error.message.includes('permission') || error.code === '42501') {
            toast.error('Permission denied. Please add DELETE policies in Supabase. See FIX_DELETE_ISSUE.md for instructions.');
          } else {
            toast.error(`Failed to delete shelf: ${error.message}`);
          }
          throw error;
        }

        // Check if deletion was successful
        // Note: Supabase DELETE with .select() returns deleted rows, but if RLS blocks it, returns empty array
        if (data && data.length > 0) {
          toast.success('Shelf deleted successfully');
          // Optimistically remove from UI immediately
          setShelves(shelves.filter((s) => s.id !== shelfId));
          // Then reload to ensure consistency
          await loadShelves();
        } else {
          // No data returned - verify if shelf still exists
          const { data: verifyShelf } = await supabase
            .from('shelves')
            .select('id')
            .eq('id', shelfId)
            .single();

          if (verifyShelf) {
            // Shelf still exists - RLS is blocking deletion
            toast.error('Delete was blocked by security policies. Please add DELETE policies in Supabase. See FIX_DELETE_ISSUE.md');
            console.error('Delete blocked: Shelf still exists after delete attempt');
          } else {
            // Shelf doesn't exist - successfully deleted (maybe by another user)
            toast.success('Shelf deleted successfully');
            setShelves(shelves.filter((s) => s.id !== shelfId));
            await loadShelves();
          }
        }
      } else {
        // Queue for offline
        enqueueAction({
          type: 'DELETE_SHELF',
          payload: {
            shelf_id: shelfId,
            shelf_barcode: shelf.barcode,
          },
        });
        toast.success('Delete action queued for sync');
        // Optimistically remove from UI
        setShelves(shelves.filter((s) => s.id !== shelfId));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete shelf');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 sm:gap-2 min-h-[44px] flex items-center">
              <span className="text-lg sm:text-xl">←</span> <span className="text-sm sm:text-base">Back</span>
            </Link>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">All Shelves</h1>
            <div className="w-16 sm:w-20"></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600 font-medium text-sm sm:text-base">Loading shelves...</p>
          </div>
        ) : shelves.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center border border-gray-200">
            <div className="text-5xl sm:text-6xl mb-4">📦</div>
            <p className="text-gray-600 font-medium mb-4 text-base sm:text-lg">No shelves found</p>
            <Link
              to="/barcode-generator"
              className="text-blue-600 hover:text-blue-800 font-semibold text-base sm:text-lg min-h-[44px] inline-flex items-center"
            >
              Create your first shelf →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {shelves.map((shelf) => (
              <div
                key={shelf.id}
                onClick={(e) => handleShelfClick(shelf.barcode, e)}
                className="bg-white rounded-xl shadow-lg p-4 sm:p-6 cursor-pointer hover:shadow-xl transition-all duration-200 border-2 border-gray-200 hover:border-blue-300 transform hover:scale-[1.02] active:scale-[0.98] relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(shelf.id);
                  }}
                  disabled={deleting}
                  className="absolute top-3 right-3 text-red-600 hover:text-red-800 font-semibold text-sm px-2 py-1 rounded-lg hover:bg-red-50 transition min-h-[36px] min-w-[36px] disabled:opacity-50 z-10"
                  title="Delete shelf"
                >
                  🗑️
                </button>
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900 pr-8">{shelf.name}</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 font-medium">{shelf.location}</p>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 pt-3 sm:pt-4 border-t border-gray-200">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 px-2 sm:px-3 py-1 rounded-md">
                    {shelf.item_count} item{shelf.item_count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded break-all">{shelf.barcode}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showDeleteDialog && (
          <ConfirmDialog
            isOpen={!!showDeleteDialog}
            title="Delete Shelf"
            message={`Are you sure you want to delete shelf "${shelves.find((s) => s.id === showDeleteDialog)?.name}"? All items in this shelf will be removed from the shelf (but not deleted). This action cannot be undone.`}
            confirmText="Delete Shelf"
            cancelText="Cancel"
            onConfirm={() => {
              if (showDeleteDialog) {
                handleDeleteShelf(showDeleteDialog);
              }
            }}
            onCancel={() => setShowDeleteDialog(null)}
            variant="danger"
          />
        )}
      </div>
    </div>
  );
};

