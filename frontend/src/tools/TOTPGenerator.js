import React, { useState, useEffect, useRef } from 'react';
import { TOTP, Secret } from 'otpauth';
import CryptoJS from 'crypto-js';
import { Copy, Check, Plus, Trash2, Eye, EyeOff, Download, Upload, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * TOTP Generator Tool
 * Generate Time-based One-Time Passwords (like Google Authenticator)
 * Features: One-time mode, Continuous mode, Manual time adjustment, Encrypted storage
 */
function TOTPGenerator({ tab, tabs, setTabs }) {
  const [entries, setEntries] = useState(tab.data?.entries || []);
  const [currentCodes, setCurrentCodes] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    label: '',
    issuer: '',
    secret: '',
    algorithm: 'SHA1',
    digits: 6,
    period: 30
  });
  
  // Settings
  const [showSecrets, setShowSecrets] = useState({});
  const [manualTime, setManualTime] = useState(null);
  const [useManualTime, setUseManualTime] = useState(false);
  const [manualTimeInput, setManualTimeInput] = useState('');
  
  const intervalRef = useRef(null);
  const ENCRYPTION_KEY = 'devvy-totp-secret-key-2025'; // In production, use env variable

  // Update tab data
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { entries } }
        : t
    );
    setTabs(updatedTabs);
  }, [entries]);

  // Generate TOTP codes
  const generateCode = (entry) => {
    try {
      const secret = decryptSecret(entry.encryptedSecret);
      const totp = new TOTP({
        issuer: entry.issuer,
        label: entry.label,
        algorithm: entry.algorithm,
        digits: entry.digits,
        period: entry.period,
        secret: Secret.fromBase32(secret)
      });
      
      const timestamp = useManualTime && manualTime ? manualTime : Date.now();
      return totp.generate({ timestamp });
    } catch (err) {
      console.error('Error generating TOTP:', err);
      return '------';
    }
  };

  // Update codes every second
  useEffect(() => {
    const updateCodes = () => {
      const timestamp = useManualTime && manualTime ? manualTime : Date.now();
      const period = 30000; // 30 seconds
      const remaining = Math.floor((period - (timestamp % period)) / 1000);
      setTimeRemaining(remaining);

      const codes = {};
      entries.forEach(entry => {
        codes[entry.id] = generateCode(entry);
      });
      setCurrentCodes(codes);
    };

    updateCodes();
    intervalRef.current = setInterval(updateCodes, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [entries, useManualTime, manualTime]);

  // Encrypt secret
  const encryptSecret = (secret) => {
    return CryptoJS.AES.encrypt(secret, ENCRYPTION_KEY).toString();
  };

  // Decrypt secret
  const decryptSecret = (encryptedSecret) => {
    const bytes = CryptoJS.AES.decrypt(encryptedSecret, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  // Add or update entry
  const saveEntry = () => {
    if (!formData.label.trim() || !formData.secret.trim()) {
      toast.error('Label and Secret are required');
      return;
    }

    // Validate secret (base32)
    const base32Regex = /^[A-Z2-7]+=*$/;
    if (!base32Regex.test(formData.secret.toUpperCase().replace(/\s/g, ''))) {
      toast.error('Invalid secret key. Must be Base32 encoded (A-Z, 2-7)');
      return;
    }

    const cleanSecret = formData.secret.toUpperCase().replace(/\s/g, '');
    
    if (editingId) {
      // Update existing
      setEntries(entries.map(e => 
        e.id === editingId 
          ? { ...e, ...formData, encryptedSecret: encryptSecret(cleanSecret) }
          : e
      ));
      toast.success('Entry updated');
    } else {
      // Add new
      const newEntry = {
        id: Date.now().toString(),
        ...formData,
        encryptedSecret: encryptSecret(cleanSecret),
        createdAt: new Date().toISOString()
      };
      setEntries([...entries, newEntry]);
      toast.success('Entry added');
    }

    resetForm();
  };

  // Delete entry
  const deleteEntry = (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      setEntries(entries.filter(e => e.id !== id));
      toast.success('Entry deleted');
    }
  };

  // Edit entry
  const editEntry = (entry) => {
    setFormData({
      label: entry.label,
      issuer: entry.issuer,
      secret: decryptSecret(entry.encryptedSecret),
      algorithm: entry.algorithm,
      digits: entry.digits,
      period: entry.period
    });
    setEditingId(entry.id);
    setShowAddForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      label: '',
      issuer: '',
      secret: '',
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  // Copy code to clipboard
  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  // Export entries
  const exportEntries = () => {
    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        entries: entries
      };
      
      const encrypted = CryptoJS.AES.encrypt(
        JSON.stringify(exportData),
        ENCRYPTION_KEY
      ).toString();
      
      const blob = new Blob([encrypted], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `totp-backup-${Date.now()}.devvy`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Entries exported');
    } catch (err) {
      toast.error('Failed to export');
    }
  };

  // Import entries
  const importEntries = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const encrypted = e.target.result;
        const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
        const data = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        
        if (data.version && data.entries) {
          setEntries([...entries, ...data.entries]);
          toast.success(`Imported ${data.entries.length} entries`);
        } else {
          toast.error('Invalid backup file');
        }
      } catch (err) {
        toast.error('Failed to import. Check encryption key.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Toggle show secret
  const toggleShowSecret = (id) => {
    setShowSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Set manual time
  const applyManualTime = () => {
    try {
      const timestamp = new Date(manualTimeInput).getTime();
      if (isNaN(timestamp)) {
        toast.error('Invalid date/time format');
        return;
      }
      setManualTime(timestamp);
      setUseManualTime(true);
      toast.success('Manual time applied');
    } catch (err) {
      toast.error('Invalid date/time');
    }
  };

  // Reset to system time
  const resetToSystemTime = () => {
    setUseManualTime(false);
    setManualTime(null);
    setManualTimeInput('');
    toast.success('Using system time');
  };

  // Progress percentage
  const progressPercentage = (timeRemaining / 30) * 100;

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">TOTP Generator</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Time-based One-Time Password Generator
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)} size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
          <Button onClick={exportEntries} size="sm" variant="outline" disabled={entries.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <label>
            <Button as="span" size="sm" variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            <input type="file" accept=".devvy" onChange={importEntries} className="hidden" />
          </label>
        </div>
      </div>

      {/* Manual Time Control (Testing) */}
      <div className="mb-4 p-3 border border-[var(--border-primary)] rounded-md bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Time Control (Testing)</span>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="datetime-local"
              value={manualTimeInput}
              onChange={(e) => setManualTimeInput(e.target.value)}
              className="flex-1 px-3 py-1 text-sm border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              disabled={!useManualTime}
            />
            {!useManualTime ? (
              <Button onClick={() => setUseManualTime(true)} size="sm" variant="outline">
                Enable Manual Time
              </Button>
            ) : (
              <>
                <Button onClick={applyManualTime} size="sm" variant="outline">
                  Apply
                </Button>
                <Button onClick={resetToSystemTime} size="sm" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </>
            )}
          </div>
          {useManualTime && (
            <span className="text-xs text-orange-500 font-medium">Manual Time Active</span>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 p-4 border-2 border-[var(--accent-primary)] rounded-md bg-[var(--bg-secondary)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {editingId ? 'Edit Entry' : 'Add New Entry'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., GitHub"
                className="w-full px-3 py-2 border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Issuer
              </label>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                placeholder="e.g., GitHub Inc"
                className="w-full px-3 py-2 border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Secret Key (Base32) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                placeholder="JBSWY3DPEHPK3PXP"
                className="w-full px-3 py-2 border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)] font-mono"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Base32 encoded secret (A-Z, 2-7). Remove spaces.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Algorithm
              </label>
              <select
                value={formData.algorithm}
                onChange={(e) => setFormData({ ...formData, algorithm: e.target.value })}
                className="w-full px-3 py-2 border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              >
                <option value="SHA1">SHA1</option>
                <option value="SHA256">SHA256</option>
                <option value="SHA512">SHA512</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Digits
              </label>
              <select
                value={formData.digits}
                onChange={(e) => setFormData({ ...formData, digits: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              >
                <option value="6">6 digits</option>
                <option value="8">8 digits</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Period (seconds)
              </label>
              <input
                type="number"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: parseInt(e.target.value) })}
                min="15"
                max="120"
                className="w-full px-3 py-2 border rounded bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={saveEntry} size="sm" className="bg-[var(--accent-primary)] text-white">
              {editingId ? 'Update' : 'Add'} Entry
            </Button>
            <Button onClick={resetForm} size="sm" variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Clock className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No TOTP Entries</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Add your first TOTP entry to get started
            </p>
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entries.map(entry => (
              <div
                key={entry.id}
                className="p-4 border-2 border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)] transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--text-primary)]">{entry.label}</h4>
                    {entry.issuer && (
                      <p className="text-xs text-[var(--text-secondary)]">{entry.issuer}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => editEntry(entry)}
                      className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
                      title="Edit"
                    >
                      <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-1 hover:bg-[var(--bg-tertiary)] rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* TOTP Code */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl font-mono font-bold text-[var(--accent-primary)] tracking-wider">
                      {currentCodes[entry.id] || '------'}
                    </span>
                    <button
                      onClick={() => copyCode(currentCodes[entry.id])}
                      className="p-2 hover:bg-[var(--bg-tertiary)] rounded"
                      title="Copy code"
                    >
                      <Copy className="w-5 h-5 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="relative h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full transition-all duration-1000 ${
                        timeRemaining <= 5 ? 'bg-red-500' : 'bg-[var(--accent-primary)]'
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-[var(--text-secondary)]">
                      {timeRemaining}s remaining
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {entry.digits} digits • {entry.algorithm}
                    </span>
                  </div>
                </div>

                {/* Secret (toggleable) */}
                <div className="pt-2 border-t border-[var(--border-primary)]">
                  <button
                    onClick={() => toggleShowSecret(entry.id)}
                    className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {showSecrets[entry.id] ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    {showSecrets[entry.id] ? 'Hide' : 'Show'} Secret
                  </button>
                  {showSecrets[entry.id] && (
                    <p className="text-xs font-mono text-[var(--text-secondary)] mt-1 break-all">
                      {decryptSecret(entry.encryptedSecret)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TOTPGenerator;
