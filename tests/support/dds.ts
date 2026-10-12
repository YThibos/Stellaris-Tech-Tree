/** Builds tiny DDS textures in the two layouts the game's icons use. */

const HEADER_SIZE = 128;

export function uncompressedBgraDds(
  width: number,
  height: number,
  bgra: [number, number, number, number],
): Buffer {
  const header = ddsHeader(width, height);
  header.writeUInt32LE(0x41, 80);
  header.writeUInt32LE(32, 88);
  header.writeUInt32LE(0x00ff0000, 92);
  header.writeUInt32LE(0x0000ff00, 96);
  header.writeUInt32LE(0x000000ff, 100);
  header.writeUInt32LE(0xff000000, 104);
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) pixels.set(bgra, index);
  return Buffer.concat([header, pixels]);
}

/** One 4x4 DXT1 block filled with pure red. */
export function redDxt1Dds(): Buffer {
  const header = ddsHeader(4, 4);
  header.writeUInt32LE(0x4, 80);
  header.write('DXT1', 84, 'ascii');
  const block = Buffer.alloc(8);
  block.writeUInt16LE(0xf800, 0);
  block.writeUInt16LE(0xf800, 2);
  return Buffer.concat([header, block]);
}

function ddsHeader(width: number, height: number): Buffer {
  const header = Buffer.alloc(HEADER_SIZE);
  header.write('DDS ', 0, 'ascii');
  header.writeUInt32LE(124, 4);
  header.writeUInt32LE(height, 12);
  header.writeUInt32LE(width, 16);
  header.writeUInt32LE(32, 76);
  return header;
}

/** An uncompressed texture of any bit layout, every pixel set to the same raw value. */
export function maskedDds(
  width: number,
  height: number,
  layout: { bitCount: number; flags: number; masks: [number, number, number, number] },
  pixel: number,
): Buffer {
  const header = ddsHeader(width, height);
  header.writeUInt32LE(layout.flags, 80);
  header.writeUInt32LE(layout.bitCount, 88);
  layout.masks.forEach((mask, index) => header.writeUInt32LE(mask, 92 + index * 4));
  const bytes = layout.bitCount / 8;
  const pixels = Buffer.alloc(width * height * bytes);
  for (let offset = 0; offset < pixels.length; offset += bytes)
    pixels.writeUIntLE(pixel, offset, bytes);
  return Buffer.concat([header, pixels]);
}
