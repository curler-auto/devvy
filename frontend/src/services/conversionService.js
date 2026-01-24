import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const getPDFDocument = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  return await loadingTask.promise;
};

const getConcurrencyLimit = () => {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return Math.min(navigator.hardwareConcurrency * 2, 16);
  }
  return 4;
};

const processPagesInBatches = async (
  pdf,
  concurrency,
  processPage
) => {
  const results = new Array(pdf.numPages);
  const executing = new Set();

  for (let i = 1; i <= pdf.numPages; i++) {
    const p = processPage(i).then((res) => {
      results[i - 1] = res;
    });

    const wrapper = p.then(() => {
      executing.delete(wrapper);
    });

    executing.add(wrapper);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
};

const extractRowsFromPage = async (page) => {
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const len = textContent.items.length;

    const xs = new Float32Array(len);
    const ys = new Float32Array(len);
    const indices = new Uint32Array(len);
    const strs = new Array(len);

    for (let i = 0; i < len; i++) {
        const item = textContent.items[i];
        const tx = item.transform;
        if (!tx) continue;
        xs[i] = tx[4];
        ys[i] = viewport.height - tx[5];
        strs[i] = item.str;
        indices[i] = i;
    }

    indices.sort((a, b) => ys[a] - ys[b]);

    const TOLERANCE = 5;
    const rows = [];

    let currentRow = [];
    let currentY = -1;
    let isRowSorted = true;
    let lastX = -Infinity;

    if (len > 0) {
        currentRow.push(indices[0]);
        currentY = ys[indices[0]];
        lastX = xs[indices[0]];

        for (let i = 1; i < len; i++) {
            const idx = indices[i];
            const itemY = ys[idx];
            const itemX = xs[idx];

            if (Math.abs(itemY - currentY) <= TOLERANCE) {
                 if (isRowSorted) {
                     if (itemX < lastX) {
                        isRowSorted = false;
                     } else {
                        lastX = itemX;
                     }
                 }
                 currentRow.push(idx);
            } else {
                 if (!isRowSorted) {
                    currentRow.sort((a, b) => xs[a] - xs[b]);
                 }
                 rows.push(currentRow.map(k => strs[k]));
                 currentRow = [idx];
                 currentY = itemY;
                 lastX = itemX;
                 isRowSorted = true;
            }
        }
        if (!isRowSorted) {
            currentRow.sort((a, b) => xs[a] - xs[b]);
        }
        rows.push(currentRow.map(k => strs[k]));
    }

    return rows;
};

export const convertPDFToExcel = async (file) => {
  const pdf = await getPDFDocument(file);
  const wb = XLSX.utils.book_new();

  const processPage = async (pageNum) => {
    const page = await pdf.getPage(pageNum);
    const rows = await extractRowsFromPage(page);
    return rows;
  };

  const allPageRows = await processPagesInBatches(pdf, getConcurrencyLimit(), processPage);

  allPageRows.forEach((sheetData, index) => {
    const pageNum = index + 1;
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, `Page ${pageNum}`);
  });

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const convertPDFToPPT = async (file) => {
  const pdf = await getPDFDocument(file);
  const pptx = new PptxGenJS();

  const processPage = async (pageNum) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    return { viewport, textContent };
  };

  const pagesData = await processPagesInBatches(pdf, getConcurrencyLimit(), processPage);

  pagesData.forEach(({ viewport, textContent }) => {
    const slide = pptx.addSlide();

    for (const item of textContent.items) {
      const tx = item.transform;
      if (!tx) continue;
      const x = tx[4];
      const y = viewport.height - tx[5];

      const xPct = (x / viewport.width) * 100;
      const yPct = (y / viewport.height) * 100;

      const str = item.str.trim();
      if (!str) continue;

      slide.addText(str, {
        x: `${xPct}%`,
        y: `${yPct}%`,
        w: 'auto',
        h: 'auto',
        fontSize: 12,
        color: '000000'
      });
    }
  });

  const blob = await pptx.write({ outputType: 'blob' });
  return blob;
};

