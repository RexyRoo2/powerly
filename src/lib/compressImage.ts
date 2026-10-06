/**
 * Client-side only. Downscales and re-encodes an uploaded image before it
 * ever leaves the browser, so a phone photo of a notebook page doesn't blow
 * past the request size a serverless function can accept. Always re-encodes
 * as JPEG — fine for photos of notes/diagrams, which is what this is for;
 * a transparent PNG would get a flattened (white) background, an
 * acceptable tradeoff for predictable, small output.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1280,
  quality = 0.72
): Promise<{ mediaType: "image/jpeg"; base64: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images for upload.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return { mediaType: "image/jpeg", base64 };
}
