/**
 * Downscale an image file and return it as bare base64, ready to be posted.
 *
 * Screenshots are sent inside the request body rather than uploaded to Storage,
 * so their size is the request's size: a raw 4MB phone screenshot becomes ~5.3MB
 * once base64 inflates it by a third. Capping the long edge and re-encoding as
 * JPEG brings a typical screenshot to a couple of hundred KB while leaving it
 * perfectly readable, which is all a bug report needs.
 *
 * There is no image-processing dependency in this app and this does not add one —
 * a canvas does the whole job.
 */

/** Long-edge cap. Above this, detail is wasted on a screenshot of a UI. */
const MAX_EDGE = 1600;
const QUALITY = 0.7;

export type EncodedImage = {
  filename: string;
  contentType: 'image/jpeg';
  /** Base64 **without** the `data:` prefix — the API wants the payload only. */
  data: string;
};

export class ImageEncodeError extends Error {}

function scaledSize(width: number, height: number): [number, number] {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) return [width, height];
  const ratio = MAX_EDGE / longest;
  return [Math.round(width * ratio), Math.round(height * ratio)];
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageEncodeError('could not decode image'));
    };
    img.src = url;
  });
}

/** Swap the extension for `.jpg`, since the canvas always re-encodes to JPEG. */
function jpegName(name: string): string {
  const base = (name.replace(/\\/g, '/').split('/').pop() ?? 'screenshot').trim();
  const stem = base.replace(/\.[^.]+$/, '') || 'screenshot';
  return `${stem}.jpg`;
}

export async function imageToBase64(file: File): Promise<EncodedImage> {
  if (!file.type.startsWith('image/')) {
    throw new ImageEncodeError('not an image');
  }

  const img = await loadImage(file);
  const [width, height] = scaledSize(img.naturalWidth, img.naturalHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageEncodeError('canvas unavailable');
  // Screenshots are frequently PNGs with transparency; JPEG has none, and without
  // this they composite onto black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
  const data = dataUrl.split(',')[1];
  if (!data) throw new ImageEncodeError('encoding produced no data');

  return { filename: jpegName(file.name), contentType: 'image/jpeg', data };
}
