import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Item, MovementWithDetails, Shelf } from '../types';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const SearchItem = () => {
  const [serialNumber, setSerialNumber] = useState('');
  const [item, setItem] = useState<Item | null>(null);
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [movements, setMovements] = useState<MovementWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) {
      toast.error('Please enter a serial number');
      return;
    }

    setLoading(true);
    try {
      // Find item
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('*')
        .eq('serial_number', serialNumber.trim())
        .single();

      if (itemError || !itemData) {
        toast.error('Item not found');
        setItem(null);
        setShelf(null);
        setMovements([]);
        return;
      }

      setItem(itemData);

      // Fetch current shelf if any
      if (itemData.current_shelf_id) {
        const { data: shelfData } = await supabase
          .from('shelves')
          .select('*')
          .eq('id', itemData.current_shelf_id)
          .single();
        setShelf(shelfData || null);
      } else {
        setShelf(null);
      }

      // Fetch movement history
      const { data: movementsData, error: movementsError } = await supabase
        .from('movements')
        .select(`
          *,
          from_shelf:shelves!movements_from_shelf_id_fkey(*),
          to_shelf:shelves!movements_to_shelf_id_fkey(*)
        `)
        .eq('item_id', itemData.id)
        .order('timestamp', { ascending: false });

      if (movementsError) {
        console.error('Error fetching movements:', movementsError);
        setMovements([]);
      } else {
        setMovements(movementsData || []);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error searching item');
    } finally {
      setLoading(false);
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
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Search Item</h1>
            <div className="w-16 sm:w-20"></div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Search by Serial Number</h2>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="Enter serial number"
              className="flex-1 px-4 py-3 text-base bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-base sm:text-lg"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Item Status */}
        {item && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Current Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <label className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Serial Number</label>
                <p className="text-lg sm:text-xl font-bold text-gray-900 break-words">{item.serial_number}</p>
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <label className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Current Shelf</label>
                {shelf ? (
                  <Link
                    to={`/shelf-detail?barcode=${shelf.barcode}`}
                    className="text-lg sm:text-xl font-bold text-blue-600 hover:text-blue-800 transition break-words"
                  >
                    {shelf.name} ({shelf.location})
                  </Link>
                ) : (
                  <p className="text-lg sm:text-xl font-bold text-gray-600">Not in any shelf</p>
                )}
              </div>
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg sm:col-span-2">
                <label className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Last Updated</label>
                <p className="text-base sm:text-lg font-semibold text-gray-900">{new Date(item.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Movement History */}
        {item && movements.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Movement History</h2>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                        From Shelf
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                        To Shelf
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-gray-50 transition">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                          <span className="sm:hidden">{new Date(movement.timestamp).toLocaleDateString()}</span>
                          <span className="hidden sm:inline">{new Date(movement.timestamp).toLocaleString()}</span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-bold ${
                              movement.movement_type === 'IN'
                                ? 'bg-green-100 text-green-800 border border-green-300'
                                : movement.movement_type === 'OUT'
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {movement.movement_type}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden sm:table-cell">
                          {movement.from_shelf ? `${movement.from_shelf.name} (${movement.from_shelf.location})` : '—'}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden sm:table-cell">
                          {movement.to_shelf ? `${movement.to_shelf.name} (${movement.to_shelf.location})` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

