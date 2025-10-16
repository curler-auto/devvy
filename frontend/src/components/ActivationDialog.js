import React, { useState } from 'react';
import { X, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const ActivationDialog = ({ isOpen, onClose, onActivate }) => {
  const [activationKey, setActivationKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleActivate = async () => {
    if (!activationKey.trim()) {
      setError('Please enter an activation key');
      return;
    }

    setIsActivating(true);
    setError('');
    setSuccess('');

    try {
      const result = await onActivate(activationKey);
      
      if (result.success) {
        setSuccess(result.message || 'License activated successfully!');
        setTimeout(() => {
          onClose();
          setActivationKey('');
          setSuccess('');
        }, 2000);
      } else {
        setError(result.message || 'Activation failed');
      }
    } catch (err) {
      setError('Failed to activate license. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isActivating) {
      handleActivate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-white">Activate Premium Features</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isActivating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-400">
            Enter your activation key to unlock premium tools and features.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Activation Key
            </label>
            <input
              type="text"
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="PRO-XXXX-XXXX-XXXX"
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={isActivating}
              autoFocus
            />
          </div>

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <p className="text-sm text-emerald-400">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-400">
              <strong>Test Keys:</strong><br />
              • <code className="bg-blue-500/20 px-1 py-0.5 rounded">PRO-TEST-KEY</code> - All premium tools<br />
              • <code className="bg-blue-500/20 px-1 py-0.5 rounded">PREMIUM-TEST-KEY</code> - Selected premium tools
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#2a2a2a]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            disabled={isActivating}
          >
            Cancel
          </button>
          <button
            onClick={handleActivate}
            disabled={isActivating || !activationKey.trim()}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {isActivating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <Key className="w-4 h-4" />
                Activate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivationDialog;
