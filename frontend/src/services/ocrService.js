import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { jsPDF } from 'jspdf';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const performOCR = async (
  file,
  onProgress
) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    // Use navigator.hardwareConcurrency if available, default to 4
    const CONCURRENCY = Math.min(navigator.hardwareConcurrency || 4, 4);
    const workerCount = Math.min(totalPages, CONCURRENCY);

    // Initialize workers
    const createWorker = async () => {
        // Note: You might need to configure worker paths for Tesseract.js depending on deployment
        // Default CDN is usually fine
        return await Tesseract.createWorker('eng', 1, {
            logger: () => {}, // Silence logger
            workerPath: '/tesseract/worker.min.js',
            corePath: '/tesseract/tesseract-core.wasm.js',
            langPath: '/tesseract/'
        });
    };

    const workers = await Promise.all(Array(workerCount).fill(0).map(() => createWorker()));

    // Queue of page indices to process
    const queue = Array.from({ length: totalPages }, (_, i) => i + 1);
    const results = new Array(totalPages);
    let completedCount = 0;

    // Worker task function
    const runWorker = async (worker) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context unavailable');

        while (queue.length > 0) {
            const pageIndex = queue.shift();
            if (pageIndex === undefined) break;

            // Render page (Just-In-Time to save memory)
            const page = await pdf.getPage(pageIndex);
            const scale = 2.0;
            const viewport = page.getViewport({ scale: scale });

            // Reuse canvas
            if (canvas.width !== viewport.width || canvas.height !== viewport.height) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
            } else {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            // Use canvas.toBlob instead of toDataURL to avoid blocking the main thread
            const blob = await new Promise((resolve, reject) => {
              canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error('Canvas to Blob failed'));
              }, 'image/png');
            });

            // Convert blob to base64 asynchronously for PDF generation later
            const base64Data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            // Perform OCR using the blob
            const result = await worker.recognize(blob);

            // Store result
            results[pageIndex - 1] = {
                imageData: base64Data,
                widthPt: viewport.width / scale,
                heightPt: viewport.height / scale,
                lines: result.data?.lines || [],
                pageIndex
            };

            completedCount++;
            onProgress && onProgress((completedCount / totalPages) * 100);
        }
    };

    // Run workers in parallel
    await Promise.all(workers.map(w => runWorker(w)));

    // Terminate workers
    await Promise.all(workers.map(w => w.terminate()));

    // Create PDF sequentially
    let doc = null;

    for (const res of results) {
      if (!res) continue;

      if (!doc) {
        doc = new jsPDF({ unit: 'pt', format: [res.widthPt, res.heightPt] });
      } else {
        doc.addPage([res.widthPt, res.heightPt]);
      }

      // Add image (fit to page)
      doc.addImage(res.imageData, 'PNG', 0, 0, res.widthPt, res.heightPt);

      // Add invisible text for searchability
      const scale = 2.0;

      for (const line of res.lines) {
          const x = line.bbox.x0 / scale;
          const y = line.bbox.y1 / scale;
          const h = (line.bbox.y1 - line.bbox.y0) / scale;

          doc.setFontSize(h);
          doc.setTextColor(255, 255, 255);
          doc.text(line.text, x, y, { renderingMode: 'invisible' });
      }
    }

    if (!doc) throw new Error("Document creation failed");
    return doc.output('blob');
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
