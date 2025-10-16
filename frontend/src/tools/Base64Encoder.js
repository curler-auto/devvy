import React, { useState } from 'react';
import { ArrowRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

/**
 * Base64 Encoder/Decoder Tool
 * Encodes and decodes Base64 strings
 * Client-side only: No backend required
 */
function Base64Encoder({ tab, tabs, setTabs }) {
  const [input, setInput] = useState(tab.data.input || '');
  const [output, setOutput] = useState(tab.data.output || '');
  const [mode, setMode] = useState(tab.data.mode || 'encode');
  const [copied, setCopied] = useState(false);

  const handleEncode = () => {
    try {
      const encoded = btoa(input);
      setOutput(encoded);
      updateTabData(input, encoded, 'encode');
      toast.success('Encoded successfully!');
    } catch (err) {
      toast.error('Failed to encode: ' + err.message);
    }
  };

  const handleDecode = () => {
    try {
      const decoded = atob(input);
      setOutput(decoded);
      updateTabData(input, decoded, 'decode');
      toast.success('Decoded successfully!');
    } catch (err) {
      toast.error('Failed to decode: Invalid Base64 string');
    }
  };

  const updateTabData = (inp, out, m) => {
    const updatedTabs = tabs.map(t =>
      t.tabId === tab.tabId
        ? { ...t, data: { input: inp, output: out, mode: m } }
        : t
    );
    setTabs(updatedTabs);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Base64 Encoder/Decoder</h2>
        <p className="text-sm text-gray-400">Encode or decode Base64 strings</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Input</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text to encode or Base64 to decode..."
            rows={8}
            className="font-mono"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleEncode} className="flex-1">
            <ArrowRight className="w-4 h-4 mr-2" />
            Encode
          </Button>
          <Button onClick={handleDecode} variant="outline" className="flex-1">
            <ArrowRight className="w-4 h-4 mr-2" />
            Decode
          </Button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Output</label>
            <Button
              onClick={copyToClipboard}
              size="sm"
              variant="ghost"
              disabled={!output}
            >
              {copied ? (
                <><Check className="w-4 h-4 mr-2" /> Copied</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Copy</>
              )}
            </Button>
          </div>
          <Textarea
            value={output}
            readOnly
            placeholder="Output will appear here..."
            rows={8}
            className="font-mono bg-gray-900"
          />
        </div>
      </div>
    </div>
  );
}

// Tool metadata
Base64Encoder.metadata = {
  id: 'base64-encoder',
  name: 'Base64 Encoder',
  description: 'Encode and decode Base64',
  category: 'encoding',
  requiresBackend: false, // Client-side only
};

export default Base64Encoder;
