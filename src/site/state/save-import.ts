import type { SaveReadingStage, SaveResearch } from '../../save/save-research.ts';
import SaveImportWorker from './save-import.worker.ts?worker&inline';

type WorkerMessage =
  | { kind: 'stage'; stage: SaveReadingStage }
  | { kind: 'done'; research: SaveResearch }
  | { kind: 'failed'; reason: string };

/** Reads a save file in the background; it never leaves the player's browser. */
export async function importSave(
  file: File,
  onStage: (stage: SaveReadingStage) => void,
): Promise<SaveResearch> {
  const worker = new SaveImportWorker();
  const bytes = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.kind === 'stage') return onStage(message.stage);
      worker.terminate();
      if (message.kind === 'done') resolve(message.research);
      else reject(new Error(message.reason));
    };
    worker.postMessage(bytes, [bytes]);
  });
}
