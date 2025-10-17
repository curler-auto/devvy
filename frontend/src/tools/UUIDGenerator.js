import React, { useState } from 'react';
import { Fingerprint, Copy, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * UUID/GUID Generator Tool
 * Generate UUIDs in various formats
 */
function UUIDGenerator({ tab, tabs, setTabs }) {
  const [uuids, setUuids] = useState([]);
  const [count, setCount] = useState(1);
  const [format, setFormat] = useState('standard');
  const [version, setVersion] = useState('v4');

  // Generate UUID v4
  const generateUUIDv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Generate UUID v1 (timestamp-based)
  const generateUUIDv1 = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(16).substring(2, 15);
    return `${timestamp.toString(16).padStart(8, '0')}-${random.substring(0, 4)}-1${random.substring(4, 7)}-${random.substring(7, 11)}-${random.substring(11)}`;
  };

  // Format UUID
  const formatUUID = (uuid, format) => {
    switch (format) {
      case 'standard':
        return uuid;
      case 'uppercase':
        return uuid.toUpperCase();
      case 'nohyphens':
        return uuid.replace(/-/g, '');
      case 'braces':
        return `{${uuid}}`;
      case 'csharp':
        return `Guid.Parse("${uuid}")`;
      case 'java':
        return `UUID.fromString("${uuid}")`;
      case 'python':
        return `uuid.UUID('${uuid}')`;
      default:
        return uuid;
    }
  };

  // Generate UUIDs
  const handleGenerate = () => {
    const newUuids = [];
    for (let i = 0; i < count; i++) {
      const uuid = version === 'v4' ? generateUUIDv4() : generateUUIDv1();
      newUuids.push(formatUUID(uuid, format));
    }
    setUuids(newUuids);
    toast.success(`Generated ${count} UUID${count > 1 ? 's' : ''}!`);
  };

  // Copy single UUID
  const copyUUID = (uuid) => {
    navigator.clipboard.writeText(uuid);
    toast.success('UUID copied to clipboard!');
  };

  // Copy all UUIDs
  const copyAll = () => {
    const text = uuids.join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${uuids.length} UUIDs!`);
  };

  // Download as file
  const downloadUUIDs = () => {
    const text = uuids.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `uuids-${Date.now()}.txt`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('UUIDs downloaded!');
  };

  const formats = [
    { value: 'standard', label: 'Standard', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    { value: 'uppercase', label: 'Uppercase', example: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890' },
    { value: 'nohyphens', label: 'No Hyphens', example: 'a1b2c3d4e5f67890abcdef1234567890' },
    { value: 'braces', label: 'Braces', example: '{a1b2c3d4-e5f6-7890-abcd-ef1234567890}' },
    { value: 'csharp', label: 'C# Guid', example: 'Guid.Parse("...")' },
    { value: 'java', label: 'Java UUID', example: 'UUID.fromString("...")' },
    { value: 'python', label: 'Python UUID', example: "uuid.UUID('...')" },
  ];

  return (
    <div className="uuid-generator p-6" data-testid="uuid-generator">
      <div className="space-y-6">
        {/* Generator Settings */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-[var(--accent-primary)]" />
            UUID/GUID Generator
          </h2>
          
          <div className="space-y-4">
            {/* Version Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                UUID Version
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setVersion('v4')}
                  className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                    version === 'v4'
                      ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
                  }`}
                >
                  <div className="font-semibold">Version 4</div>
                  <div className="text-xs opacity-80">Random (recommended)</div>
                </button>
                <button
                  onClick={() => setVersion('v1')}
                  className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                    version === 'v1'
                      ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                      : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
                  }`}
                >
                  <div className="font-semibold">Version 1</div>
                  <div className="text-xs opacity-80">Timestamp-based</div>
                </button>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Output Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] cursor-pointer"
              >
                {formats.map(f => (
                  <option key={f.value} value={f.value}>
                    {f.label} - {f.example}
                  </option>
                ))}
              </select>
            </div>

            {/* Count */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Number of UUIDs
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)))}
                  className="flex-1 px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                />
                <Button
                  onClick={handleGenerate}
                  className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white px-6"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Generated UUIDs */}
        {uuids.length > 0 && (
          <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Generated UUIDs ({uuids.length})
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={copyAll}
                  size="sm"
                  variant="outline"
                  title="Copy all"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
                <Button
                  onClick={downloadUUIDs}
                  size="sm"
                  variant="outline"
                  title="Download as file"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {uuids.map((uuid, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded hover:bg-[var(--bg-hover)] transition-colors group"
                >
                  <div className="font-mono text-sm text-[var(--accent-primary)] break-all flex-1">
                    {uuid}
                  </div>
                  <Button
                    onClick={() => copyUUID(uuid)}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2"
                    title="Copy UUID"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="border rounded-lg p-4 bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text-primary)] mb-2">About UUIDs</div>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>UUID v4:</strong> Random, most commonly used, 122 bits of randomness</li>
            <li><strong>UUID v1:</strong> Timestamp-based, includes MAC address and time</li>
            <li><strong>Format:</strong> 8-4-4-4-12 hexadecimal digits (36 characters with hyphens)</li>
            <li><strong>Uniqueness:</strong> Practically guaranteed to be unique across space and time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
UUIDGenerator.metadata = {
  id: 'uuid-generator',
  name: 'UUID Generator',
  description: 'Generate UUIDs/GUIDs in various formats',
  category: 'generators',
  requiresBackend: false,
};

export default UUIDGenerator;
