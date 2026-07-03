import { PDFDocument } from 'pdf-lib';

/** Render an image File to JPEG bytes via a canvas. pdf-lib only embeds JPEG/PNG natively,
 *  so other formats (webp/gif/heic) are converted first. */
async function imageToJpeg(file: File): Promise<Uint8Array> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read image'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) throw new Error('Image conversion failed');
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Merge one or more images into a single PDF, one image per page. Used so a multi-page
 *  photographed lease is uploaded — and later stored as the contract — as one document. */
export async function mergeImagesToPdf(images: File[], fileName = 'lease.pdf'): Promise<File> {
  const pdf = await PDFDocument.create();
  for (const image of images) {
    const type = image.type.toLowerCase();
    let embedded;
    if (type.includes('png')) {
      embedded = await pdf.embedPng(new Uint8Array(await image.arrayBuffer()));
    } else if (type.includes('jpeg') || type.includes('jpg')) {
      embedded = await pdf.embedJpg(new Uint8Array(await image.arrayBuffer()));
    } else {
      embedded = await pdf.embedJpg(await imageToJpeg(image));
    }
    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  }
  const bytes = await pdf.save();
  // `bytes` is a Uint8Array; cast to BlobPart to sidestep the SharedArrayBuffer lib typing.
  return new File([bytes as unknown as BlobPart], fileName, { type: 'application/pdf' });
}
