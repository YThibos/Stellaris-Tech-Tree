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

/**
 * Uncompressed pixels of 8 to 32 bits, laid out however the header's channel bit masks declare,
 * including greyscale textures that store a single luminance channel.
 */
function uncompressed(dds: Buffer, view: DataView, width: number, height: number): Texture {
  const layout = pixelLayoutOf(view);
  const bytesPerPixel = layout.bitCount / 8;
  if (![1, 2, 3, 4].includes(bytesPerPixel)) {
    throw new Error(`Unsupported ${layout.bitCount}-bit uncompressed texture.`);
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    const value = readPixel(dds, HEADER_SIZE + pixel * bytesPerPixel, bytesPerPixel);
    rgba.set(colourOf(value, layout), pixel * 4);
  }
  return { width, height, rgba };
}

interface PixelLayout {
  bitCount: number;
  red: number;
  green: number;
  blue: number;
  alpha: number;
  luminance: boolean;
}

const PIXEL_FORMAT_HAS_ALPHA = 0x1;
const PIXEL_FORMAT_LUMINANCE = 0x20000;

function pixelLayoutOf(view: DataView): PixelLayout {
  const flags = view.getUint32(80, true);
  return {
    bitCount: view.getUint32(88, true),
    red: view.getUint32(92, true),
    green: view.getUint32(96, true),
    blue: view.getUint32(100, true),
    alpha: flags & PIXEL_FORMAT_HAS_ALPHA ? view.getUint32(104, true) : 0,
    luminance: (flags & PIXEL_FORMAT_LUMINANCE) !== 0,
  };
}

function readPixel(dds: Buffer, offset: number, bytes: number): number {
  let value = 0;
  for (let byte = bytes - 1; byte >= 0; byte--) value = value * 256 + (dds[offset + byte] ?? 0);
  return value;
}

/** A channel missing from the texture reads as full: opaque alpha, or grey from luminance. */
function colourOf(value: number, layout: PixelLayout): [number, number, number, number] {
  const red = channel(value, layout.red);
  const alpha = layout.alpha ? channel(value, layout.alpha) : 255;
  if (layout.luminance) return [red, red, red, alpha];
  return [red, channel(value, layout.green), channel(value, layout.blue), alpha];
}

/** Extracts the bits a mask selects and scales them to the 0 to 255 range. */
function channel(value: number, mask: number): number {
  if (mask === 0) return 0;
  const shift = Math.log2(mask & -mask);
  const maximum = mask / 2 ** shift;
  return Math.round(((Math.floor(value / 2 ** shift) & maximum) * 255) / maximum);
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
