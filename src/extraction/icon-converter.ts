import decodeDxt from 'decode-dxt';
import sharp from 'sharp';

const HEADER_SIZE = 128;
const DX10_HEADER_SIZE = 20;
const PIXEL_FORMAT_HAS_FOURCC = 0x4;

/** DX10 texture formats the game's icons use, by the block-compression family they belong to. */
const DXGI_FORMATS: Record<number, string> = {
  71: 'dxt1',
  72: 'dxt1',
  74: 'dxt3',
  75: 'dxt3',
  77: 'dxt5',
  78: 'dxt5',
};

const DXGI_UNCOMPRESSED_BGRA = new Set([87, 91]);
const DXGI_UNCOMPRESSED_RGBA = new Set([28, 29]);

interface Texture {
  width: number;
  height: number;
  rgba: Uint8Array;
}

/** Converts one of the game's DDS textures into a WebP image for the browser. */
export async function ddsToWebp(dds: Buffer): Promise<Buffer> {
  const texture = decodeTexture(dds);
  return sharp(texture.rgba, { raw: { width: texture.width, height: texture.height, channels: 4 } })
    .webp({ quality: 82 })
    .toBuffer();
}

function decodeTexture(dds: Buffer): Texture {
  const view = new DataView(dds.buffer, dds.byteOffset, dds.byteLength);
  if (view.getUint32(0, true) !== 0x20534444) throw new Error('Not a DDS texture.');
  const height = view.getUint32(12, true);
  const width = view.getUint32(16, true);
  const fourCC = String.fromCharCode(...dds.subarray(84, 88));
  const hasFourCC = (view.getUint32(80, true) & PIXEL_FORMAT_HAS_FOURCC) !== 0;
  if (hasFourCC && fourCC === 'DX10') return decodeDx10(dds, view, width, height);
  if (hasFourCC) return compressed(dds, width, height, HEADER_SIZE, fourCC.toLowerCase());
  return uncompressed(dds, view, width, height);
}

function decodeDx10(dds: Buffer, view: DataView, width: number, height: number): Texture {
  const format = view.getUint32(HEADER_SIZE, true);
  const offset = HEADER_SIZE + DX10_HEADER_SIZE;
  const family = DXGI_FORMATS[format];
  if (family) return compressed(dds, width, height, offset, family);
  if (DXGI_UNCOMPRESSED_BGRA.has(format))
    return swapRedAndBlue(slice(dds, offset, width, height), width, height);
  if (DXGI_UNCOMPRESSED_RGBA.has(format))
    return { width, height, rgba: slice(dds, offset, width, height) };
  throw new Error(`Unsupported DX10 texture format ${format}.`);
}

function compressed(
  dds: Buffer,
  width: number,
  height: number,
  offset: number,
  format: string,
): Texture {
  const data = new DataView(dds.buffer, dds.byteOffset + offset, dds.byteLength - offset);
  return { width, height, rgba: decodeDxt(data, width, height, format) };
}

/** Plain 32-bit pixels, in whichever channel order the header's bit masks declare. */
function uncompressed(dds: Buffer, view: DataView, width: number, height: number): Texture {
  const bitCount = view.getUint32(88, true);
  if (bitCount !== 32) throw new Error(`Unsupported ${bitCount}-bit uncompressed texture.`);
  const redMask = view.getUint32(92, true);
  const alphaMask = view.getUint32(104, true);
  const pixels = slice(dds, HEADER_SIZE, width, height);
  if (alphaMask === 0) makeOpaque(pixels);
  return redMask === 0x00ff0000
    ? swapRedAndBlue(pixels, width, height)
    : { width, height, rgba: pixels };
}

/** A texture without an alpha channel leaves that byte unused; it must not read as transparent. */
function makeOpaque(pixels: Uint8Array): void {
  for (let index = 3; index < pixels.length; index += 4) pixels[index] = 255;
}

function slice(dds: Buffer, offset: number, width: number, height: number): Uint8Array {
  return new Uint8Array(dds.subarray(offset, offset + width * height * 4));
}

function swapRedAndBlue(pixels: Uint8Array, width: number, height: number): Texture {
  const rgba = new Uint8Array(pixels);
  for (let index = 0; index < rgba.length; index += 4) {
    rgba[index] = pixels[index + 2] ?? 0;
    rgba[index + 2] = pixels[index] ?? 0;
  }
  return { width, height, rgba };
}
