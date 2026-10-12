import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { maskedDds, redDxt1Dds, uncompressedBgraDds } from '../../tests/support/dds.ts';
import { textureToWebp } from './icon-converter.ts';

const RGB = 0x40;
const ALPHA = 0x1;
const LUMINANCE = 0x20000;

async function firstPixel(dds: Buffer): Promise<number[]> {
  const webp = await textureToWebp(dds);
  const { data } = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return [...data.subarray(0, 4)];
}

function closeTo(actual: number[], expected: number[]): void {
  actual.forEach((value, index) =>
    expect(Math.abs(value - (expected[index] ?? 0))).toBeLessThan(10),
  );
}

describe('textureToWebp', () => {
  it('reads 32-bit BGRA textures', async () => {
    closeTo(await firstPixel(uncompressedBgraDds(4, 4, [0, 0, 255, 255])), [255, 0, 0, 255]);
  });

  it('reads 24-bit textures without alpha as opaque', async () => {
    const layout = {
      bitCount: 24,
      flags: RGB,
      masks: [0xff0000, 0xff00, 0xff, 0] as [number, number, number, number],
    };
    closeTo(await firstPixel(maskedDds(4, 4, layout, 0x00ff00)), [0, 255, 0, 255]);
  });

  it('reads 16-bit 5-6-5 textures', async () => {
    const layout = {
      bitCount: 16,
      flags: RGB,
      masks: [0xf800, 0x07e0, 0x001f, 0] as [number, number, number, number],
    };
    closeTo(await firstPixel(maskedDds(4, 4, layout, 0x001f)), [0, 0, 255, 255]);
  });

  it('reads greyscale textures with alpha', async () => {
    const layout = {
      bitCount: 16,
      flags: LUMINANCE | ALPHA,
      masks: [0xff, 0, 0, 0xff00] as [number, number, number, number],
    };
    closeTo(await firstPixel(maskedDds(4, 4, layout, 0xff80)), [128, 128, 128, 255]);
  });

  it('reads PNG images that a mod ships under a .dds name', async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 4, background: '#00ff00' } })
      .png()
      .toBuffer();
    closeTo(await firstPixel(png), [0, 255, 0, 255]);
  });

  it('reads DXT1 compressed textures', async () => {
    closeTo(await firstPixel(redDxt1Dds()), [255, 0, 0, 255]);
  });
});
