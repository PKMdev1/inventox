import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  title?: string;
}

/**
 * Barcode Scanner Component
 * Uses html5-qrcode library for camera-based scanning
 */
export const BarcodeScanner = ({ onScan, onClose, title = 'Scan Barcode' }: BarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const startScanning = async () => {
      try {
        const scanner = new Html5Qrcode('barcode-scanner');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' }, // Use back camera on mobile
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Successfully scanned
            onScan(decodedText);
            stopScanning();
          },
          (_errorMessage) => {
            // Ignore scanning errors (they're frequent during scanning)
          }
        );

        setScanning(true);
      } catch (err: any) {
        setError(err.message || 'Failed to start camera');
        console.error('Scanner error:', err);
      }
    };

    startScanning();

    return () => {
      stopScanning();
    };
  }, []);

  const stopScanning = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      setScanning(false);
    }
  };

  const handleClose = async () => {
    await stopScanning();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-md border-2 border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl sm:text-3xl font-bold leading-none w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition min-h-[44px] min-w-[44px]"
            aria-label="Close scanner"
          >
            ×
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 font-medium p-3 sm:p-4 rounded-lg mb-3 sm:mb-4 text-sm sm:text-base">
            {error}
          </div>
        ) : (
          <div id="barcode-scanner" className="w-full rounded-lg overflow-hidden mb-3 sm:mb-4 border-2 border-gray-300" />
        )}

        <button
          onClick={handleClose}
          className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 sm:py-3.5 px-4 rounded-lg transition min-h-[48px] text-base sm:text-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

