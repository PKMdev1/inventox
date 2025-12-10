import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shelf } from '../types';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { useAuth } from '../hooks/useAuth';
import { isOnline, enqueueAction } from '../services/offlineQueue';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

type CheckOutType = 'REMOVE' | 'MOVE';

export const CheckOut = () => {
  const [searchParams] = useSearchParams();
  const shelfBarcode = searchParams.get('shelf_barcode') || '';
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [checkOutType, setCheckOutType] = useState<CheckOutType>('REMOVE');
  const [showSerialScanner, setShowSerialScanner] = useState(false);
  const [showShelfScanner, setShowShelfScanner] = useState(false);
  const [destinationShelfBarcode, setDestinationShelfBarcode] = useState('');
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

    if (checkOutType === 'MOVE' && !destinationShelfBarcode.trim()) {
      toast.error('Please scan destination shelf');
      return;
    }

    setLoading(true);

    try {
      if (isOnline()) {
        await processCheckOut(
          serialNumber.trim(),
          shelf.barcode,
          checkOutType === 'MOVE' ? destinationShelfBarcode.trim() : undefined
        );
        toast.success('Item checked out successfully');
        navigate(`/scan-shelf?barcode=${shelf.barcode}`);
      } else {
        enqueueAction({
          type: 'CHECK_OUT',
          payload: {
            serial_number: serialNumber.trim(),
            shelf_barcode: shelf.barcode,
            destination_shelf_barcode: checkOutType === 'MOVE' ? destinationShelfBarcode.trim() : undefined,
          },
        });
        toast.success('Action queued for sync');
        navigate(`/scan-shelf?barcode=${shelf.barcode}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to check out item');
    } finally {
      setLoading(false);
    }
  };

  const processCheckOut = async (serial: string, fromShelfBarcode: string, toShelfBarcode?: string) => {
    if (!user) throw new Error('Not authenticated');

    // Find item
    const { data: item } = await supabase
      .from('items')
      .select('id, current_shelf_id')
      .eq('serial_number', serial)
      .single();

    if (!item) {
      throw new Error('Item not found');
    }

    const fromShelf = await supabase
      .from('shelves')
      .select('id')
      .eq('barcode', fromShelfBarcode)
      .single();

    if (!fromShelf.data) {
      throw new Error('Source shelf not found');
    }

    let toShelfId: string | null = null;
    if (toShelfBarcode) {
      const { data: toShelf } = await supabase
        .from('shelves')
        .select('id')
        .eq('barcode', toShelfBarcode)
        .single();

      if (!toShelf) {
        throw new Error('Destination shelf not found');
      }
      toShelfId = toShelf.id;
    }

    // Update item's current shelf
    await supabase
      .from('items')
      .update({ current_shelf_id: toShelfId })
      .eq('id', item.id);

    // Create movement record
    await supabase.from('movements').insert({
      item_id: item.id,
      from_shelf_id: fromShelf.data.id,
      to_shelf_id: toShelfId,
      movement_type: toShelfId ? 'MOVE' : 'OUT',
      user_id: user.id,
      timestamp: new Date().toISOString(),
    });
  };

  const handleSerialScan = (barcode: string) => {
    setSerialNumber(barcode);
    setShowSerialScanner(false);
  };

  const handleShelfScan = (barcode: string) => {
    setDestinationShelfBarcode(barcode);
    setShowShelfScanner(false);
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
              Check-Out {shelf && <span className="hidden sm:inline">– {shelf.name}</span>}
            </h1>
            <div className="w-16 sm:w-20"></div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 border border-gray-200">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Remove or Move Item</h2>
            <p className="text-sm sm:text-base text-gray-700">Enter the item's serial number and choose an action</p>
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
                  className="flex-1 px-4 py-3 text-base bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition text-gray-900 placeholder-gray-500"
                  placeholder="Enter or scan serial number"
                />
                <button
                  type="button"
                  onClick={() => setShowSerialScanner(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 sm:px-6 rounded-lg border-2 border-gray-300 transition min-h-[48px]"
                >
                  📷 <span className="hidden sm:inline">Scan</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Action
              </label>
              <div className="space-y-3 bg-gray-50 p-3 sm:p-4 rounded-lg border-2 border-gray-200">
                <label className="flex items-center cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    name="checkout-type"
                    value="REMOVE"
                    checked={checkOutType === 'REMOVE'}
                    onChange={() => setCheckOutType('REMOVE')}
                    className="mr-3 w-5 h-5 text-red-600 focus:ring-red-500 flex-shrink-0"
                  />
                  <span className="font-medium text-gray-900 text-sm sm:text-base">Remove from shelf</span>
                </label>
                <label className="flex items-center cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    name="checkout-type"
                    value="MOVE"
                    checked={checkOutType === 'MOVE'}
                    onChange={() => setCheckOutType('MOVE')}
                    className="mr-3 w-5 h-5 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <span className="font-medium text-gray-900 text-sm sm:text-base">Move to another shelf</span>
                </label>
              </div>
            </div>

            {checkOutType === 'MOVE' && (
              <div>
                <label htmlFor="destination" className="block text-sm font-semibold text-gray-700 mb-2">
                  Destination Shelf
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    id="destination"
                    type="text"
                    value={destinationShelfBarcode}
                    onChange={(e) => setDestinationShelfBarcode(e.target.value)}
                    required
                    className="flex-1 px-4 py-3 text-base bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900 placeholder-gray-500"
                    placeholder="Scan destination shelf barcode"
                  />
                  <button
                    type="button"
                    onClick={() => setShowShelfScanner(true)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 sm:px-6 rounded-lg border-2 border-gray-300 transition min-h-[48px]"
                  >
                    📷 <span className="hidden sm:inline">Scan</span>
                  </button>
                </div>
              </div>
            )}

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
                className="flex-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3.5 sm:py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 min-h-[56px] text-base sm:text-lg"
              >
                {loading ? 'Processing...' : 'Confirm Check-Out'}
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

      {showSerialScanner && (
        <BarcodeScanner
          onScan={handleSerialScan}
          onClose={() => setShowSerialScanner(false)}
          title="Scan Item Serial Number"
        />
      )}

      {showShelfScanner && (
        <BarcodeScanner
          onScan={handleShelfScan}
          onClose={() => setShowShelfScanner(false)}
          title="Scan Destination Shelf"
        />
      )}
    </div>
  );
};