export const convertPDFToWord = async (file) => {
  const pdf = await getPDFDocument(file);

  const processPage = async (pageNum) => {
    const page = await pdf.getPage(pageNum);
    const rows = await extractRowsFromPage(page);
    return rows.map(row => row.join(' '));
  };

  const allPageRows = await processPagesInBatches(pdf, getConcurrencyLimit(), processPage);

  const allChildren = [];

  allPageRows.forEach((rows) => {
    rows.forEach(text => {
      if (text.trim()) {
        allChildren.push(new Paragraph({
          children: [new TextRun(text)],
          spacing: { after: 200 }
        }));
      }
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: allChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
};

export const convertWordToPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  const element = document.createElement('div');
  element.innerHTML = html;
  element.style.width = '800px';
  element.style.padding = '20px';
  element.style.background = 'white';
  document.body.appendChild(element);

  try {
    const pdf = new jsPDF('p', 'pt', 'a4');
    await new Promise((resolve) => {
      pdf.html(element, {
        callback: () => resolve(),
        x: 10,
        y: 10,
        width: 575,
        windowWidth: 800
      });
    });

    return pdf.output('blob');
  } finally {
    document.body.removeChild(element);
  }
};

export const convertExcelToPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  let fullHtml = '';

  wb.SheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(ws);
      fullHtml += `<h2>${sheetName}</h2>${html}<br/><hr/><br/>`;
  });

  const element = document.createElement('div');
  element.innerHTML = fullHtml;
  element.style.width = '1000px';
  element.style.padding = '20px';
  element.style.background = 'white';
  const style = document.createElement('style');
  style.innerHTML = 'table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ddd; padding: 8px; }';
  element.appendChild(style);

  document.body.appendChild(element);

  try {
    const pdf = new jsPDF('l', 'pt', 'a4');
    await new Promise((resolve) => {
      pdf.html(element, {
        callback: () => resolve(),
        x: 10,
        y: 10,
        width: 820,
        windowWidth: 1000
      });
    });

    return pdf.output('blob');
  } finally {
    document.body.removeChild(element);
  }
};

export const convertPPTToPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const pdf = new jsPDF('l', 'pt', 'a4');

  const slideFilesData = [];
  const prefix = 'ppt/slides/slide';
  const suffix = '.xml';
  const prefixLen = prefix.length;
  const suffixLen = suffix.length;

  zip.forEach((relativePath, zipEntry) => {
    const name = zipEntry.name;
    if (name.startsWith(prefix) && name.endsWith(suffix)) {
      const numStr = name.slice(prefixLen, -suffixLen);
      if (numStr.length > 0) {
        const num = Number(numStr);
        if (!isNaN(num)) {
          slideFilesData.push({
            name,
            num
          });
        }
      }
    }
  });

  const slideFiles = slideFilesData.sort((a, b) => a.num - b.num);

  if (slideFiles.length === 0) {
      throw new Error("No slides found in this PowerPoint file.");
  }

  const parser = new DOMParser();

  for (let i = 0; i < slideFiles.length; i++) {
      if (i > 0) pdf.addPage();

      const xmlStr = await zip.file(slideFiles[i].name)?.async("string");
      if (!xmlStr) continue;

      const xmlDoc = parser.parseFromString(xmlStr, "application/xml");
      const textNodes = xmlDoc.getElementsByTagName("a:t");

      let yPos = 50;
      pdf.setFontSize(14);
      pdf.text(`Slide ${i + 1}`, 40, 30);
      pdf.setFontSize(12);

      for (let j = 0; j < textNodes.length; j++) {
          const text = textNodes[j].textContent || "";
          if (text.trim()) {
             const splitText = pdf.splitTextToSize(text, 750);
             pdf.text(splitText, 50, yPos);
             yPos += (15 * splitText.length);
             if (yPos > 550) {
                 pdf.addPage();
                 yPos = 50;
             }
          }
      }
  }

  return pdf.output('blob');
};

export const convertImageToPDF = async (file) => {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          if (event.target?.result) {
              const imgData = event.target.result;

              const img = new Image();
              img.src = imgData;
              img.onload = () => {
                  const width = img.width;
                  const height = img.height;

                  const pdf = new jsPDF({
                      orientation: width > height ? 'l' : 'p',
                      unit: 'pt',
                      format: [width, height]
                  });

                  pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
                  resolve(pdf.output('blob'));
              };
              img.onerror = (e) => reject(e);
          }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
  });
};

export const convertHTMLToPDF = async (content) => {
    const element = document.createElement('div');
    element.innerHTML = content;
    element.style.width = '800px';
    element.style.background = 'white';

    document.body.appendChild(element);

    try {
        const pdf = new jsPDF('p', 'pt', 'a4');
        await new Promise((resolve) => {
            pdf.html(element, {
                callback: () => resolve(),
                x: 10,
                y: 10,
                width: 575,
                windowWidth: 800
            });
        });
        return pdf.output('blob');
    } finally {
        document.body.removeChild(element);
    }
};
