import React, { useState, useEffect } from 'react';
import { Shield, Copy, AlertCircle, Check, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * JWT Encoder/Decoder Tool
 * Encode and decode JWT tokens
 */
function JWTDecoder({ tab, tabs, setTabs }) {
  const [mode, setMode] = useState('decode'); // 'encode' or 'decode'
  
  // Decode state
  const [jwtToken, setJwtToken] = useState('');
  const [decoded, setDecoded] = useState(null);
  const [error, setError] = useState(null);
  const [headerJSON, setHeaderJSON] = useState('');
  const [payloadJSON, setPayloadJSON] = useState('');
  const [verifySecret, setVerifySecret] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  
  // Encode state
  const [algorithm, setAlgorithm] = useState('HS256');
  const [secret, setSecret] = useState('your-secret-key');
  const [payload, setPayload] = useState(JSON.stringify({
    sub: '1234567890',
    name: 'John Doe',
    iat: Math.floor(Date.now() / 1000)
  }, null, 2));
  const [encodedToken, setEncodedToken] = useState('');

  // Decode JWT
  useEffect(() => {
    if (!jwtToken.trim()) {
      setDecoded(null);
      setError(null);
      return;
    }

    try {
      const parts = jwtToken.split('.');
      if (parts.length !== 3) {
        setError('Invalid JWT format. Expected 3 parts separated by dots.');
        setDecoded(null);
        return;
      }

      // Decode header and payload
      const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      const signature = parts[2];

      setHeaderJSON(JSON.stringify(header, null, 2));
      setPayloadJSON(JSON.stringify(payload, null, 2));

      setDecoded({
        header,
        payload,
        signature,
        isExpired: payload.exp ? Date.now() / 1000 > payload.exp : null,
      });
      setError(null);
    } catch (err) {
      setError(`Failed to decode JWT: ${err.message}`);
      setDecoded(null);
    }
  }, [jwtToken]);

  // Encode JWT using backend API
  const encodeJWT = async () => {
    try {
      const parsedPayload = JSON.parse(payload);
      
      // Call backend API for proper cryptographic signing
      const response = await fetch('http://localhost:8000/api/tools/jwt/encode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          algorithm: algorithm,
          secret: secret,
          payload: parsedPayload
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to encode JWT');
      }
      
      const data = await response.json();
      setEncodedToken(data.token);
      toast.success('JWT token generated with proper cryptographic signing!');
    } catch (err) {
      console.error('JWT encoding error:', err);
      toast.error(`Failed to encode JWT: ${err.message}`);
    }
  };
  
  // Verify JWT signature
  const verifySignature = async () => {
    if (!verifySecret.trim()) {
      toast.error('Please enter a secret key for verification');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/tools/jwt/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: jwtToken,
          secret: verifySecret
        })
      });

      const data = await response.json();
      setVerificationResult(data);
      
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      console.error('JWT verification error:', err);
      toast.error(`Failed to verify JWT: ${err.message}`);
    }
  };
  
  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="jwt-decoder h-full flex flex-col" data-testid="jwt-decoder">
      {/* Header */}
      <div className="border-b p-4 bg-[var(--bg-secondary)]">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
          JWT Encoder/Decoder
        </h2>
        
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('decode')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'decode'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Decode
          </button>
          <button
            onClick={() => setMode('encode')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === 'encode'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            Encode
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {mode === 'decode' ? (
          <div className="space-y-6">
            {/* Decode Input Section */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">JWT Token</h3>
          
              <textarea
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
                placeholder="Paste JWT token here (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"
                className="w-full h-32 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] font-mono text-sm resize-none"
              />

              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-500">{error}</div>
                </div>
              )}
            </div>

            {/* Decoded Sections */}
            {decoded && (
          <>
            {/* Token Status */}
            {decoded.payload.exp && (
              <div className={`border-2 rounded-lg p-4 ${
                decoded.isExpired 
                  ? 'bg-red-500/10 border-red-500' 
                  : 'bg-green-500/10 border-green-500'
              }`}>
                <div className="flex items-center gap-2">
                  {decoded.isExpired ? (
                    <>
                      <X className="w-5 h-5 text-red-500" />
                      <div>
                        <div className="font-semibold text-red-500">Token Expired</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          Expired at: {formatTimestamp(decoded.payload.exp)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-semibold text-green-500">Token Valid</div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          Expires at: {formatTimestamp(decoded.payload.exp)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Header */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Header</h2>
                <Button
                  onClick={() => copyToClipboard(headerJSON, 'Header')}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Copy header"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <pre className="p-4 bg-[var(--bg-tertiary)] rounded font-mono text-sm text-[var(--text-primary)] overflow-x-auto">
                {headerJSON}
              </pre>

              <div className="mt-4 space-y-2">
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">Algorithm:</span>{' '}
                  <span className="font-mono text-[var(--accent-primary)]">{decoded.header.alg}</span>
                </div>
                <div className="text-sm">
                  <span className="text-[var(--text-secondary)]">Type:</span>{' '}
                  <span className="font-mono text-[var(--accent-primary)]">{decoded.header.typ}</span>
                </div>
              </div>
            </div>

            {/* Payload */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Payload (Claims)</h2>
                <Button
                  onClick={() => copyToClipboard(payloadJSON, 'Payload')}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Copy payload"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <pre className="p-4 bg-[var(--bg-tertiary)] rounded font-mono text-sm text-[var(--text-primary)] overflow-x-auto">
                {payloadJSON}
              </pre>

              <div className="mt-4 space-y-2">
                {decoded.payload.iss && (
                  <div className="text-sm">
                    <span className="text-[var(--text-secondary)]">Issuer (iss):</span>{' '}
                    <span className="font-mono text-[var(--text-primary)]">{decoded.payload.iss}</span>
                  </div>
                )}
                {decoded.payload.sub && (
                  <div className="text-sm">
                    <span className="text-[var(--text-secondary)]">Subject (sub):</span>{' '}
                    <span className="font-mono text-[var(--text-primary)]">{decoded.payload.sub}</span>
                  </div>
                )}
                {decoded.payload.aud && (
                  <div className="text-sm">
                    <span className="text-[var(--text-secondary)]">Audience (aud):</span>{' '}
                    <span className="font-mono text-[var(--text-primary)]">{decoded.payload.aud}</span>
                  </div>
                )}
                {decoded.payload.iat && (
                  <div className="text-sm">
                    <span className="text-[var(--text-secondary)]">Issued At (iat):</span>{' '}
                    <span className="font-mono text-[var(--text-primary)]">{formatTimestamp(decoded.payload.iat)}</span>
                  </div>
                )}
                {decoded.payload.exp && (
                  <div className="text-sm">
                    <span className="text-[var(--text-secondary)]">Expires At (exp):</span>{' '}
                    <span className="font-mono text-[var(--text-primary)]">{formatTimestamp(decoded.payload.exp)}</span>
                  </div>
                )}
                {decoded.payload.nbf && (
                  <div className="text-sm">
                    <span className="text-[var(--text-secondary)]">Not Before (nbf):</span>{' '}
                    <span className="font-mono text-[var(--text-primary)]">{formatTimestamp(decoded.payload.nbf)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Signature */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Signature</h2>
                <Button
                  onClick={() => copyToClipboard(decoded.signature, 'Signature')}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  title="Copy signature"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-4 bg-[var(--bg-tertiary)] rounded font-mono text-sm text-[var(--accent-primary)] break-all">
                {decoded.signature}
              </div>

              {/* Signature Verification */}
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Verify Signature
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verifySecret}
                    onChange={(e) => setVerifySecret(e.target.value)}
                    placeholder="Enter secret key or public key"
                    className="flex-1 px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none font-mono text-sm"
                  />
                  <Button
                    onClick={verifySignature}
                    className="bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
                  >
                    Verify
                  </Button>
                </div>
                
                {verificationResult && (
                  <div className={`mt-3 p-3 rounded flex items-start gap-2 ${
                    verificationResult.valid 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    {verificationResult.valid ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className={`text-sm ${verificationResult.valid ? 'text-green-500' : 'text-red-500'}`}>
                      {verificationResult.message}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Encode Section */}
            <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">JWT Configuration</h3>
              
              {/* Algorithm */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Algorithm</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                >
                  <optgroup label="HMAC (Symmetric)">
                    <option value="HS256">HS256 (HMAC SHA-256)</option>
                    <option value="HS384">HS384 (HMAC SHA-384)</option>
                    <option value="HS512">HS512 (HMAC SHA-512)</option>
                  </optgroup>
                  <optgroup label="RSA (Asymmetric)">
                    <option value="RS256">RS256 (RSA SHA-256)</option>
                    <option value="RS384">RS384 (RSA SHA-384)</option>
                    <option value="RS512">RS512 (RSA SHA-512)</option>
                  </optgroup>
                  <optgroup label="ECDSA (Elliptic Curve)">
                    <option value="ES256">ES256 (ECDSA P-256 SHA-256)</option>
                    <option value="ES384">ES384 (ECDSA P-384 SHA-384)</option>
                    <option value="ES512">ES512 (ECDSA P-521 SHA-512)</option>
                  </optgroup>
                  <optgroup label="RSA-PSS">
                    <option value="PS256">PS256 (RSA-PSS SHA-256)</option>
                    <option value="PS384">PS384 (RSA-PSS SHA-384)</option>
                    <option value="PS512">PS512 (RSA-PSS SHA-512)</option>
                  </optgroup>
                </select>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  HS* uses secret key | RS*/ES*/PS* use private key (PEM format)
                </p>
              </div>

              {/* Secret Key */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Secret Key
                </label>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter secret key"
                  className="w-full px-3 py-2 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none font-mono text-sm"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Used for signing the token</p>
              </div>

              {/* Payload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Payload (JSON)</label>
                <textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  placeholder='{ "sub": "1234567890", "name": "John Doe" }'
                  className="w-full h-64 px-4 py-3 border rounded-md bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none font-mono text-sm resize-none"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Standard claims: sub, iss, aud, exp, iat, nbf</p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={encodeJWT}
                className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white"
              >
                Generate JWT Token
              </Button>
            </div>

            {/* Generated Token */}
            {encodedToken && (
              <div className="border rounded-lg p-6 bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Generated Token</h3>
                  <Button
                    onClick={() => copyToClipboard(encodedToken, 'JWT Token')}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Copy token"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="p-4 bg-[var(--bg-tertiary)] rounded font-mono text-sm text-[var(--accent-primary)] break-all">
                  {encodedToken}
                </div>

                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded text-sm text-[var(--text-secondary)]">
                  <Check className="w-4 h-4 inline-block mr-2 text-green-500" />
                  ✓ Production-grade JWT with proper cryptographic signing via backend (PyJWT library)
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Tool metadata
JWTDecoder.metadata = {
  id: 'jwt-decoder',
  name: 'JWT Encoder/Decoder',
  description: 'Encode and decode JWT tokens',
  category: 'security',
  requiresBackend: false,
};

export default JWTDecoder;
