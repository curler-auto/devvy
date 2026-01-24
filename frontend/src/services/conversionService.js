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
    const html2pdf = await import('html2pdf.js').then(module => module.default);
    const opt = {
      margin: 10,
      filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, logging: false, windowWidth: 800 },
      jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
    };

    return await html2pdf().set(opt).from(element).output('blob');
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
    const html2pdf = await import('html2pdf.js').then(module => module.default);
    const opt = {
        margin: 10,
        filename: 'spreadsheet.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: false, windowWidth: 1000 },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'landscape' }
    };

    return await html2pdf().set(opt).from(element).output('blob');
  } finally {
    document.body.removeChild(element);
  }
};

const getSlideRels = async (zip, slideNum) => {
    const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relsXml = await zip.file(relsPath)?.async("string");
    const rels = new Map();
    if (relsXml) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(relsXml, "application/xml");
        const relationships = xmlDoc.getElementsByTagName("Relationship");
        for (let i = 0; i < relationships.length; i++) {
            const id = relationships[i].getAttribute("Id");
            const target = relationships[i].getAttribute("Target");
            if (id && target) {
                rels.set(id, target);
            }
        }
    }
    return rels;
};

const getSlideSize = async (zip) => {
    const xmlStr = await zip.file("ppt/presentation.xml")?.async("string");
    if (xmlStr) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlStr, "application/xml");
        const sldSz = xmlDoc.getElementsByTagName("p:sldSz")[0];
        if (sldSz) {
            const width = parseInt(sldSz.getAttribute("cx")) / 12700;
            const height = parseInt(sldSz.getAttribute("cy")) / 12700;
            return { width, height };
        }
    }
    return { width: 841.89, height: 595.28 }; // Default A4 Landscape
};

export const convertPPTToPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const { width, height } = await getSlideSize(zip);
  const pdf = new jsPDF({
      orientation: width > height ? 'l' : 'p',
      unit: 'pt',
      format: [width, height]
  });

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
      if (i > 0) pdf.addPage([width, height], width > height ? 'l' : 'p');

      const slideNum = slideFiles[i].num;
      const xmlStr = await zip.file(slideFiles[i].name)?.async("string");
      if (!xmlStr) continue;

      const rels = await getSlideRels(zip, slideNum);
      const xmlDoc = parser.parseFromString(xmlStr, "application/xml");

      // Render Images
      const pics = xmlDoc.getElementsByTagName("p:pic");
      for (let j = 0; j < pics.length; j++) {
          const pic = pics[j];
          const blip = pic.getElementsByTagName("a:blip")[0];
          const xfrm = pic.getElementsByTagName("a:xfrm")[0];

          if (blip && xfrm) {
              const embedId = blip.getAttribute("r:embed");
              const off = xfrm.getElementsByTagName("a:off")[0];
              const ext = xfrm.getElementsByTagName("a:ext")[0];

              if (embedId && off && ext) {
                  const target = rels.get(embedId);
                  if (target) {
                      let imagePath = target;
                      if (imagePath.startsWith('../')) {
                          imagePath = 'ppt/' + imagePath.substring(3);
                      } else {
                          // Handle cases where target is relative to slide but not using ..
                          // e.g. "media/image1.png" -> ppt/slides/media/image1.png ? No, usually rels are consistent.
                          // But sometimes they are "media/image1.png" relative to "ppt/slides/" -> "ppt/slides/media/..."
                          // Standard structure puts media in "ppt/media".
                          // If target is "media/image1.png", it might mean "ppt/media" if we are in root, but we are in ppt/slides.
                          // Safe bet: check if file exists, otherwise try ppt/media prefix.
                          if (!zip.file(imagePath) && !imagePath.startsWith('ppt/')) {
                              imagePath = 'ppt/' + imagePath;
                          }
                      }

                      const imgFile = zip.file(imagePath);
                      if (imgFile) {
                          const imgData = await imgFile.async("uint8array");
                          const extName = imagePath.split('.').pop().toLowerCase();
                          let format = 'JPEG';
                          if (extName === 'png') format = 'PNG';
                          else if (extName === 'gif') format = 'GIF';
                          else if (extName === 'webp') format = 'WEBP';

                           const x = parseInt(off.getAttribute("x")) / 12700;
                           const y = parseInt(off.getAttribute("y")) / 12700;
                           const w = parseInt(ext.getAttribute("cx")) / 12700;
                           const h = parseInt(ext.getAttribute("cy")) / 12700;

                           try {
                               pdf.addImage(imgData, format, x, y, w, h);
                           } catch (e) {
                               console.warn("Failed to add image", imagePath, e);
                           }
                      }
                  }
              }
          }
      }

      // Render Text (Shapes)
      const shapes = xmlDoc.getElementsByTagName("p:sp");
      for(let k=0; k<shapes.length; k++) {
          const sp = shapes[k];
          const txBody = sp.getElementsByTagName("p:txBody")[0];
          if(txBody) {
             const xfrm = sp.getElementsByTagName("a:xfrm")[0];
             let x=50, y=50; // w=500;
             if(xfrm) {
                 const off = xfrm.getElementsByTagName("a:off")[0];
                 // const ext = xfrm.getElementsByTagName("a:ext")[0];
                 if(off) {
                     x = parseInt(off.getAttribute("x")) / 12700;
                     y = parseInt(off.getAttribute("y")) / 12700;
                 }
                 // if(ext) { w = parseInt(ext.getAttribute("cx")) / 12700; }
             }

             const paragraphs = txBody.getElementsByTagName("a:p");
             let currentY = y;

             for(let p=0; p<paragraphs.length; p++) {
                 const runs = paragraphs[p].getElementsByTagName("a:r");
                 let paraText = "";
                 for(let r=0; r<runs.length; r++) {
                     const t = runs[r].getElementsByTagName("a:t")[0];
                     if(t) paraText += t.textContent;
                 }

                 if(paraText.trim()) {
                     pdf.setFontSize(12);
                     pdf.text(paraText, x, currentY + 12);
                     currentY += 14;
                 }
             }
          }
      }

      // Fallback for text only if no shapes processed (unlikely if p:sp covers all text boxes)
      // But keeping it minimal or removing it to avoid duplication.
      // p:sp should cover standard text boxes.
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

                  let format = 'JPEG';
                  if (file.type === 'image/png') format = 'PNG';
                  else if (file.type === 'image/webp') format = 'WEBP';
                  else if (file.name.toLowerCase().endsWith('.png')) format = 'PNG';

                  pdf.addImage(imgData, format, 0, 0, width, height);
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
    let htmlContent = content;
    if (content instanceof File) {
        htmlContent = await content.text();
    }

    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.width = '800px';
    element.style.background = 'white';

    document.body.appendChild(element);

    try {
        const html2pdf = await import('html2pdf.js').then(module => module.default);
        const opt = {
          margin: 10,
          filename: 'document.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, logging: false, windowWidth: 800 },
          jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
        };
        return await html2pdf().set(opt).from(element).output('blob');
    } finally {
        document.body.removeChild(element);
    }
};
