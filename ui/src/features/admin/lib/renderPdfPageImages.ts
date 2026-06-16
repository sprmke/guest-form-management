import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

/** Render PDF bytes to PNG data URLs (no browser PDF viewer chrome). */
export async function renderPdfBytesToPageImages(
  bytes: Uint8Array,
  scale = 1.75,
): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const images: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not create canvas context');
      }
      await page.render({ canvasContext: context, viewport }).promise;
      images.push(canvas.toDataURL('image/png'));
    }
  } finally {
    await pdf.destroy();
  }

  return images;
}
