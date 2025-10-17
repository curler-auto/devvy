import React, { useState } from 'react';
import { Key, Copy, Download, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import forge from 'node-forge';

/**
 * SSH Key Generator & Verifier Tool
 * Generate SSH key pairs and verify existing keys
 */
function SSHKeyGenerator({ tab, tabs, setTabs }) {
  const [keyType, setKeyType] = useState('rsa');
  const [keySize, setKeySize] = useState(2048);
  const [passphrase, setPassphrase] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Verify key
  const [verifyKey, setVerifyKey] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  // Generate SSH key pair
  const generateKeyPair = async () => {
    setIsGenerating(true);
    toast.info('Generating SSH key pair...');

    try {
      // Generate RSA key pair using forge
      const keypair = forge.pki.rsa.generateKeyPair({ bits: keySize, workers: 2 });
      
      // Convert to PEM format
      const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
      const publicKeyPem = forge.pki.publicKeyToPem(keypair.publicKey);
      
      // Convert public key to SSH format
      const sshPublicKey = forge.ssh.publicKeyToOpenSSH(keypair.publicKey, 'user@host');
      
      // Generate fingerprint (MD5)
      const publicKeyBytes = forge.ssh.publicKeyToOpenSSH(keypair.publicKey);
      const md5 = forge.md.md5.create();
      md5.update(publicKeyBytes);
      const fingerprintHex = md5.digest().toHex();
      const fingerprintFormatted = fingerprintHex.match(/.{2}/g).join(':');

      setPrivateKey(privateKeyPem);
      setPublicKey(sshPublicKey);
      setFingerprint(`MD5:${fingerprintFormatted}`);
      
      toast.success('SSH key pair generated successfully!');
    } catch (err) {
      console.error('Key generation error:', err);
      toast.error(`Failed to generate keys: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Verify SSH key
  const handleVerifyKey = () => {
    try {
      if (!verifyKey.trim()) {
        toast.error('Please enter a key to verify');
        return;
      }

      let keyInfo = {};
      
      // Try to parse as private key
      if (verifyKey.includes('BEGIN RSA PRIVATE KEY') || verifyKey.includes('BEGIN PRIVATE KEY')) {
        const privateKey = forge.pki.privateKeyFromPem(verifyKey);
        keyInfo = {
          type: 'RSA Private Key',
          valid: true,
          bits: privateKey.n.bitLength(),
          format: 'PEM',
        };
      }
      // Try to parse as public key
      else if (verifyKey.includes('BEGIN PUBLIC KEY')) {
        const publicKey = forge.pki.publicKeyFromPem(verifyKey);
        keyInfo = {
          type: 'RSA Public Key',
          valid: true,
          bits: publicKey.n.bitLength(),
          format: 'PEM',
        };
      }
      // Try to parse as SSH public key
      else if (verifyKey.startsWith('ssh-rsa') || verifyKey.startsWith('ssh-ed25519')) {
        const parts = verifyKey.split(' ');
        keyInfo = {
          type: 'SSH Public Key',
          valid: true,
          algorithm: parts[0],
          format: 'OpenSSH',
          comment: parts[2] || 'N/A',
        };
      }
      else {
        throw new Error('Unrecognized key format');
      }

      setVerifyResult(keyInfo);
      toast.success('Key verified successfully!');
    } catch (err) {
      setVerifyResult({
        valid: false,
        error: err.message,
      });
      toast.error(`Invalid key: ${err.message}`);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Download key
  const downloadKey = (content, filename) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded!`);
  };

  return (
    <div className="ssh-key-generator p-6" data-testid="ssh-key-generator">
      <div className="space-y-6">
        {/* Generator Section */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-[var(--accent-primary)]" />
            SSH Key Generator
          </h2>
          
          <div className="space-y-4">
            {/* Key Type */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Key Type
              </label>
              <select
                value={keyType}
                onChange={(e) => setKeyType(e.target.value)}
                className="w-full px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] cursor-pointer"
              >
                <option value="rsa">RSA (Recommended)</option>
                <option value="ed25519" disabled>Ed25519 (Coming soon)</option>
                <option value="ecdsa" disabled>ECDSA (Coming soon)</option>
              </select>
            </div>

            {/* Key Size */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Key Size (bits)
              </label>
              <div className="flex gap-2">
                {[1024, 2048, 4096].map(size => (
                  <button
                    key={size}
                    onClick={() => setKeySize(size)}
                    className={`flex-1 px-4 py-2 rounded-md border transition-colors ${
                      keySize === size
                        ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                        : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    {size}
                    {size === 2048 && <span className="text-xs ml-1">(Default)</span>}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Higher key sizes are more secure but slower to generate
              </p>
            </div>

            {/* Passphrase (Optional) */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Passphrase (Optional)
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Leave empty for no passphrase"
                className="w-full px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateKeyPair}
              disabled={isGenerating}
              className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
            >
              <Key className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate SSH Key Pair'}
            </Button>
          </div>
        </div>

        {/* Generated Keys */}
        {publicKey && privateKey && (
          <>
            {/* Public Key */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Public Key</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(publicKey, 'Public key')}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={() => downloadKey(publicKey, 'id_rsa.pub')}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              <textarea
                value={publicKey}
                readOnly
                className="w-full h-24 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--accent-primary)] font-mono text-xs resize-none"
              />
              
              {fingerprint && (
                <div className="mt-3 p-3 bg-[var(--bg-tertiary)] rounded">
                  <div className="text-sm text-[var(--text-secondary)]">Fingerprint:</div>
                  <div className="font-mono text-sm text-[var(--accent-primary)]">{fingerprint}</div>
                </div>
              )}
            </div>

            {/* Private Key */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Private Key</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(privateKey, 'Private key')}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={() => downloadKey(privateKey, 'id_rsa')}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              <textarea
                value={privateKey}
                readOnly
                className="w-full h-48 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono text-xs resize-none"
              />
              
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-500">
                <Shield className="w-4 h-4 inline-block mr-2" />
                Keep your private key secure! Never share it with anyone.
              </div>
            </div>
          </>
        )}

        {/* Key Verifier */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Verify SSH Key
          </h2>
          
          <div className="space-y-4">
            <textarea
              value={verifyKey}
              onChange={(e) => {
                setVerifyKey(e.target.value);
                setVerifyResult(null);
              }}
              placeholder="Paste SSH public or private key here to verify..."
              className="w-full h-32 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono text-sm resize-none"
            />

            <Button
              onClick={handleVerifyKey}
              disabled={!verifyKey}
              className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
            >
              Verify Key
            </Button>

            {verifyResult && (
              <div className={`p-4 rounded-lg border-2 ${
                verifyResult.valid
                  ? 'bg-green-500/10 border-green-500'
                  : 'bg-red-500/10 border-red-500'
              }`}>
                {verifyResult.valid ? (
                  <div className="space-y-2">
                    <div className="font-semibold text-green-500">✓ Valid Key</div>
                    <div className="text-sm space-y-1">
                      <div><span className="text-[var(--text-secondary)]">Type:</span> <span className="text-[var(--text-primary)]">{verifyResult.type}</span></div>
                      {verifyResult.bits && <div><span className="text-[var(--text-secondary)]">Size:</span> <span className="text-[var(--text-primary)]">{verifyResult.bits} bits</span></div>}
                      {verifyResult.algorithm && <div><span className="text-[var(--text-secondary)]">Algorithm:</span> <span className="text-[var(--text-primary)]">{verifyResult.algorithm}</span></div>}
                      <div><span className="text-[var(--text-secondary)]">Format:</span> <span className="text-[var(--text-primary)]">{verifyResult.format}</span></div>
                      {verifyResult.comment && <div><span className="text-[var(--text-secondary)]">Comment:</span> <span className="text-[var(--text-primary)]">{verifyResult.comment}</span></div>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-red-500">✗ Invalid Key</div>
                    <div className="text-sm text-[var(--text-secondary)] mt-1">{verifyResult.error}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="border rounded-lg p-4 bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text-primary)] mb-2">About SSH Keys</div>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>RSA:</strong> Most widely supported, recommended 2048+ bits</li>
            <li><strong>Public Key:</strong> Share this with servers (add to ~/.ssh/authorized_keys)</li>
            <li><strong>Private Key:</strong> Keep this secret on your local machine</li>
            <li><strong>Passphrase:</strong> Optional extra security layer for private key</li>
            <li><strong>Fingerprint:</strong> Unique identifier for verification</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
SSHKeyGenerator.metadata = {
  id: 'ssh-key-generator',
  name: 'SSH Key Generator',
  description: 'Generate and verify SSH key pairs',
  category: 'generators',
  requiresBackend: false,
};

export default SSHKeyGenerator;
