import { readSaveResearch } from '../../save/save-research.ts';

/** Reads a save off the page's thread, reporting each stage so the page can show progress. */
self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const research = await readSaveResearch(new Uint8Array(event.data), (stage) =>
      self.postMessage({ kind: 'stage', stage }),
    );
    self.postMessage({ kind: 'done', research });
  } catch (error) {
    self.postMessage({
      kind: 'failed',
      reason: error instanceof Error ? error.message : String(error),
    });
  }
};
