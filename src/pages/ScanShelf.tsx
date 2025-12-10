import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shelf, Item } from '../types';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { isOnline, enqueueAction } from '../services/offlineQueue';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const ScanShelf = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [showDeleteShelfDialog, setShowDeleteShelfDialog] = useState(false);
  const [showDeleteItemDialog, setShowDeleteItemDialog] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchShelfData = async (barcode: string) => {
    try {
      // Normalize barcode for consistent matching
      const normalizedBarcode = barcode.trim().toUpperCase();
      
      // Find shelf by barcode
      const { data: shelfData, error: shelfError } = await supabase
        .from('shelves')
        .select('*')
        .eq('barcode', normalizedBarcode)
        .single();

      if (shelfError || !shelfData) {
        toast.error('Shelf not found');
        return;
      }

      setShelf(shelfData);

      // Fetch items in this shelf
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('current_shelf_id', shelfData.id)
        .order('updated_at', { ascending: false });

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        setItems([]);
      } else {
        setItems(itemsData || []);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error loading shelf data');
    }
  };

  const handleScan = async (barcode: string) => {
    setShowScanner(false);
    await fetchShelfData(barcode);
  };

  useEffect(() => {
    const barcode = searchParams.get('barcode');
    if (barcode && !shelf) {
      fetchShelfData(barcode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleCheckIn = () => {
    if (!shelf) return;
    navigate(`/check-in?shelf_barcode=${shelf.barcode}`);
  };

  const handleCheckOut = () => {
    if (!shelf) return;
    navigate(`/check-out?shelf_barcode=${shelf.barcode}`);
  };

  const handleDeleteShelf = async () => {
    if (!shelf) return;
    setDeleting(true);
    setShowDeleteShelfDialog(false);

    try {
      if (isOnline()) {
        // First, remove all items from this shelf (set current_shelf_id to null)
        const { error: updateError } = await supabase
          .from('items')
          .update({ current_shelf_id: null })
          .eq('current_shelf_id', shelf.id);

        if (updateError) {
          console.error('Error removing items from shelf:', updateError);
          toast.error(`Failed to remove items: ${updateError.message}`);
          throw updateError;
        }

        // Then delete the shelf
        const { error, data } = await supabase
          .from('shelves')
          .delete()
          .eq('id', shelf.id)
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
        if (data && data.length > 0) {
          toast.success('Shelf deleted successfully');
          setShelf(null);
          setItems([]);
          navigate('/shelves');
        } else {
          // No data returned - verify if shelf still exists
          const { data: verifyShelf } = await supabase
            .from('shelves')
            .select('id')
            .eq('id', shelf.id)
            .single();

          if (verifyShelf) {
            // Shelf still exists - RLS is blocking deletion
            toast.error('Delete was blocked by security policies. Please add DELETE policies in Supabase. See FIX_DELETE_ISSUE.md');
            console.error('Delete blocked: Shelf still exists after delete attempt');
          } else {
            // Shelf doesn't exist - successfully deleted
            toast.success('Shelf deleted successfully');
            setShelf(null);
            setItems([]);
            navigate('/shelves');
          }
        }
      } else {
        // Queue for offline
        enqueueAction({
          type: 'DELETE_SHELF',
          payload: {
            shelf_id: shelf.id,
            shelf_barcode: shelf.barcode,
          },
        });
        toast.success('Delete action queued for sync');
        setShelf(null);
        setItems([]);
        navigate('/shelves');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete shelf');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteItem = async (itemId: string, serialNumber: string) => {
    setDeleting(true);
    setShowDeleteItemDialog(null);

    try {
      if (isOnline()) {
        // Delete the item (movements will be cascade deleted by database)
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', itemId);

        if (error) throw error;

        toast.success('Item deleted successfully');
        // Refresh items list
        if (shelf) {
          await fetchShelfData(shelf.barcode);
        }
      } else {
        // Queue for offline
        enqueueAction({
          type: 'DELETE_ITEM',
          payload: {
            item_id: itemId,
            serial_number: serialNumber,
          },
        });
        toast.success('Delete action queued for sync');
        // Optimistically remove from UI
        setItems(items.filter((item) => item.id !== itemId));
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete item');
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
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Scan Shelf</h1>
            <div className="w-16 sm:w-20"></div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {!shelf ? (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 lg:p-12 text-center">
            <div className="mb-6">
              <div className="text-5xl sm:text-6xl mb-4">📷</div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ready to Scan</h2>
              <p className="text-sm sm:text-base text-gray-600">Scan a shelf QR code to view its contents</p>
            </div>
            <button
              onClick={() => setShowScanner(true)}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-xl text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 min-h-[56px] w-full sm:w-auto"
            >
              Start Scan
            </button>
          </div>
        ) : (
          <>
            {/* Shelf Summary */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Shelf Information</h2>
                <button
                  onClick={() => setShowDeleteShelfDialog(true)}
                  disabled={deleting}
                  className="text-red-600 hover:text-red-800 font-semibold text-sm sm:text-base px-3 py-1.5 rounded-lg hover:bg-red-50 transition min-h-[44px] disabled:opacity-50"
                >
                  🗑️ Delete Shelf
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <label className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Shelf Name</label>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 break-words">{shelf.name}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <label className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Location</label>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 break-words">{shelf.location}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <label className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Barcode</label>
                  <p className="text-sm sm:text-lg font-mono font-semibold text-gray-900 break-all">{shelf.barcode}</p>
                </div>
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <label className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Items in Shelf</label>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{items.length}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <button
                onClick={handleCheckIn}
                className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-4 sm:py-5 px-4 sm:px-6 rounded-xl text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 min-h-[56px]"
              >
                Check-In Item
              </button>
              <button
                onClick={handleCheckOut}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-4 sm:py-5 px-4 sm:px-6 rounded-xl text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-200 min-h-[56px]"
              >
                Check-Out Item
              </button>
            </div>

            {/* Items List */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Items in Shelf</h2>
              {items.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="text-sm sm:text-base text-gray-600 font-medium">No items in this shelf</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Serial Number
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                            Last Updated
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition">
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">
                              {item.serial_number}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                              <span className="sm:hidden block text-gray-500 text-xs mt-1">
                                {new Date(item.updated_at).toLocaleDateString()}
                              </span>
                              <span className="hidden sm:block">
                                {new Date(item.updated_at).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => setShowDeleteItemDialog(item.id)}
                                disabled={deleting}
                                className="text-red-600 hover:text-red-800 font-medium text-xs sm:text-sm px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-50 transition min-h-[36px] disabled:opacity-50"
                                title="Delete item"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 sm:mt-6 text-center">
              <button
                onClick={() => {
                  setShelf(null);
                  setItems([]);
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold px-4 py-2.5 rounded-lg hover:bg-blue-50 transition min-h-[44px]"
              >
                Scan Another Shelf
              </button>
            </div>
          </>
        )}

        {showScanner && (
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
            title="Scan Shelf QR Code"
          />
        )}

        <ConfirmDialog
          isOpen={showDeleteShelfDialog}
          title="Delete Shelf"
          message={`Are you sure you want to delete shelf "${shelf?.name}"? All items in this shelf will be removed from the shelf (but not deleted). This action cannot be undone.`}
          confirmText="Delete Shelf"
          cancelText="Cancel"
          onConfirm={handleDeleteShelf}
          onCancel={() => setShowDeleteShelfDialog(false)}
          variant="danger"
        />

        {showDeleteItemDialog && (
          <ConfirmDialog
            isOpen={!!showDeleteItemDialog}
            title="Delete Item"
            message={`Are you sure you want to delete this item? All movement history for this item will also be deleted. This action cannot be undone.`}
            confirmText="Delete Item"
            cancelText="Cancel"
            onConfirm={() => {
              const item = items.find((i) => i.id === showDeleteItemDialog);
              if (item) {
                handleDeleteItem(item.id, item.serial_number);
              }
            }}
            onCancel={() => setShowDeleteItemDialog(null)}
            variant="danger"
          />
        )}
      </div>
    </div>
  );
};

