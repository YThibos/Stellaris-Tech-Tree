const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;
const STORED = 0;
const DEFLATED = 8;

/**
 * Reads one file out of a zip archive, as Stellaris saves are. Only what a save needs is
 * supported: stored or deflated entries, without encryption or zip64.
 */
export async function readZipEntry(archive: Uint8Array, name: string): Promise<Uint8Array> {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const entry = findEntry(archive, view, name);
  if (!entry) throw new Error(`The archive has no ${name} file.`);
  const nameLength = view.getUint16(entry.localHeader + 26, true);
  const extraLength = view.getUint16(entry.localHeader + 28, true);
  const start = entry.localHeader + 30 + nameLength + extraLength;
  const data = archive.subarray(start, start + entry.compressedSize);
  if (entry.method === STORED) return data;
  if (entry.method === DEFLATED) return inflate(data);
  throw new Error(`The ${name} file uses an unsupported compression method.`);
}

interface DirectoryEntry {
  method: number;
  compressedSize: number;
  localHeader: number;
}

function findEntry(archive: Uint8Array, view: DataView, name: string): DirectoryEntry | undefined {
  const end = endOfDirectory(view);
  let offset = view.getUint32(end + 16, true);
  const count = view.getUint16(end + 10, true);
  for (let index = 0; index < count; index++) {
    if (view.getUint32(offset, true) !== DIRECTORY_ENTRY) break;
    const nameLength = view.getUint16(offset + 28, true);
    const entryName = new TextDecoder().decode(
      archive.subarray(offset + 46, offset + 46 + nameLength),
    );
    if (entryName === name) {
      return {
        method: view.getUint16(offset + 10, true),
        compressedSize: view.getUint32(offset + 20, true),
        localHeader: view.getUint32(offset + 42, true),
      };
    }
    offset +=
      46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
  }
  return undefined;
}

function endOfDirectory(view: DataView): number {
  for (let offset = view.byteLength - 22; offset >= 0; offset--) {
    if (view.getUint32(offset, true) === END_OF_DIRECTORY) return offset;
  }
  throw new Error('This file is not a zip archive, so it is not a Stellaris save.');
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([new Uint8Array(data)])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
