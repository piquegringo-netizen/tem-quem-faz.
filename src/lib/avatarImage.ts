export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_INPUT_MAX_BYTES = 10 * 1024 * 1024;
export const AVATAR_MAX_DIMENSION = 500;

export interface PreparedAvatar {
  blob: Blob;
  path: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('resize-failed'));
    }, 'image/jpeg', 0.8);
  });
}

/**
 * Compresses any photo in the browser: square-crops to max 500x500 and
 * re-encodes as JPEG (quality 80%), which brings camera photos down to a
 * few hundred KB. Only errors if the ORIGINAL is over 10MB (unreadable)
 * or the COMPRESSED result still exceeds 2MB (practically never).
 */
export async function prepareAvatar(file: File): Promise<PreparedAvatar> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Use uma foto no formato JPG, PNG ou WebP.');
  }
  if (file.size > AVATAR_INPUT_MAX_BYTES) {
    throw new Error('A foto é muito grande. O máximo é 10MB.');
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('Não foi possível ler a imagem. Tente outra foto.');
  }

  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const target = Math.min(side, AVATAR_MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Não foi possível redimensionar a foto.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, target, target);
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
  bitmap.close();

  const blob = await canvasToBlob(canvas);
  if (blob.size > AVATAR_MAX_BYTES) {
    throw new Error('A foto continua muito grande mesmo comprimida. Tente outra.');
  }

  const path = `${crypto.randomUUID()}.jpg`;
  return { blob, path };
}
