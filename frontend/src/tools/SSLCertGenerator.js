import React, { useState } from 'react';
import { Shield, Copy, Download, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import forge from 'node-forge';

/**
 * SSL Certificate Generator Tool
 * Generate self-signed SSL/TLS certificates in multiple formats
 */
function SSLCertGenerator({ tab, tabs, setTabs }) {
  const [commonName, setCommonName] = useState('');
  const [organization, setOrganization] = useState('');
  const [country, setCountry] = useState('US');
  const [validityDays, setValidityDays] = useState(365);
  const [keySize, setKeySize] = useState(2048);
  const [certificate, setCertificate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate self-signed certificate
  const generateCertificate = async () => {
    if (!commonName.trim()) {
      toast.error('Please enter a Common Name (CN)');
      return;
    }

    setIsGenerating(true);
    toast.info('Generating SSL certificate...');

    try {
      // Generate key pair
      const keys = forge.pki.rsa.generateKeyPair(keySize);

      // Create certificate
      const cert = forge.pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01' + Math.floor(Math.random() * 1000000000).toString(16);
      
      const notBefore = new Date();
      const notAfter = new Date();
      notAfter.setDate(notBefore.getDate() + validityDays);
      
      cert.validity.notBefore = notBefore;
      cert.validity.notAfter = notAfter;

      // Set subject attributes
      const attrs = [
        { name: 'commonName', value: commonName },
        { name: 'countryName', value: country },
      ];
      
      if (organization) {
        attrs.push({ name: 'organizationName', value: organization });
      }

      cert.setSubject(attrs);
      cert.setIssuer(attrs); // Self-signed

      // Add extensions
      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: true,
        },
        {
          name: 'keyUsage',
          keyCertSign: true,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: true,
          dataEncipherment: true,
        },
        {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true,
          codeSigning: true,
          emailProtection: true,
          timeStamping: true,
        },
        {
          name: 'subjectAltName',
          altNames: [
            { type: 2, value: commonName }, // DNS
            { type: 7, ip: '127.0.0.1' }, // IP
          ],
        },
      ]);

      // Sign certificate
      cert.sign(keys.privateKey, forge.md.sha256.create());

      // Convert to various formats
      const certPem = forge.pki.certificateToPem(cert);
      const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
      const publicKeyPem = forge.pki.publicKeyToPem(keys.publicKey);
      
      // PKCS#12 format (PFX)
      const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
        keys.privateKey,
        [cert],
        '', // password
        { algorithm: '3des' }
      );
      const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
      const p12Base64 = forge.util.encode64(p12Der);

      // Certificate info
      const certInfo = {
        serialNumber: cert.serialNumber,
        subject: cert.subject.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
        issuer: cert.issuer.attributes.map(attr => `${attr.shortName}=${attr.value}`).join(', '),
        validFrom: notBefore.toISOString(),
        validTo: notAfter.toISOString(),
        keySize: keySize,
        signatureAlgorithm: 'SHA256withRSA',
      };

      setCertificate({
        certPem,
        privateKeyPem,
        publicKeyPem,
        p12Base64,
        info: certInfo,
      });

      toast.success('SSL certificate generated successfully!');
    } catch (err) {
      console.error('Certificate generation error:', err);
      toast.error(`Failed to generate certificate: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Download file
  const downloadFile = (content, filename, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} downloaded!`);
  };

  // Download P12 (binary)
  const downloadP12 = () => {
    if (!certificate) return;
    
    // Convert base64 to binary
    const binaryString = atob(certificate.p12Base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes], { type: 'application/x-pkcs12' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'certificate.p12';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('certificate.p12 downloaded!');
  };

  return (
    <div className="ssl-cert-generator p-6" data-testid="ssl-cert-generator">
      <div className="space-y-6">
        {/* Generator Section */}
        <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
            SSL Certificate Generator
          </h2>
          
          <div className="space-y-4">
            {/* Common Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Common Name (CN) *
              </label>
              <input
                type="text"
                value={commonName}
                onChange={(e) => setCommonName(e.target.value)}
                placeholder="example.com or localhost"
                className="w-full px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Organization (O)
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="My Company Inc."
                className="w-full px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Country (C)
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="US"
                maxLength={2}
                className="w-full px-4 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              />
            </div>

            {/* Validity Days */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Validity (days)
              </label>
              <div className="flex gap-2">
                {[30, 90, 365, 730].map(days => (
                  <button
                    key={days}
                    onClick={() => setValidityDays(days)}
                    className={`flex-1 px-4 py-2 rounded-md border transition-colors text-sm ${
                      validityDays === days
                        ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                        : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]'
                    }`}
                  >
                    {days} days
                    {days === 365 && <div className="text-xs">(1 year)</div>}
                    {days === 730 && <div className="text-xs">(2 years)</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Key Size */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Key Size (bits)
              </label>
              <div className="flex gap-2">
                {[2048, 4096].map(size => (
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
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateCertificate}
              disabled={isGenerating || !commonName}
              className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
            >
              <Lock className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Self-Signed Certificate'}
            </Button>
          </div>
        </div>

        {/* Certificate Info */}
        {certificate && (
          <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Certificate Information
            </h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-[var(--bg-tertiary)] rounded">
                <span className="text-[var(--text-secondary)]">Serial Number:</span>
                <span className="font-mono text-[var(--text-primary)]">{certificate.info.serialNumber}</span>
              </div>
              <div className="flex justify-between p-2 bg-[var(--bg-tertiary)] rounded">
                <span className="text-[var(--text-secondary)]">Subject:</span>
                <span className="font-mono text-[var(--text-primary)]">{certificate.info.subject}</span>
              </div>
              <div className="flex justify-between p-2 bg-[var(--bg-tertiary)] rounded">
                <span className="text-[var(--text-secondary)]">Valid From:</span>
                <span className="font-mono text-[var(--text-primary)]">{new Date(certificate.info.validFrom).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-[var(--bg-tertiary)] rounded">
                <span className="text-[var(--text-secondary)]">Valid To:</span>
                <span className="font-mono text-[var(--text-primary)]">{new Date(certificate.info.validTo).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-[var(--bg-tertiary)] rounded">
                <span className="text-[var(--text-secondary)]">Key Size:</span>
                <span className="font-mono text-[var(--text-primary)]">{certificate.info.keySize} bits</span>
              </div>
              <div className="flex justify-between p-2 bg-[var(--bg-tertiary)] rounded">
                <span className="text-[var(--text-secondary)]">Signature:</span>
                <span className="font-mono text-[var(--text-primary)]">{certificate.info.signatureAlgorithm}</span>
              </div>
            </div>
          </div>
        )}

        {/* Certificate Files */}
        {certificate && (
          <>
            {/* Certificate (PEM) */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Certificate (PEM)
                </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(certificate.certPem, 'Certificate')}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={() => downloadFile(certificate.certPem, 'certificate.crt')}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    .crt
                  </Button>
                  <Button
                    onClick={() => downloadFile(certificate.certPem, 'certificate.pem')}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    .pem
                  </Button>
                </div>
              </div>
              
              <textarea
                value={certificate.certPem}
                readOnly
                className="w-full h-48 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--accent-primary)] font-mono text-xs resize-none"
              />
            </div>

            {/* Private Key */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  Private Key (PEM)
                </h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(certificate.privateKeyPem, 'Private key')}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={() => downloadFile(certificate.privateKeyPem, 'private.key')}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    .key
                  </Button>
                </div>
              </div>
              
              <textarea
                value={certificate.privateKeyPem}
                readOnly
                className="w-full h-48 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono text-xs resize-none"
              />
              
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-500">
                <Shield className="w-4 h-4 inline-block mr-2" />
                Keep your private key secure! Never share it publicly.
              </div>
            </div>

            {/* PKCS#12 */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    PKCS#12 Format (.p12/.pfx)
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Combined certificate and private key (for Windows, Java, etc.)
                  </p>
                </div>
                <Button
                  onClick={downloadP12}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download .p12
                </Button>
              </div>
              
              <div className="p-4 bg-[var(--bg-tertiary)] rounded font-mono text-xs text-[var(--text-secondary)] break-all">
                {certificate.p12Base64.substring(0, 200)}...
              </div>
            </div>
          </>
        )}

        {/* Info */}
        <div className="border rounded-lg p-4 bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text-primary)] mb-2">About SSL Certificates</div>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong>Self-Signed:</strong> For development/testing only, not trusted by browsers</li>
            <li><strong>PEM Format:</strong> Most common, used by Apache, Nginx, etc.</li>
            <li><strong>PKCS#12:</strong> Combined format for Windows IIS, Java keystores</li>
            <li><strong>Common Name:</strong> Domain name or hostname (e.g., localhost, example.com)</li>
            <li><strong>Production:</strong> Use a trusted CA (Let's Encrypt, DigiCert, etc.)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Tool metadata
SSLCertGenerator.metadata = {
  id: 'ssl-cert-generator',
  name: 'SSL Certificate Generator',
  description: 'Generate self-signed SSL/TLS certificates',
  category: 'generators',
  requiresBackend: false,
};

export default SSLCertGenerator;
