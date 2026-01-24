
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

// Mock pptxgenjs
jest.mock('pptxgenjs', () => jest.fn());

// Mock docx
jest.mock('docx', () => ({}));

// Mock jszip
jest.mock('jszip', () => {
    return {
        loadAsync: jest.fn(),
    };
});

// Mock mammoth
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
}));

// Mock jspdf
jest.mock('jspdf', () => {
    const mockJsPDF = jest.fn().mockImplementation(function() {
        this.addImage = jest.fn();
        this.output = jest.fn().mockReturnValue(new Blob(['pdf'], { type: 'application/pdf' }));
        this.addPage = jest.fn();
        this.text = jest.fn();
        this.setFontSize = jest.fn();
        this.splitTextToSize = jest.fn().mockImplementation((text) => [text]);
        this.internal = {
            pageSize: {
                getWidth: jest.fn().mockReturnValue(595),
                getHeight: jest.fn().mockReturnValue(842),
            }
        };
    });
    return {
        __esModule: true,
        default: mockJsPDF,
        jsPDF: mockJsPDF
    };
});

import { convertWordToPDF, convertExcelToPDF, convertHTMLToPDF, convertImageToPDF, convertPPTToPDF } from './conversionService';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

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

      it('should convert html file to pdf successfully', async () => {
          const file = new File(['<div>Hello</div>'], 'test.html', { type: 'text/html' });
          if (!file.text) {
              file.text = jest.fn().mockResolvedValue('<div>Hello</div>');
          } else {
              jest.spyOn(file, 'text').mockResolvedValue('<div>Hello</div>');
          }

          const result = await convertHTMLToPDF(file);

          expect(html2pdf).toHaveBeenCalled();
          expect(result).toBeInstanceOf(Blob);
      });
  });

  describe('convertImageToPDF', () => {
      it.skip('should convert image to pdf successfully', async () => {
          const file = new File(['dummy'], 'test.png', { type: 'image/png' });

          // Mock FileReader
          const mockFileReader = {
              readAsDataURL: jest.fn(),
              onload: null,
              onerror: null,
          };
          window.FileReader = jest.fn(() => mockFileReader);

          // Mock Image
          const mockImage = {
              src: '',
              onload: null,
              onerror: null,
              width: 100,
              height: 100,
          };
          window.Image = jest.fn(() => mockImage);

          const promise = convertImageToPDF(file);

          // Trigger FileReader onload
          setTimeout(() => {
              mockFileReader.onload({ target: { result: 'data:image/png;base64,dummy' } });
              // Trigger Image onload
              setTimeout(() => {
                  mockImage.onload();
              }, 0);
          }, 0);

          const result = await promise;
          expect(result).toBeInstanceOf(Blob);

          const mockPdf = jsPDF.mock.instances[jsPDF.mock.instances.length - 1];
          expect(mockPdf.addImage).toHaveBeenCalledWith(
              expect.anything(),
              'PNG',
              0, 0, 100, 100
          );
      });
  });

  describe('convertPPTToPDF', () => {
      it.skip('should convert ppt to pdf successfully', async () => {
           const file = new File(['dummy'], 'test.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
           file.arrayBuffer = jest.fn().mockResolvedValue(new ArrayBuffer(10));

           const mockZip = {
               file: jest.fn(),
               forEach: jest.fn(),
           };
           JSZip.loadAsync.mockResolvedValue(mockZip);

           // Mock presentation.xml for size
           mockZip.file.mockImplementation((name) => {
               if (name === 'ppt/presentation.xml') {
                   return { async: jest.fn().mockResolvedValue('<p:presentation><p:sldSz cx="914400" cy="685800"/></p:presentation>') };
               }
               if (name === 'ppt/slides/slide1.xml') {
                    return { async: jest.fn().mockResolvedValue('<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Hello PPT</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>') };
               }
               if (name === 'ppt/slides/_rels/slide1.xml.rels') {
                   return { async: jest.fn().mockResolvedValue('<Relationships></Relationships>') };
               }
               return null;
           });

           mockZip.forEach.mockImplementation((callback) => {
               callback('ppt/slides/slide1.xml', { name: 'ppt/slides/slide1.xml' });
           });

           const result = await convertPPTToPDF(file);

           expect(JSZip.loadAsync).toHaveBeenCalled();
           expect(jsPDF).toHaveBeenCalled();
           expect(result).toBeInstanceOf(Blob);

           const mockPdf = jsPDF.mock.instances[jsPDF.mock.instances.length - 1];
           expect(mockPdf.text).toHaveBeenCalledWith(expect.stringContaining('Hello PPT'), expect.any(Number), expect.any(Number));
      });
  });

});
