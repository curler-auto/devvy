import React, { useState } from 'react';
import { Lock, Unlock, Loader2 } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { flattenPDF } from '@/services/pdfService';
import PDFToolWrapper from '@/components/PDFToolWrapper';

const ProtectPDF = ({ file, mode, onClose }) => {
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleAction = async () => {
    if (!password) return;
    setIsProcessing(true);
    setError('');

    try {
        const arrayBuffer = await file.arrayBuffer();

        if (mode === 'protect') {
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const encryptedBytes = await pdfDoc.save({
                userPassword: password,
                ownerPassword: password,
            });
            const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
            saveAs(blob, file.name.replace('.pdf', '_protected.pdf'));
        } else {
            // Unlock
            let blob;
            try {
                 const pdfDoc = await PDFDocument.load(arrayBuffer, { password });
                 const savedBytes = await pdfDoc.save();
                 blob = new Blob([savedBytes], { type: 'application/pdf' });
            } catch (unlockError) {
                 console.warn("Standard unlock failed, attempting robust unlock...", unlockError);
                 // Fallback to destructive unlock (flattening with password)
                 blob = await flattenPDF(file, null, password);
            }
            saveAs(blob, file.name.replace('.pdf', '_unlocked.pdf'));
        }

        setIsProcessing(false);
        onClose();
    } catch (err) {
        console.error("Action failed:", err);
        setIsProcessing(false);
        setError(mode === 'protect' ? "Encryption failed." : "Incorrect password or decryption failed.");
    }
  };

  const Icon = mode === 'protect' ? Lock : Unlock;
  const color = mode === 'protect' ? 'text-indigo-600' : 'text-teal-600';
  const bgColor = mode === 'protect' ? 'bg-indigo-600' : 'bg-teal-600';
  const bgLight = mode === 'protect' ? 'bg-indigo-100' : 'bg-teal-100';

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <div className={`w-16 h-16 ${bgLight} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <Icon className={`w-8 h-8 ${color}`} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{mode === 'protect' ? 'Protect PDF' : 'Unlock PDF'}</h2>
        <p className="text-slate-500 mb-6">{mode === 'protect' ? 'Encrypt your PDF with a password.' : 'Enter password to remove security.'}</p>

        <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            className="w-full border border-slate-300 rounded-xl px-4 py-3 mb-2 focus:ring-2 focus:ring-blue-500 outline-none"
        />

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {isProcessing ? (
          <div className={`flex items-center justify-center space-x-2 ${color} mt-4`}>
             <Loader2 className="w-6 h-6 animate-spin" />
             <span className="font-medium">Processing...</span>
          </div>
        ) : (
          <button
            onClick={handleAction}
            disabled={!password}
            className={`w-full ${bgColor} hover:opacity-90 text-white py-3 rounded-xl font-bold text-lg shadow-lg transition-all mt-4 disabled:opacity-50`}
          >
            {mode === 'protect' ? 'Encrypt PDF' : 'Unlock PDF'}
          </button>
        )}
      </div>
    </div>
  );
};

const PDFProtectionTool = ({ mode }) => {
    return (
        <PDFToolWrapper
            title={mode === 'protect' ? 'Protect PDF' : 'Unlock PDF'}
            description={mode === 'protect' ? 'Add password security' : 'Remove password security'}
        >
            <ProtectPDF mode={mode} />
        </PDFToolWrapper>
    );
};

export default PDFProtectionTool;
