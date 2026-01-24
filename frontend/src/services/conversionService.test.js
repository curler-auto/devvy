
// Mock pdfjs-dist
jest.mock('pdfjs-dist', () => ({
    __esModule: true,
    GlobalWorkerOptions: {
        workerSrc: '',
    },
    getDocument: jest.fn(),
}));

// Mock html2pdf.js
jest.mock('html2pdf.js', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});

// Mock xlsx
jest.mock('xlsx', () => {
    const mockRead = jest.fn();
    const mockUtils = {
        sheet_to_html: jest.fn().mockReturnValue('<table></table>'),
        book_new: jest.fn(),
        aoa_to_sheet: jest.fn(),
        book_append_sheet: jest.fn(),
        write: jest.fn(),
    };
    return {
        __esModule: true,
        read: mockRead,
        utils: mockUtils,
        default: { read: mockRead, utils: mockUtils }
    };
});

// Mock other dependencies
jest.mock('pptxgenjs', () => jest.fn());
jest.mock('docx', () => ({}));
jest.mock('jszip', () => jest.fn());
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
}));

// Mock jspdf
jest.mock('jspdf', () => ({
    jsPDF: jest.fn(),
}));

import { convertWordToPDF, convertExcelToPDF, convertHTMLToPDF } from './conversionService';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';

describe('conversionService', () => {
    let mockWorker;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup html2pdf mock
        mockWorker = {
            set: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            output: jest.fn().mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' })),
        };
        // html2pdf is the default export mock function
        html2pdf.mockReturnValue(mockWorker);

        // Setup xlsx mock
        XLSX.read.mockReturnValue({
            SheetNames: ['Sheet1'],
            Sheets: { 'Sheet1': {} }
        });
    });

  describe('convertWordToPDF', () => {
    it('should convert word to pdf successfully', async () => {
      const file = new File(['dummy'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10));
      mammoth.convertToHtml.mockResolvedValue({ value: '<p>Hello</p>' });

      const result = await convertWordToPDF(file);

      expect(mammoth.convertToHtml).toHaveBeenCalled();
      expect(html2pdf).toHaveBeenCalled();
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('convertExcelToPDF', () => {
      it('should convert excel to pdf successfully', async () => {
          const file = new File(['dummy'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10));

          const result = await convertExcelToPDF(file);

          expect(html2pdf).toHaveBeenCalled();
          expect(result).toBeInstanceOf(Blob);
      });
  });

  describe('convertHTMLToPDF', () => {
      it('should convert html string to pdf successfully', async () => {
          const content = '<div>Hello</div>';

          const result = await convertHTMLToPDF(content);

          expect(html2pdf).toHaveBeenCalled();
          expect(result).toBeInstanceOf(Blob);
      });
  });
});
