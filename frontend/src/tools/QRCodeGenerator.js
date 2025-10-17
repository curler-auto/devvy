import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import QRCodeStyling from 'qr-code-styling';

/**
 * QR Code & Barcode Generator Tool
 * Generate QR codes with customization options
 */
function QRCodeGenerator({ tab, tabs, setTabs }) {
  const [text, setText] = useState('');
  const [size, setSize] = useState(300);
  const [errorCorrection, setErrorCorrection] = useState('M');
  const [foregroundColor, setForegroundColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const qrCodeRef = useRef(null);
  const qrCode = useRef(null);

  // Initialize QR Code
  useEffect(() => {
    if (!qrCode.current) {
      qrCode.current = new QRCodeStyling({
        width: size,
        height: size,
        data: text || 'https://example.com',
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: errorCorrection,
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.4,
          margin: 0,
        },
        dotsOptions: {
          color: foregroundColor,
          type: 'rounded',
        },
        backgroundOptions: {
          color: backgroundColor,
        },
        cornersSquareOptions: {
          color: foregroundColor,
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          color: foregroundColor,
          type: 'dot',
        },
      });
    }
  }, []);

  // Update QR Code when settings change
  useEffect(() => {
    if (qrCode.current && text) {
      qrCode.current.update({
        data: text,
        width: size,
        height: size,
        qrOptions: {
          errorCorrectionLevel: errorCorrection,
        },
        dotsOptions: {
          color: foregroundColor,
        },
        backgroundOptions: {
          color: backgroundColor,
        },
        cornersSquareOptions: {
          color: foregroundColor,
        },
        cornersDotOptions: {
          color: foregroundColor,
        },
      });

      if (qrCodeRef.current) {
        qrCodeRef.current.innerHTML = '';
        qrCode.current.append(qrCodeRef.current);
      }
    }
  }, [text, size, errorCorrection, foregroundColor, backgroundColor]);

  // Download QR Code
  const downloadQRCode = (format) => {
    if (!qrCode.current || !text) {
      toast.error('Please enter text to generate QR code');
      return;
    }

    qrCode.current.download({
      name: `qrcode-${Date.now()}`,
      extension: format,
    });
    toast.success(`QR Code downloaded as ${format.toUpperCase()}!`);
  };

  // Copy QR Code as data URL
  const copyQRCode = async () => {
    if (!qrCode.current || !text) {
      toast.error('Please enter text to generate QR code');
      return;
    }

    try {
      const blob = await qrCode.current.getRawData('png');
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      toast.success('QR Code copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy QR Code');
    }
  };

  return (
    <div className="qr-code-generator p-6" data-testid="qr-code-generator">
      <div className="space-y-6">
        {/* Input Section */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[var(--accent-primary)]" />
            QR Code Generator
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Text or URL
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text, URL, or data to encode..."
                className="w-full h-24 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] text-sm resize-none"
              />
              {text && (
                <div className="mt-1 text-xs text-[var(--text-secondary)]">
                  {text.length} characters
                </div>
              )}
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Size (px)
                </label>
                <input
                  type="number"
                  min="100"
                  max="1000"
                  step="50"
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value) || 300)}
                  className="w-full px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Error Correction
                </label>
                <select
                  value={errorCorrection}
                  onChange={(e) => setErrorCorrection(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] cursor-pointer"
                >
                  <option value="L">Low (7%)</option>
                  <option value="M">Medium (15%)</option>
                  <option value="Q">Quartile (25%)</option>
                  <option value="H">High (30%)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Foreground Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded border border-[var(--border-primary)]"
                  />
                  <input
                    type="text"
                    value={foregroundColor}
                    onChange={(e) => setForegroundColor(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Background Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded border border-[var(--border-primary)]"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Preview */}
        {text && (
          <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Preview</h2>
              <div className="flex gap-2">
                <Button
                  onClick={copyQRCode}
                  size="sm"
                  variant="outline"
                  title="Copy QR Code"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={() => downloadQRCode('png')}
                  size="sm"
                  variant="outline"
                  title="Download as PNG"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PNG
                </Button>
                <Button
                  onClick={() => downloadQRCode('svg')}
                  size="sm"
                  variant="outline"
                  title="Download as SVG"
                >
                  <Download className="w-4 h-4 mr-2" />
                  SVG
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center p-8 bg-[var(--bg-tertiary)] rounded">
              <div ref={qrCodeRef} />
            </div>
          </div>
        )}

        {/* Info */}
        <div className="border rounded-lg p-4 bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text-primary)] mb-2">About QR Codes</div>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>QR Code:</strong> Quick Response code for storing data</li>
            <li><strong>Capacity:</strong> Up to 4,296 alphanumeric characters</li>
            <li><strong>Error Correction:</strong> Can recover data even if partially damaged</li>
            <li><strong>Use Cases:</strong> URLs, contact info, WiFi credentials, payments</li>
            <li><strong>Formats:</strong> Download as PNG (raster) or SVG (vector)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
QRCodeGenerator.metadata = {
  id: 'qr-code-generator',
  name: 'QR Code Generator',
  description: 'Generate customizable QR codes',
  category: 'generators',
  requiresBackend: false,
};

export default QRCodeGenerator;
