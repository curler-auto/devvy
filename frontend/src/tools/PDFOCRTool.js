import React, { useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { performOCR } from '@/services/ocrService';
import { saveAs } from 'file-saver';
import PDFToolWrapper from '@/components/PDFToolWrapper';

const OCRPDF = ({ file, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleOCR = async () => {
    try {
      setIsProcessing(true);
      const blob = await performOCR(file, (p) => setProgress(p));
      const newFileName = file.name.replace('.pdf', '_ocr.pdf');
      saveAs(blob, newFileName);
      setIsProcessing(false);
      onClose();
    } catch (error) {
      console.error("OCR failed:", error);
      setIsProcessing(false);
      alert("OCR failed.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Eye className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">OCR PDF</h2>
        <p className="text-slate-500 mb-8">Recognize text in scanned documents to make them searchable.</p>

        {isProcessing ? (
          <div className="space-y-4">
             <div className="flex items-center justify-center space-x-2 text-yellow-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-medium">Processing... {Math.round(progress)}%</span>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-yellow-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
          </div>
        ) : (
          <button
            onClick={handleOCR}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-yellow-200 transition-all"
          >
            Start OCR
          </button>
        )}
      </div>
    </div>
  );
};

const PDFOCRTool = () => {
    return (
        <PDFToolWrapper title="OCR PDF" description="Make PDF text searchable">
            <OCRPDF />
        </PDFToolWrapper>
    );
};

PDFOCRTool.metadata = {
  id: 'pdf-ocr',
  name: 'OCR PDF',
  description: 'Optical Character Recognition',
  category: 'image',
  requiresBackend: false,
};

export default PDFOCRTool;
