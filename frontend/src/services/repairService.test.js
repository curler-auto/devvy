import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

import { repairPDF } from './repairService';
import { PDFDocument } from 'pdf-lib';
import { flattenPDF } from './pdfService';

jest.mock('pdf-lib');
jest.mock('./pdfService');

describe('repairPDF', () => {
  const mockFile = {
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(10)),
    name: 'test.pdf'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should use pdf-lib for standard repair', async () => {
    const mockPdfDoc = {
      getPageIndices: jest.fn().mockReturnValue([0]),
      save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
    };
    const mockNewDoc = {
      copyPages: jest.fn().mockResolvedValue(['page1']),
      addPage: jest.fn(),
      save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
    };

    PDFDocument.load.mockResolvedValue(mockPdfDoc);
    PDFDocument.create.mockResolvedValue(mockNewDoc);

    const result = await repairPDF(mockFile);

    expect(PDFDocument.load).toHaveBeenCalled();
    expect(flattenPDF).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(Blob);
  });

  it('should fallback to flattenPDF if pdf-lib fails', async () => {
    PDFDocument.load.mockRejectedValue(new Error('Corrupted'));
    flattenPDF.mockResolvedValue(new Blob(['flattened'], { type: 'application/pdf' }));

    const result = await repairPDF(mockFile);

    expect(PDFDocument.load).toHaveBeenCalled();
    expect(flattenPDF).toHaveBeenCalledWith(mockFile);
    expect(result).toBeInstanceOf(Blob);
  });

  it('should throw error if both fail', async () => {
    PDFDocument.load.mockRejectedValue(new Error('Corrupted'));
    flattenPDF.mockRejectedValue(new Error('Flatten failed'));

    await expect(repairPDF(mockFile)).rejects.toThrow('Failed to repair PDF');
  });
});
