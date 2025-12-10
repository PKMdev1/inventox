import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shelf } from '../types';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useAuth } from '../hooks/useAuth';
import { isOnline, enqueueAction } from '../services/offlineQueue';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const CheckIn = () => {
  const [searchParams] = useSearchParams();
  const shelfBarcode = searchParams.get('shelf_barcode') || '';
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (shelfBarcode) {
      fetchShelf();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelfBarcode]);

  const fetchShelf = async () => {
    const { data, error } = await supabase
      .from('shelves')
      .select('*')
      .eq('barcode', shelfBarcode)
      .single();

    if (error || !data) {
      toast.error('Shelf not found');
      navigate('/scan-shelf');
      return;
    }

    setShelf(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      toast.error('Please enter a serial number');
      return;
    }

    if (!shelf) {
      toast.error('Shelf not found');
      return;
    }

    setLoading(true);

    try {
      if (isOnline()) {
        // Online: process immediately
        await processCheckIn(serialNumber.trim(), shelf.barcode);
        toast.success('Item checked in successfully');
        navigate(`/scan-shelf?barcode=${shelf.barcode}`);
      } else {
        // Offline: queue action
        enqueueAction({
          type: 'CHECK_IN',
          payload: {
            serial_number: serialNumber.trim(),
            shelf_barcode: shelf.barcode,
          },
        });
        toast.success('Action queued for sync');
        navigate(`/scan-shelf?barcode=${shelf.barcode}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to check in item');
    } finally {
      setLoading(false);
    }
  };

  const processCheckIn = async (serial: string, shelfBarcode: string) => {
    if (!user) throw new Error('Not authenticated');

    // Find or create item
    let itemId: string;
    const { data: existingItem } = await supabase
      .from('items')
      .select('id, current_shelf_id')
      .eq('serial_number', serial)
      .single();

    if (existingItem) {
      itemId = existingItem.id;
    } else {
      // Create new item
      const { data: newItem, error: createError } = await supabase
        .from('items')
        .insert({
          serial_number: serial,
          current_shelf_id: null,
        })
        .select('id')
        .single();

      if (createError || !newItem) {
        throw new Error('Failed to create item');
      }
      itemId = newItem.id;
    }

    // Find shelf
    const { data: shelfData } = await supabase
      .from('shelves')
      .select('id')
      .eq('barcode', shelfBarcode)
      .single();

    if (!shelfData) {
      throw new Error('Shelf not found');
    }

    // Get current shelf for movement history
    const { data: currentItem } = await supabase
      .from('items')
      .select('current_shelf_id')
      .eq('id', itemId)
      .single();

    // Update item's current shelf
    await supabase
      .from('items')
      .update({ current_shelf_id: shelfData.id })
      .eq('id', itemId);

    // Create movement record
    await supabase.from('movements').insert({
      item_id: itemId,
      from_shelf_id: currentItem?.current_shelf_id || null,
      to_shelf_id: shelfData.id,
      movement_type: 'IN',
      user_id: user.id,
      timestamp: new Date().toISOString(),
    });
  };

  const handleScan = (barcode: string) => {
    setSerialNumber(barcode);
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <Link to="/scan-shelf" className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 sm:gap-2 min-h-[44px] flex items-center">
              <span className="text-lg sm:text-xl">←</span> <span className="text-sm sm:text-base">Back</span>
            </Link>
            <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900 text-center flex-1 px-2">
              Check-In {shelf && <span className="hidden sm:inline">– {shelf.name}</span>}
            </h1>
            <div className="w-16 sm:w-20"></div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Add Item to Shelf</h2>
            <p className="text-sm sm:text-base text-gray-700">Enter or scan the item's serial number to check it in</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="serial" className="block text-sm font-semibold text-gray-700 mb-2">
                Serial Number
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                  id="serial"
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  required
                  className="flex-1 px-4 py-3 text-base bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-gray-900 placeholder-gray-500"
                  placeholder="Enter or scan serial number"
                />
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 sm:px-6 rounded-lg border-2 border-gray-300 transition min-h-[48px]"
                >
                  📷 <span className="hidden sm:inline">Scan</span>
                </button>
              </div>
            </div>

            {!isOnline() && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 sm:p-4">
                <p className="text-xs sm:text-sm font-medium text-yellow-900">
                  ⚠️ <strong>Offline Mode:</strong> This action will be queued for sync when you're back online.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3.5 sm:py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600 min-h-[56px] text-base sm:text-lg"
              >
                {loading ? 'Saving...' : 'Check In Item'}
              </button>
              <Link
                to="/scan-shelf"
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3.5 sm:py-3 px-6 rounded-lg text-center border-2 border-gray-300 transition min-h-[56px] flex items-center justify-center text-base sm:text-lg"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Scan Item Serial Number"
        />
      )}
    </div>
  );
};

