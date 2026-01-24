import { flattenPDF } from './pdfService';
import * as pdfjsLib from 'pdfjs-dist';

jest.mock('pdfjs-dist', () => ({
    GlobalWorkerOptions: {},
    getDocument: jest.fn()
}));

// Mock jspdf just in case, though we try to avoid using it
jest.mock('jspdf', () => ({
    jsPDF: jest.fn()
}));

describe('flattenPDF', () => {
  const mockFile = {
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10)),
  };

  it('should pass password to getDocument', async () => {
    const mockPdf = {
        numPages: 0, // Set to 0 to avoid entering the processing loop and using jsPDF
    };

    // Mock getDocument to return an object where promise resolves to pdf proxy
    const loadingTask = {
        promise: Promise.resolve(mockPdf)
    };
    pdfjsLib.getDocument.mockReturnValue(loadingTask);

    try {
        await flattenPDF(mockFile, null, 'secret');
    } catch (e) {
        // We expect "No pages processed" error because numPages is 0
        expect(e.message).toBe('No pages processed');
    }

    expect(pdfjsLib.getDocument).toHaveBeenCalledWith(expect.objectContaining({
        password: 'secret'
    }));
  });
});
