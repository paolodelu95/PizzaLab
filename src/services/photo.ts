/**
 * Foto della pizza per il diario: ridotta e compressa sul telefono, resta nell’archivio locale
 * insieme alla ricetta (nessun caricamento online). Circa 50–80 KB a foto.
 */
export const PHOTO_SIZE = 720;

export async function compressPhoto(file: File, size = PHOTO_SIZE, quality = 0.72): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image"));
      img.src = url;
    });
    const scale = Math.min(1, size / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
