import React, { useState } from 'react';
import { Scissors, Loader2, Save } from 'lucide-react';
import { compressPDF } from '@/services/pdfService';
import { saveAs } from 'file-saver';
import PDFToolWrapper from '@/components/PDFToolWrapper';

const CompressPDF = ({ file, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleCompress = async () => {
    try {
      setIsProcessing(true);
      const blob = await compressPDF(file, (p) => setProgress(p));
      const newFileName = file.name.replace('.pdf', '_compressed.pdf');
      saveAs(blob, newFileName);
      setIsProcessing(false);
      onClose();
    } catch (error) {
      console.error("Compression failed:", error);
      setIsProcessing(false);
      alert("Failed to compress PDF.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Scissors className="w-8 h-8 text-pink-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Compress PDF</h2>
        <p className="text-slate-500 mb-8">Reduce file size while optimizing for quality.</p>

        {isProcessing ? (
          <div className="space-y-4">
             <div className="flex items-center justify-center space-x-2 text-pink-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-medium">Compressing... {Math.round(progress)}%</span>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-pink-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
          </div>
        ) : (
          <button
            onClick={handleCompress}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-pink-200 transition-all"
          >
            Compress Now
          </button>
        )}
      </div>
    </div>
  );
};

const PDFCompressTool = () => {
    return (
        <PDFToolWrapper title="Compress PDF" description="Reduce file size">
            <CompressPDF />
        </PDFToolWrapper>
    );
};

PDFCompressTool.metadata = {
  id: 'pdf-compress',
  name: 'Compress PDF',
  description: 'Reduce PDF file size',
  category: 'file',
  requiresBackend: false,
};

export default PDFCompressTool;
