import React, { useState, useEffect } from 'react';
import { Hash, Copy, Upload, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CryptoJS from 'crypto-js';

/**
 * Hash Generator & Checker Tool
 * Generate and verify hashes (MD5, SHA-1, SHA-256, SHA-512)
 */
function HashGenerator({ tab, tabs, setTabs }) {
  const [inputText, setInputText] = useState('');
  const [hashes, setHashes] = useState({});
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('SHA256');

  // Generate all hashes
  useEffect(() => {
    if (!inputText) {
      setHashes({});
      return;
    }

    try {
      setHashes({
        md5: CryptoJS.MD5(inputText).toString(),
        sha1: CryptoJS.SHA1(inputText).toString(),
        sha256: CryptoJS.SHA256(inputText).toString(),
        sha512: CryptoJS.SHA512(inputText).toString(),
        sha3: CryptoJS.SHA3(inputText).toString(),
        ripemd160: CryptoJS.RIPEMD160(inputText).toString(),
      });
    } catch (err) {
      toast.error(`Hash generation failed: ${err.message}`);
    }
  }, [inputText]);

  // Verify hash
  const handleVerify = () => {
    if (!verifyHash || !inputText) {
      toast.error('Please enter both text and hash to verify');
      return;
    }

    const cleanHash = verifyHash.toLowerCase().trim();
    const matches = {
      md5: hashes.md5 === cleanHash,
      sha1: hashes.sha1 === cleanHash,
      sha256: hashes.sha256 === cleanHash,
      sha512: hashes.sha512 === cleanHash,
      sha3: hashes.sha3 === cleanHash,
      ripemd160: hashes.ripemd160 === cleanHash,
    };

    const matchedAlgorithm = Object.keys(matches).find(key => matches[key]);
    
    if (matchedAlgorithm) {
      setVerifyResult({
        match: true,
        algorithm: matchedAlgorithm.toUpperCase(),
      });
      toast.success(`Hash verified! Algorithm: ${matchedAlgorithm.toUpperCase()}`);
    } else {
      setVerifyResult({
        match: false,
        algorithm: null,
      });
      toast.error('Hash does not match any algorithm');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Load from file
  const loadFromFile = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
          setInputText(event.target.result);
          toast.success(`Loaded ${file.name}`);
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (err) {
      toast.error(`Failed to load file: ${err.message}`);
    }
  };

  const hashAlgorithms = [
    { key: 'md5', label: 'MD5', description: '128-bit hash (not secure)' },
    { key: 'sha1', label: 'SHA-1', description: '160-bit hash (deprecated)' },
    { key: 'sha256', label: 'SHA-256', description: '256-bit hash (recommended)' },
    { key: 'sha512', label: 'SHA-512', description: '512-bit hash (very secure)' },
    { key: 'sha3', label: 'SHA-3', description: '256-bit hash (latest standard)' },
    { key: 'ripemd160', label: 'RIPEMD-160', description: '160-bit hash' },
  ];

  return (
    <div className="hash-generator p-6" data-testid="hash-generator">
      <div className="space-y-6">
        {/* Input Section */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Hash className="w-5 h-5 text-[var(--accent-primary)]" />
              Input Text
            </h2>
            <Button
              onClick={loadFromFile}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              title="Load from file"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </div>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to hash..."
            className="w-full h-32 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono text-sm resize-none"
          />
          
          {inputText && (
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              Length: {inputText.length} characters
            </div>
          )}
        </div>

        {/* Hash Results */}
        {Object.keys(hashes).length > 0 && (
          <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Generated Hashes
            </h2>
            
            <div className="space-y-3">
              {hashAlgorithms.map(({ key, label, description }) => (
                <div key={key} className="border rounded-lg p-4 bg-[var(--bg-tertiary)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[var(--text-primary)]">{label}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{description}</span>
                      </div>
                      <div className="font-mono text-sm text-[var(--accent-primary)] break-all">
                        {hashes[key]}
                      </div>
                    </div>
                    <Button
                      onClick={() => copyToClipboard(hashes[key], label)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 flex-shrink-0"
                      title="Copy hash"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hash Verification */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Verify Hash
          </h2>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={verifyHash}
                onChange={(e) => {
                  setVerifyHash(e.target.value);
                  setVerifyResult(null);
                }}
                placeholder="Enter hash to verify..."
                className="flex-1 px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
              />
              <Button
                onClick={handleVerify}
                disabled={!inputText || !verifyHash}
                className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
              >
                Verify
              </Button>
            </div>

            {verifyResult && (
              <div className={`p-4 rounded-lg border-2 ${
                verifyResult.match 
                  ? 'bg-green-500/10 border-green-500' 
                  : 'bg-red-500/10 border-red-500'
              }`}>
                <div className="flex items-center gap-2">
                  {verifyResult.match ? (
                    <>
                      <Check className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-semibold text-green-500">Hash Verified!</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          Algorithm: {verifyResult.algorithm}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-red-500" />
                      <div>
                        <div className="font-semibold text-red-500">Hash Mismatch</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          The hash does not match the input text
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
HashGenerator.metadata = {
  id: 'hash-generator',
  name: 'Hash Generator',
  description: 'Generate and verify hashes (MD5, SHA-1, SHA-256, SHA-512)',
  category: 'generators',
  requiresBackend: false,
};

export default HashGenerator;
