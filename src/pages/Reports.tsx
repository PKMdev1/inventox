import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Item, Shelf, MovementWithDetails } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

type ReportType = 'items' | 'movements' | 'shelves';
type FilterType = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'custom';

interface ItemWithShelfName extends Item {
  shelf_name?: string | null;
  shelf_location?: string | null;
}

export const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportType>('items');
  const [items, setItems] = useState<ItemWithShelfName[]>([]);
  const [movements, setMovements] = useState<MovementWithDetails[]>([]);
  const [allMovements, setAllMovements] = useState<MovementWithDetails[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Apply date filter when filter settings change or movements are loaded
  useEffect(() => {
    if (activeTab === 'movements') {
      applyDateFilter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, startDate, endDate, allMovements.length]);

  const loadData = async () => {
    // Prevent concurrent loads
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'items') {
        // Fetch items with shelf information
        const { data, error } = await supabase
          .from('items')
          .select(`
            *,
            shelf:shelves!items_current_shelf_id_fkey(name, location)
          `)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) throw error;
        
        // Transform data to include shelf name and location
        const itemsWithShelf = (data || []).map((item: any) => ({
          ...item,
          shelf_name: item.shelf?.name || null,
          shelf_location: item.shelf?.location || null,
        }));
        
        setItems(itemsWithShelf);
      } else if (activeTab === 'movements') {
        // Fetch movements with related data (item, shelves, user)
        const { data, error } = await supabase
          .from('movements')
          .select(`
            *,
            item:items!movements_item_id_fkey(serial_number),
            from_shelf:shelves!movements_from_shelf_id_fkey(name, location),
            to_shelf:shelves!movements_to_shelf_id_fkey(name, location)
          `)
          .order('timestamp', { ascending: false })
          .limit(500);

        if (error) throw error;
        
        // Get unique user IDs from movements
        const uniqueUserIds = [...new Set((data || []).map((m: any) => m.user_id).filter(Boolean))];
        
        // Fetch user emails and names using database function
        const userEmailMap: Record<string, string> = {};
        const userNameMap: Record<string, string> = {};
        
        // Add current user's email and name to map
        if (user) {
          userEmailMap[user.id] = user.email || 'Unknown';
          userNameMap[user.id] = user.user_metadata?.full_name || user.user_metadata?.name || '';
        }
        
        // Try to fetch other user emails and names using the database function
        if (uniqueUserIds.length > 0) {
          try {
            const { data: userInfo, error: userError } = await supabase.rpc('get_user_emails', {
              user_ids: uniqueUserIds
            });
            
            if (!userError && userInfo) {
              // Map user emails and names
              userInfo.forEach((u: { user_id: string; email: string; name: string | null }) => {
                if (u.email) {
                  userEmailMap[u.user_id] = u.email;
                }
                if (u.name) {
                  userNameMap[u.user_id] = u.name;
                }
              });
            }
          } catch (err) {
            // Function might not exist yet - that's okay, we'll use fallback
            console.warn('Could not fetch user info (function may not be created yet):', err);
          }
        }
        
        // Transform movements with details
        const movementsWithDetails = (data || []).map((movement: any) => {
          // Get user email and name, create display string
          let userDisplay = 'Unknown';
          let userName = '';
          
          if (movement.user_id) {
            if (user && movement.user_id === user.id) {
              const currentUserName = user.user_metadata?.full_name || user.user_metadata?.name || '';
              userName = currentUserName;
              userDisplay = currentUserName ? `${currentUserName} (${user.email})` : (user.email || 'You');
            } else {
              const email = userEmailMap[movement.user_id];
              const name = userNameMap[movement.user_id];
              
              if (name && email) {
                userDisplay = `${name} (${email})`;
                userName = name;
              } else if (email) {
                userDisplay = email;
              } else {
                // Format: Show first 8 chars of UUID as fallback
                userDisplay = `User ${movement.user_id.substring(0, 8)}...`;
              }
            }
          }
          
          return {
            ...movement,
            item: movement.item || null,
            from_shelf: movement.from_shelf || null,
            to_shelf: movement.to_shelf || null,
            user_email: userDisplay,
            user_name: userName,
          };
        });
        
        setAllMovements(movementsWithDetails);
        setMovements(movementsWithDetails);
      } else if (activeTab === 'shelves') {
        const { data, error } = await supabase
          .from('shelves')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setShelves(data || []);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Error loading data';
      console.error('Error loading data:', error);
      toast.error(errorMessage, { id: `load-error-${activeTab}` }); // Prevent duplicate toasts
    } finally {
      setLoading(false);
    }
  };

  const transformDataForExport = useCallback((): Record<string, string>[] => {
    if (activeTab === 'movements') {
      return movements.map((movement: any) => ({
        'Timestamp': new Date(movement.timestamp).toLocaleString(),
        'Type': movement.movement_type,
        'Item Serial': movement.item?.serial_number || movement.item_id,
        'From Shelf': movement.from_shelf ? `${movement.from_shelf.name}${movement.from_shelf.location ? ` (${movement.from_shelf.location})` : ''}` : '—',
        'To Shelf': movement.to_shelf ? `${movement.to_shelf.name}${movement.to_shelf.location ? ` (${movement.to_shelf.location})` : ''}` : '—',
        'Moved By': movement.user_email || movement.user_id?.substring(0, 8) + '...' || 'Unknown',
      }));
    } else if (activeTab === 'items') {
      return items.map((item: any) => ({
        'Serial Number': item.serial_number,
        'Current Shelf': item.shelf_name ? `${item.shelf_name}${item.shelf_location ? ` (${item.shelf_location})` : ''}` : '—',
        'Created At': new Date(item.created_at).toLocaleString(),
        'Updated At': new Date(item.updated_at).toLocaleString(),
      }));
    } else {
      return shelves.map((shelf: any) => ({
        'Name': shelf.name,
        'Location': shelf.location,
        'QR Code': shelf.barcode,
        'Created At': new Date(shelf.created_at).toLocaleString(),
      }));
    }
  }, [activeTab, movements, items, shelves]);

  const exportToCSV = useCallback(() => {
    const dataToExport = transformDataForExport();
    
    if (dataToExport.length === 0) {
      toast.error('No data to export', { id: 'no-data-export' });
      return;
    }

    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(','),
      ...dataToExport.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          })
          .join(',')
      ),
    ].join('\n');

    const filename = activeTab === 'movements' 
      ? `movements_${filterType}_${new Date().toISOString().split('T')[0]}.csv`
      : activeTab === 'items'
      ? `items_${new Date().toISOString().split('T')[0]}.csv`
      : `shelves_${new Date().toISOString().split('T')[0]}.csv`;

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
  }, [transformDataForExport, activeTab, filterType]);

  const exportToExcel = useCallback(() => {
    const dataToExport = transformDataForExport();
    
    if (dataToExport.length === 0) {
      toast.error('No data to export', { id: 'no-data-export' });
      return;
    }

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      
      // Set column widths for better readability
      const colWidths = Object.keys(dataToExport[0]).map(() => ({ wch: 20 }));
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, activeTab === 'movements' ? 'Movements' : activeTab === 'items' ? 'Items' : 'Shelves');
      
      // Generate filename
      const filename = activeTab === 'movements' 
        ? `movements_${filterType}_${new Date().toISOString().split('T')[0]}.xlsx`
        : activeTab === 'items'
        ? `items_${new Date().toISOString().split('T')[0]}.xlsx`
        : `shelves_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Write file
      XLSX.writeFile(wb, filename);
      toast.success('Excel file exported successfully');
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export Excel file', { id: 'excel-export-error' });
    }
  }, [transformDataForExport, activeTab, filterType]);

  const applyDateFilter = () => {
    // Prevent filtering if no movements loaded yet
    if (allMovements.length === 0 && filterType === 'all') {
      setMovements([]);
      return;
    }
    
    if (filterType === 'all') {
      setMovements(allMovements);
      return;
    }

    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (filterType) {
      case 'today': {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      }
      case 'thisWeek': {
        const dayOfWeek = now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
        break;
      }
      case 'thisMonth': {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      }
      case 'custom': {
        if (startDate && endDate) {
          start = new Date(startDate);
          end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
        } else {
          setMovements(allMovements);
          return;
        }
        break;
      }
      default: {
        setMovements(allMovements);
        return;
      }
    }

    const filtered = allMovements.filter((movement) => {
      const movementDate = new Date(movement.timestamp);
      return movementDate >= start && movementDate <= end;
    });

    setMovements(filtered);
  };

  const handleClearMovements = async () => {
    setClearing(true);
    setShowClearDialog(false);

    try {
      // Get count before deletion for verification
      const { count: beforeCount } = await supabase
        .from('movements')
        .select('*', { count: 'exact', head: true });

      if (!beforeCount || beforeCount === 0) {
        toast.success('No movements to clear');
        setClearing(false);
        return;
      }

      // Delete all movements - use a condition that matches all rows
      // Using gte on timestamp to match all (since all timestamps are >= '1970-01-01')
      const { error } = await supabase
        .from('movements')
        .delete()
        .gte('timestamp', '1970-01-01T00:00:00Z');

      if (error) {
        // Check if it's an RLS policy error
        if (error.message.includes('policy') || error.message.includes('permission') || error.code === '42501') {
          toast.error('Permission denied. Please add DELETE policies for movements in Supabase.', { id: 'clear-movements-error' });
        } else {
          throw error;
        }
        return;
      }

      // Verify deletion by checking count
      const { count: afterCount } = await supabase
        .from('movements')
        .select('*', { count: 'exact', head: true });

      if (afterCount === 0) {
        toast.success(`Successfully cleared ${beforeCount || 0} movement(s)`);
        // Clear local state
        setAllMovements([]);
        setMovements([]);
        // Reload to ensure consistency
        await loadData();
      } else {
        // Some movements still exist - deletion was blocked
        const deletedCount = (beforeCount || 0) - (afterCount || 0);
        toast.error(`Only ${deletedCount} of ${beforeCount || 0} movements were deleted. Please check RLS policies.`, { id: 'clear-movements-error' });
        await loadData();
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to clear movements';
      console.error('Error clearing movements:', error);
      toast.error(errorMessage, { id: 'clear-movements-error' });
      // Still reload to show current state
      await loadData();
    } finally {
      setClearing(false);
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

        {/* Filters and Actions - Only show for movements */}
        {activeTab === 'movements' && (
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
              {/* Date Filter */}
              <div className="flex-1 w-full sm:w-auto">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Date</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value as FilterType);
                      if (e.target.value !== 'custom') {
                        setStartDate('');
                        setEndDate('');
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  {filterType === 'custom' && (
                    <>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
                        placeholder="Start Date"
                      />
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900"
                        placeholder="End Date"
                      />
                    </>
                  )}
                </div>
                {movements.length > 0 && (
                  <p className="mt-2 text-xs text-gray-600">
                    Showing {movements.length} of {allMovements.length} movements
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={exportToCSV}
                    disabled={loading || movements.length === 0}
                    className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-2.5 sm:py-3 px-3 sm:px-5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-xs sm:text-sm flex items-center justify-center gap-1.5"
                  >
                    📥 <span>CSV</span>
                  </button>
                  <button
                    onClick={exportToExcel}
                    disabled={loading || movements.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 sm:py-3 px-3 sm:px-5 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-xs sm:text-sm flex items-center justify-center gap-1.5"
                  >
                    📊 <span>Excel</span>
                  </button>
                </div>
                <button
                  onClick={() => setShowClearDialog(true)}
                  disabled={loading || clearing || allMovements.length === 0}
                  className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-xs sm:text-sm"
                >
                  🗑️ <span className="hidden sm:inline">Clear All</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Buttons - For other tabs */}
        {activeTab !== 'movements' && (
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
            <button
              onClick={exportToCSV}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm sm:text-base flex items-center justify-center gap-2"
            >
              📥 <span>Export CSV</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 sm:px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-sm sm:text-base flex items-center justify-center gap-2"
            >
              📊 <span>Export Excel</span>
            </button>
          </div>
        )}

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
                          Current Shelf
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
                            {item.shelf_name ? (
                              <span>
                                {item.shelf_name}
                                {item.shelf_location && (
                                  <span className="text-gray-500 text-xs"> ({item.shelf_location})</span>
                                )}
                              </span>
                            ) : (
                              '—'
                            )}
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
                  <>
                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-3">
                      {movements.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                          <div className="text-4xl mb-4">📋</div>
                          <p className="text-gray-600 font-medium text-sm sm:text-base">No movements found for this filter.</p>
                        </div>
                      ) : (
                        movements.map((movement) => (
                          <div key={movement.id} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="text-xs text-gray-500 mb-1">Timestamp</div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {new Date(movement.timestamp).toLocaleString()}
                                </div>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-md text-xs font-bold flex-shrink-0 ${
                                  movement.movement_type === 'IN'
                                    ? 'bg-green-100 text-green-800 border border-green-300'
                                    : movement.movement_type === 'OUT'
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                                }`}
                              >
                                {movement.movement_type}
                              </span>
                            </div>
                            
                            <div className="space-y-2 border-t border-gray-300 pt-3">
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">Item Serial</div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {movement.item?.serial_number || movement.item_id}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <div className="text-xs text-gray-500 mb-0.5">From Shelf</div>
                                  <div className="text-xs font-medium text-gray-700">
                                    {movement.from_shelf ? (
                                      <span>
                                        {movement.from_shelf.name}
                                        {movement.from_shelf.location && (
                                          <span className="text-gray-500"> ({movement.from_shelf.location})</span>
                                        )}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-0.5">To Shelf</div>
                                  <div className="text-xs font-medium text-gray-700">
                                    {movement.to_shelf ? (
                                      <span>
                                        {movement.to_shelf.name}
                                        {movement.to_shelf.location && (
                                          <span className="text-gray-500"> ({movement.to_shelf.location})</span>
                                        )}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="border-t border-gray-300 pt-2 mt-2">
                                <div className="text-xs text-gray-500 mb-0.5 font-semibold">Moved By</div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {movement.user_email || 'Unknown'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Desktop Table View */}
                    <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Item Serial
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                            From Shelf
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                            To Shelf
                          </th>
                          <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                            Moved By
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {movements.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <div className="text-4xl mb-4">📋</div>
                              <p className="text-gray-600 font-medium text-sm sm:text-base">No movements found for this filter.</p>
                            </td>
                          </tr>
                        ) : (
                          movements.map((movement) => (
                            <tr key={movement.id} className="hover:bg-gray-50 transition">
                              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                {new Date(movement.timestamp).toLocaleString()}
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
                              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900">
                                {movement.item?.serial_number || movement.item_id}
                              </td>
                              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden md:table-cell">
                                {movement.from_shelf ? (
                                  <span>
                                    {movement.from_shelf.name}
                                    {movement.from_shelf.location && (
                                      <span className="text-gray-500 text-xs"> ({movement.from_shelf.location})</span>
                                    )}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-700 hidden md:table-cell">
                                {movement.to_shelf ? (
                                  <span>
                                    {movement.to_shelf.name}
                                    {movement.to_shelf.location && (
                                      <span className="text-gray-500 text-xs"> ({movement.to_shelf.location})</span>
                                    )}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-gray-900 hidden md:table-cell">
                                {movement.user_email || 'Unknown'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </>
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

      {/* Clear Movements Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showClearDialog}
        title="Clear All Movements"
        message={`Are you sure you want to delete all ${allMovements.length} movement records? This action cannot be undone and will permanently remove all movement history.`}
        confirmText="Clear All Movements"
        cancelText="Cancel"
        onConfirm={handleClearMovements}
        onCancel={() => setShowClearDialog(false)}
        variant="danger"
      />
    </div>
  );
};
