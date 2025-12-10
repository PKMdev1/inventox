import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shelf } from '../types';
import { Link } from 'react-router-dom';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export const BarcodeGenerator = () => {
  const [shelfName, setShelfName] = useState('');
  const [location, setLocation] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeMode, setBarcodeMode] = useState<'auto' | 'manual'>('auto');
  const [showScanner, setShowScanner] = useState(false);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedShelves, setSelectedShelves] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadShelves();
  }, []);

  const loadShelves = async () => {
    try {
      const { data, error } = await supabase
        .from('shelves')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShelves(data || []);
    } catch (error: any) {
      toast.error(error.message || 'Error loading shelves');
    }
  };

  const generateBarcode = (): string => {
    // Generate a unique QR code value (UUID-based, simplified)
    const prefix = 'SHELF-';
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${prefix}${random}`;
  };

  const handleScanBarcode = (scannedBarcode: string) => {
    setBarcode(scannedBarcode.trim());
    setShowScanner(false);
    setBarcodeMode('manual');
  };

  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shelfName.trim() || !location.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    // Determine final barcode
    let finalBarcode: string;
    if (barcodeMode === 'auto') {
      finalBarcode = generateBarcode();
    } else {
      if (!barcode.trim()) {
        toast.error('Please enter or scan a QR code');
        return;
      }
      finalBarcode = barcode.trim().toUpperCase();

      // Check if barcode already exists
      const { data: existingShelf } = await supabase
        .from('shelves')
        .select('id, name')
        .eq('barcode', finalBarcode)
        .single();

      if (existingShelf) {
        toast.error(`QR Code "${finalBarcode}" is already used by shelf "${existingShelf.name}"`);
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shelves')
        .insert({
          name: shelfName.trim(),
          location: location.trim(),
          barcode: finalBarcode,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Shelf created successfully');
      setShelfName('');
      setLocation('');
      setBarcode('');
      setBarcodeMode('auto');
      await loadShelves();
    } catch (error: any) {
      toast.error(error.message || 'Error creating shelf');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedShelves.size === shelves.length) {
      // Deselect all
      setSelectedShelves(new Set());
    } else {
      // Select all
      setSelectedShelves(new Set(shelves.map(s => s.id)));
    }
  };

  const handleToggleShelf = (shelfId: string) => {
    const newSelected = new Set(selectedShelves);
    if (newSelected.has(shelfId)) {
      newSelected.delete(shelfId);
    } else {
      newSelected.add(shelfId);
    }
    setSelectedShelves(newSelected);
  };

  const handlePrint = () => {
    if (selectedShelves.size === 0) {
      toast.error('Please select at least one label to print');
      return;
    }
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 sm:gap-2 min-h-[44px] flex items-center">
              <span className="text-lg sm:text-xl">←</span> <span className="text-sm sm:text-base">Back</span>
            </Link>
            <h1 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900">QR Code Generator</h1>
            <div className="w-16 sm:w-20"></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Create Shelf Form */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Create New Shelf</h2>
          <form onSubmit={handleCreateShelf} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  Shelf Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={shelfName}
                  onChange={(e) => setShelfName(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900 placeholder-gray-500"
                  placeholder="e.g., Shelf A-1"
                />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-base bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900 placeholder-gray-500"
                  placeholder="e.g., Warehouse A, Floor 2"
                />
              </div>
            </div>

            {/* QR Code Options */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                QR Code Option
              </label>
              <div className="space-y-3 bg-gray-50 p-3 sm:p-4 rounded-lg border-2 border-gray-200">
                <label className="flex items-center cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    name="barcode-mode"
                    value="auto"
                    checked={barcodeMode === 'auto'}
                    onChange={() => {
                      setBarcodeMode('auto');
                      setBarcode('');
                    }}
                    className="mr-3 w-5 h-5 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 text-sm sm:text-base block">Auto-generate QR Code</span>
                    <span className="text-xs text-gray-600">System will create a unique QR code automatically</span>
                  </div>
                </label>
                <label className="flex items-center cursor-pointer min-h-[44px]">
                  <input
                    type="radio"
                    name="barcode-mode"
                    value="manual"
                    checked={barcodeMode === 'manual'}
                    onChange={() => setBarcodeMode('manual')}
                    className="mr-3 w-5 h-5 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 text-sm sm:text-base block">Use existing QR Code</span>
                    <span className="text-xs text-gray-600">Scan or enter an existing shelf QR code</span>
                  </div>
                </label>
              </div>
            </div>

            {/* QR Code Input (only show when manual mode) */}
            {barcodeMode === 'manual' && (
              <div>
                <label htmlFor="barcode" className="block text-sm font-semibold text-gray-700 mb-2">
                  Shelf QR Code
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    id="barcode"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value.toUpperCase())}
                    required={barcodeMode === 'manual'}
                    className="flex-1 px-4 py-3 text-base bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-gray-900 placeholder-gray-500 font-mono"
                    placeholder="Scan or enter QR code"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-4 sm:px-6 rounded-lg border-2 border-gray-300 transition min-h-[48px]"
                  >
                    📷 <span className="hidden sm:inline">Scan</span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Enter the QR code from an existing shelf label, or scan it using the camera
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3.5 sm:py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px] text-sm sm:text-base"
              >
                {loading ? 'Creating...' : barcodeMode === 'auto' ? 'Create Shelf & Generate QR Code' : 'Create Shelf with Existing QR Code'}
              </button>
            </div>
          </form>
        </div>

        {/* Print Controls */}
        {shelves.length > 0 && (
          <div className="mb-4 sm:mb-6 bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <label className="flex items-center cursor-pointer min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={selectedShelves.size === shelves.length && shelves.length > 0}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-blue-600 focus:ring-blue-500 rounded border-gray-300 cursor-pointer"
                  />
                  <span className="ml-2 sm:ml-3 text-sm sm:text-base font-semibold text-gray-900">
                    Select All ({selectedShelves.size} of {shelves.length})
                  </span>
                </label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <button
                  onClick={handlePrint}
                  disabled={selectedShelves.size === 0}
                  className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] text-sm sm:text-base flex items-center justify-center gap-2"
                >
                  🖨️ <span>Print Selected ({selectedShelves.size})</span>
                </button>
                {selectedShelves.size > 0 && (
                  <button
                    onClick={() => setSelectedShelves(new Set())}
                    className="bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 min-h-[48px] text-sm sm:text-base"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Shelf Labels Grid */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 labels-container">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">Shelf Labels</h2>
          {shelves.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-5xl sm:text-6xl mb-4">🏷️</div>
              <p className="text-gray-600 font-medium text-base sm:text-lg">No shelves created yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 labels-grid">
              {shelves.map((shelf) => {
                const isSelected = selectedShelves.has(shelf.id);
                return (
                  <div
                    key={shelf.id}
                    className={`label-item border-2 rounded-xl p-4 sm:p-6 bg-white shadow-md hover:shadow-lg transition relative ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' 
                        : 'border-gray-300 print:hidden'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-2 sm:top-3 left-2 sm:left-3 print:hidden">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleShelf(shelf.id)}
                        className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 focus:ring-blue-500 rounded border-gray-300 cursor-pointer bg-white shadow-md"
                      />
                    </div>
                  <div className="text-center mb-3 sm:mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{shelf.name}</h3>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">{shelf.location}</p>
                  </div>
                  <div className="flex justify-center mb-2 sm:mb-3 bg-gray-50 p-2 sm:p-3 rounded-lg">
                    <QRCodeSVG
                      value={shelf.barcode}
                      size={200}
                      level="H"
                      includeMargin={true}
                      className="w-full max-w-[200px] h-auto"
                    />
                  </div>
                  <p className="text-xs text-center text-gray-700 font-mono font-semibold bg-gray-100 py-2 px-2 sm:px-3 rounded break-all">{shelf.barcode}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleScanBarcode}
          onClose={() => setShowScanner(false)}
          title="Scan Existing Shelf QR Code"
        />
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide everything except labels container */
          body > *:not(.labels-container) {
            display: none !important;
          }
          
          /* Show labels container */
          .labels-container {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          /* Hide title and empty state */
          .labels-container > h2,
          .labels-container > div:has(> .text-center) {
            display: none !important;
          }
          
          /* Labels grid */
          .labels-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 1rem;
            padding: 0.5in;
            margin: 0;
          }
          
          /* Hide unselected labels */
          .label-item.print\\:hidden {
            display: none !important;
          }
          
          /* Show only selected labels */
          .label-item:not(.print\\:hidden) {
            display: block !important;
            page-break-inside: avoid;
            break-inside: avoid;
            margin: 0;
            padding: 1rem;
            border: 2px solid #000 !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0.5rem;
          }
          
          /* Hide checkboxes */
          .label-item input[type="checkbox"] {
            display: none !important;
          }
          
          /* Ensure text is visible */
          .label-item h3,
          .label-item p {
            color: #000 !important;
          }
          
          /* Page settings */
          @page {
            size: letter;
            margin: 0.5in;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
        }
      `}</style>
    </div>
  );
};

