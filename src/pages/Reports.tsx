import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Item, Movement, Shelf } from '../types';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

type ReportType = 'items' | 'movements' | 'shelves';

export const Reports = () => {
  const [activeTab, setActiveTab] = useState<ReportType>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'items') {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);

        if (error) throw error;
        setItems(data || []);
      } else if (activeTab === 'movements') {
        const { data, error } = await supabase
          .from('movements')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(1000);

        if (error) throw error;
        setMovements(data || []);
      } else if (activeTab === 'shelves') {
        const { data, error } = await supabase
          .from('shelves')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setShelves(data || []);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',')
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };

  const handleExport = () => {
    if (activeTab === 'items') {
      exportToCSV(items, `items_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (activeTab === 'movements') {
      exportToCSV(movements, `movements_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (activeTab === 'shelves') {
      exportToCSV(shelves, `shelves_${new Date().toISOString().split('T')[0]}.csv`);
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
            <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900">Reports & Export</h1>
            <div className="w-16 sm:w-20"></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-4 sm:mb-6 border border-gray-200 overflow-x-auto">
          <div className="border-b-2 border-gray-200 min-w-max sm:min-w-0">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('items')}
                className={`py-3 sm:py-4 px-4 sm:px-6 border-b-2 font-semibold text-xs sm:text-sm transition whitespace-nowrap min-h-[44px] ${
                  activeTab === 'items'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setActiveTab('movements')}
                className={`py-3 sm:py-4 px-4 sm:px-6 border-b-2 font-semibold text-xs sm:text-sm transition whitespace-nowrap min-h-[44px] ${
                  activeTab === 'movements'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                All Movements
              </button>
              <button
                onClick={() => setActiveTab('shelves')}
                className={`py-3 sm:py-4 px-4 sm:px-6 border-b-2 font-semibold text-xs sm:text-sm transition whitespace-nowrap min-h-[44px] ${
                  activeTab === 'shelves'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Shelves
              </button>
            </nav>
          </div>
        </div>

        {/* Export Button */}
        <div className="mb-4 sm:mb-6 flex justify-end">
          <button
            onClick={handleExport}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-sm sm:text-base"
          >
            📥 <span className="hidden sm:inline">Export </span>CSV
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          {loading ? (
            <div className="p-8 sm:p-12 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600 font-medium text-sm sm:text-base">Loading...</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                {activeTab === 'items' && (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Serial Number
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                          Current Shelf ID
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          Created At
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          Updated At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">
                            {item.serial_number}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden sm:table-cell">
                            {item.current_shelf_id || '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden md:table-cell">
                            {new Date(item.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden md:table-cell">
                            {new Date(item.updated_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'movements' && (
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
                          Item ID
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          From Shelf
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
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
                            {movement.item_id}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden md:table-cell">
                            {movement.from_shelf_id || '—'}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden md:table-cell">
                            {movement.to_shelf_id || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'shelves' && (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                          Location
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          Barcode
                        </th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                          Created At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shelves.map((shelf) => (
                        <tr key={shelf.id} className="hover:bg-gray-50 transition">
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">
                            {shelf.name}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden sm:table-cell">
                            {shelf.location}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-mono font-semibold text-gray-700 hidden md:table-cell break-all">
                            {shelf.barcode}
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden lg:table-cell">
                            {new Date(shelf.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

