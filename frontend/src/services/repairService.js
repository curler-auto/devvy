import { PDFDocument } from 'pdf-lib';
import { flattenPDF } from './pdfService';

export const repairPDF = async (file) => {
  try {
    // Attempt non-destructive repair using pdf-lib
    const arrayBuffer = await file.arrayBuffer();

    // pdf-lib automatically attempts to repair XRef tables when loading
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // We can also try to copy pages to a new document to ensure a clean structure
    const newDoc = await PDFDocument.create();
    const pages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());

    pages.forEach(page => newDoc.addPage(page));

    const savedBytes = await newDoc.save();
    return new Blob([savedBytes], { type: 'application/pdf' });
  } catch (error) {
    console.warn("Standard repair failed, attempting robust repair (flattening)...", error);
    try {
        // Fallback to destructive repair (rasterization)
        return await flattenPDF(file);
    } catch (flattenError) {
        console.error("Robust repair failed:", flattenError);
        throw new Error("Failed to repair PDF. The file might be too corrupted.");
    }
  }
};
