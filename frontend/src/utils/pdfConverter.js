import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const convertPdfToImages = async (file, format, onProgress) => {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      const zip = new JSZip();

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const ext = format === 'png' ? 'png' : 'jpg';

        const blob = await new Promise(resolveBlob => canvas.toBlob(resolveBlob, mimeType, 0.9));
        zip.file(`page_${i}.${ext}`, blob);

        if (onProgress) {
          onProgress((i / totalPages) * 100);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      resolve(content);
    } catch (error) {
      console.error("PDF to Image conversion error:", error);
      reject(error);
    }
  });
};
