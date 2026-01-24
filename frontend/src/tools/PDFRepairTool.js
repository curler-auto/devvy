import React, { useState } from 'react';
import { Wrench, Loader2 } from 'lucide-react';
import { repairPDF } from '@/services/repairService';
import { saveAs } from 'file-saver';
import PDFToolWrapper from '@/components/PDFToolWrapper';

const RepairPDF = ({ file, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRepair = async () => {
    try {
      setIsProcessing(true);
      const blob = await repairPDF(file);
      const newFileName = file.name.replace('.pdf', '_repaired.pdf');
      saveAs(blob, newFileName);
      setIsProcessing(false);
      onClose();
    } catch (error) {
      console.error("Repair failed:", error);
      setIsProcessing(false);
      alert("Failed to repair PDF. The file might be too corrupted.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Repair PDF</h2>
        <p className="text-slate-500 mb-8">Recover data from corrupted or damaged PDF files.</p>

        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2 text-red-600">
             <Loader2 className="w-6 h-6 animate-spin" />
             <span className="font-medium">Repairing...</span>
          </div>
        ) : (
          <button
            onClick={handleRepair}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-red-200 transition-all"
          >
            Repair PDF
          </button>
        )}
      </div>
    </div>
  );
};

const PDFRepairTool = () => {
    return (
        <PDFToolWrapper title="Repair PDF" description="Fix corrupted PDF files">
            <RepairPDF />
        </PDFToolWrapper>
    );
};

PDFRepairTool.metadata = {
  id: 'pdf-repair',
  name: 'Repair PDF',
  description: 'Fix corrupted or damaged PDF files',
  category: 'file',
  requiresBackend: false,
};

export default PDFRepairTool;
