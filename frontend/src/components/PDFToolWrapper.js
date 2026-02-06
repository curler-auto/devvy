import React, { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result;
        // Extract raw base64
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function PDFToolWrapper({ children, title, description, allowedTypes = '.pdf,application/pdf' }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = useCallback(async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Basic type check if allowedTypes is strictly PDF
    if (allowedTypes === '.pdf,application/pdf' && selectedFile.type !== 'application/pdf') {
        alert('Please select a PDF file.');
        return;
    }

    setLoading(true);
    try {
      const content = await readFileAsBase64(selectedFile);
      setFile({
        name: selectedFile.name,
        content: content,
        type: selectedFile.type,
        size: selectedFile.size,
        arrayBuffer: () => selectedFile.arrayBuffer(),
        originalFile: selectedFile
      });
    } catch (err) {
      console.error(err);
      alert('Error reading file');
    } finally {
      setLoading(false);
    }
  }, [allowedTypes]);

  const handleClose = useCallback(() => {
    setFile(null);
  }, []);

  if (file) {
    // Clone element and pass file and onClose props
    return React.cloneElement(children, { file, onClose: handleClose });
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-[var(--bg-primary)]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title || 'PDF Tool'}</h2>
            <p className="text-[var(--text-secondary)]">{description || 'Upload a PDF file to get started'}</p>
        </div>

        <div className="border-2 border-dashed border-[var(--border-primary)] rounded-xl p-10 flex flex-col items-center justify-center space-y-4 hover:border-[var(--accent-primary)] transition-colors cursor-pointer relative bg-[var(--bg-secondary)]">
            <input
                type="file"
                accept={allowedTypes}
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-full">
                <Upload className="w-8 h-8 text-[var(--accent-primary)]" />
            </div>
            <div className="space-y-1">
                <p className="font-medium text-[var(--text-primary)]">Click or drag file here</p>
                <p className="text-sm text-[var(--text-tertiary)]">Up to 50MB</p>
            </div>
        </div>

        {loading && <p className="text-[var(--text-secondary)]">Loading...</p>}
      </div>
    </div>
  );
}
