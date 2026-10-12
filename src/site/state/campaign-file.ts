import type { Campaign } from '../../domain/campaign.ts';

const FILE_KIND = 'stellaris-tech-tree-campaign';
const FILE_VERSION = 1;

/** A campaign written out so it can move to another browser or device. */
export function campaignToFile(campaign: Campaign): string {
  return JSON.stringify({ kind: FILE_KIND, version: FILE_VERSION, campaign }, null, 1);
}

export function campaignFromFile(text: string): Campaign {
  const file = JSON.parse(text) as { kind?: string; campaign?: Partial<Campaign> };
  const campaign = file.campaign;
  if (file.kind !== FILE_KIND || !campaign || typeof campaign.name !== 'string') {
    throw new Error('This is not a campaign file saved by the Stellaris Tech Tree.');
  }
  return { id: newCampaignId(), name: campaign.name, researched: levelsOf(campaign.researched) };
}

export function newCampaignId(): string {
  return crypto.randomUUID();
}

function levelsOf(researched: unknown): Record<string, number> {
  if (typeof researched !== 'object' || researched === null) return {};
  return Object.fromEntries(
    Object.entries(researched).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0,
    ),
  );
}
