import React, { useState } from 'react';
import { Binary, ArrowRight, ArrowLeft, Copy, Upload, Download, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * Base64 Encoder/Decoder Tool
 * Enhanced with file support and advanced options
 */
function Base64Tool({ tab, tabs, setTabs }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState('encode'); // 'encode' or 'decode'
  const [charset, setCharset] = useState('UTF-8');
  const [urlSafe, setUrlSafe] = useState(false);
  const [splitLines, setSplitLines] = useState(false);
  const [encodePerLine, setEncodePerLine] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);

  // Encode to Base64
  const handleEncode = () => {
    try {
      if (!input) {
        toast.error('Please enter text to encode');
        return;
      }

      let result;
      
      if (encodePerLine) {
        // Encode each line separately
        const lines = input.split('\n');
        const encodedLines = lines.map(line => {
          if (!line) return '';
          const encoded = btoa(unescape(encodeURIComponent(line)));
          return urlSafe ? makeUrlSafe(encoded) : encoded;
        });
        result = encodedLines.join('\n');
      } else {
        // Encode entire input
        result = btoa(unescape(encodeURIComponent(input)));
        
        if (urlSafe) {
          result = makeUrlSafe(result);
        }
        
        if (splitLines) {
          result = splitIntoLines(result, 76);
        }
      }

      setOutput(result);
      toast.success('Encoded to Base64!');
    } catch (err) {
      toast.error(`Encoding failed: ${err.message}`);
    }
  };

  // Decode from Base64
  const handleDecode = () => {
    try {
      if (!input) {
        toast.error('Please enter Base64 to decode');
        return;
      }

      let inputToDecode = input;
      
      // Remove whitespace and newlines
      inputToDecode = inputToDecode.replace(/\s/g, '');
      
      // Handle URL-safe Base64
      if (urlSafe || inputToDecode.includes('-') || inputToDecode.includes('_')) {
        inputToDecode = makeUrlUnsafe(inputToDecode);
      }

      const decoded = decodeURIComponent(escape(atob(inputToDecode)));
      setOutput(decoded);
      toast.success('Decoded from Base64!');
    } catch (err) {
      toast.error(`Decoding failed: ${err.message}. Make sure the input is valid Base64.`);
    }
  };

  // Make Base64 URL-safe
  const makeUrlSafe = (str) => {
    return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  // Convert URL-safe Base64 back to standard
  const makeUrlUnsafe = (str) => {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding
    while (str.length % 4) {
      str += '=';
    }
    return str;
  };

  // Split string into lines of specified length
  const splitIntoLines = (str, lineLength) => {
    const lines = [];
    for (let i = 0; i < str.length; i += lineLength) {
      lines.push(str.substring(i, i + lineLength));
    }
    return lines.join('\n');
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // Load text file
  const loadTextFile = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'text/*,*/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setFileName(file.name);
        setFileSize(file.size);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          setInput(event.target.result);
          toast.success(`Loaded ${file.name} (${formatFileSize(file.size)})`);
        };
        reader.readAsText(file, charset);
      };
      input.click();
    } catch (err) {
      toast.error(`Failed to load file: ${err.message}`);
    }
  };

  // Load binary file (for encoding)
  const loadBinaryFile = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setFileName(file.name);
        setFileSize(file.size);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const arrayBuffer = event.target.result;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          setInput(base64);
          setMode('decode'); // Switch to decode mode to show the base64
          toast.success(`Loaded ${file.name} as Base64 (${formatFileSize(file.size)})`);
        };
        reader.readAsArrayBuffer(file);
      };
      input.click();
    } catch (err) {
      toast.error(`Failed to load file: ${err.message}`);
    }
  };

  // Download output as file
  const downloadOutput = () => {
    if (!output) {
      toast.error('No output to download');
      return;
    }

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const extension = mode === 'encode' ? 'base64.txt' : 'decoded.txt';
    link.download = fileName ? `${fileName}.${extension}` : `output.${extension}`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded!');
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Swap input/output
  const swapInputOutput = () => {
    const temp = input;
    setInput(output);
    setOutput(temp);
    setMode(mode === 'encode' ? 'decode' : 'encode');
    toast.success('Swapped input and output!');
  };

  const charsets = ['UTF-8', 'UTF-16', 'ISO-8859-1', 'Windows-1252', 'ASCII'];

  return (
    <div className="base64-tool p-6" data-testid="base64-tool">
      <div className="space-y-6">
        {/* Mode Selection */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Binary className="w-5 h-5 text-[var(--accent-primary)]" />
            Base64 Encoder/Decoder
          </h2>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('encode')}
              className={`flex-1 px-4 py-3 rounded-md border transition-colors ${
                mode === 'encode'
                  ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
              }`}
            >
              <ArrowRight className="w-5 h-5 mx-auto mb-1" />
              <div className="font-semibold">Encode</div>
              <div className="text-xs opacity-80">Text → Base64</div>
            </button>
            <button
              onClick={() => setMode('decode')}
              className={`flex-1 px-4 py-3 rounded-md border transition-colors ${
                mode === 'decode'
                  ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
              }`}
            >
              <ArrowLeft className="w-5 h-5 mx-auto mb-1" />
              <div className="font-semibold">Decode</div>
              <div className="text-xs opacity-80">Base64 → Text</div>
            </button>
          </div>

          {/* Configuration Options */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-primary)]">
            <div className="text-sm font-semibold text-[var(--text-primary)] mb-2">Options</div>
            
            {/* Character Set */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Character Set
              </label>
              <select
                value={charset}
                onChange={(e) => setCharset(e.target.value)}
                className="w-full px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] cursor-pointer text-sm"
              >
                {charsets.map(cs => (
                  <option key={cs} value={cs}>{cs}</option>
                ))}
              </select>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={urlSafe}
                  onChange={(e) => setUrlSafe(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                />
                <span className="text-sm text-[var(--text-primary)]">URL-safe encoding (- and _ instead of + and /)</span>
              </label>

              {mode === 'encode' && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={splitLines}
                      onChange={(e) => {
                        setSplitLines(e.target.checked);
                        if (e.target.checked) setEncodePerLine(false);
                      }}
                      className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Split lines (76 characters, MIME format)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={encodePerLine}
                      onChange={(e) => {
                        setEncodePerLine(e.target.checked);
                        if (e.target.checked) setSplitLines(false);
                      }}
                      className="w-4 h-4 rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                    />
                    <span className="text-sm text-[var(--text-primary)]">Encode each line separately</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {mode === 'encode' ? 'Input Text' : 'Base64 Input'}
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={loadTextFile}
                size="sm"
                variant="outline"
                title="Load text file"
              >
                <File className="w-4 h-4 mr-2" />
                Text File
              </Button>
              {mode === 'encode' && (
                <Button
                  onClick={loadBinaryFile}
                  size="sm"
                  variant="outline"
                  title="Load binary file as Base64"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Binary File
                </Button>
              )}
              <Button
                onClick={() => copyToClipboard(input)}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                title="Copy input"
                disabled={!input}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {fileName && (
            <div className="mb-3 p-2 bg-[var(--bg-tertiary)] rounded text-sm">
              <span className="text-[var(--text-secondary)]">File:</span>{' '}
              <span className="text-[var(--text-primary)] font-mono">{fileName}</span>
              {fileSize > 0 && (
                <span className="text-[var(--text-secondary)] ml-2">({formatFileSize(fileSize)})</span>
              )}
            </div>
          )}
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 to decode...'}
            className="w-full h-48 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono text-sm resize-none"
          />
          
          {input && (
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              Length: {input.length} characters
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={mode === 'encode' ? handleEncode : handleDecode}
            disabled={!input}
            className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white px-8"
          >
            {mode === 'encode' ? (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Encode to Base64
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Decode from Base64
              </>
            )}
          </Button>
          
          <Button
            onClick={swapInputOutput}
            variant="outline"
            disabled={!input && !output}
            title="Swap input and output"
            className="h-10 w-10 p-0 rounded-full"
          >
            <Binary className="w-5 h-5" />
          </Button>
        </div>

        {/* Output Section */}
        {output && (
          <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {mode === 'encode' ? 'Base64 Output' : 'Decoded Text'}
              </h2>
              <div className="flex gap-2">
                <Button
                  onClick={downloadOutput}
                  size="sm"
                  variant="outline"
                  title="Download output"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => copyToClipboard(output)}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Copy output"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <textarea
              value={output}
              readOnly
              className="w-full h-48 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--accent-primary)] font-mono text-sm resize-none"
            />
            
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              Length: {output.length} characters
            </div>
          </div>
        )}

        {/* Info */}
        <div className="border rounded-lg p-4 bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text-primary)] mb-2">About Base64</div>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Base64:</strong> Binary-to-text encoding scheme</li>
            <li><strong>Use Cases:</strong> Email attachments, data URLs, API tokens</li>
            <li><strong>Character Set:</strong> A-Z, a-z, 0-9, +, / (64 characters)</li>
            <li><strong>Padding:</strong> Uses = for padding to make length multiple of 4</li>
            <li><strong>Size:</strong> Encoded data is ~33% larger than original</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
Base64Tool.metadata = {
  id: 'base64-encoder',
  name: 'Base64 Encoder/Decoder',
  description: 'Encode and decode Base64 strings',
  category: 'encoders',
  requiresBackend: false,
};

export default Base64Tool;
