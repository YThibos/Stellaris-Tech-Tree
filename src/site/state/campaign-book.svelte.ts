import type { Campaign } from '../../domain/campaign.ts';
import type { TechnologyKey } from '../../domain/technology.ts';
import { newCampaignId } from './campaign-file.ts';

const STORAGE_KEY = 'stellaris-tech-tree:campaigns';

interface StoredBook {
  activeId: string | null;
  campaigns: Campaign[];
}

/**
 * The player's campaigns, kept in this browser only. Storage can be unavailable, in a private
 * window for example; the book then still works for the visit and simply is not remembered.
 */
export class CampaignBook {
  campaigns = $state<Campaign[]>([]);
  activeId = $state<string | null>(null);
  hideResearched = $state(false);
  readonly active: Campaign | null;

  constructor() {
    const stored = readStoredBook();
    this.campaigns = stored.campaigns;
    this.activeId = stored.activeId;
    this.active = $derived(this.campaigns.find(({ id }) => id === this.activeId) ?? null);
  }

  create(name: string, researched: Record<TechnologyKey, number> = {}): Campaign {
    return this.add({ id: newCampaignId(), name, researched });
  }

  /** Adds a campaign from a file or save, replacing the research of one with the same name. */
  adopt(incoming: Campaign): Campaign {
    const existing = this.campaigns.find(({ name }) => name === incoming.name);
    if (!existing) return this.add(incoming);
    this.replace({ ...existing, researched: incoming.researched });
    this.select(existing.id);
    return existing;
  }

  select(id: string | null): void {
    this.activeId = id;
    this.save();
  }

  rename(id: string, name: string): void {
    const campaign = this.campaigns.find((each) => each.id === id);
    if (campaign && name.trim()) this.replace({ ...campaign, name: name.trim() });
  }

  remove(id: string): void {
    this.campaigns = this.campaigns.filter((campaign) => campaign.id !== id);
    if (this.activeId === id) this.activeId = this.campaigns[0]?.id ?? null;
    this.save();
  }

  /** Applies a change to the active campaign's research. */
  updateActive(change: (campaign: Campaign) => Campaign): void {
    if (this.active) this.replace(change(this.active));
  }

  private add(campaign: Campaign): Campaign {
    this.campaigns = [...this.campaigns, campaign];
    this.select(campaign.id);
    return campaign;
  }

  private replace(campaign: Campaign): void {
    this.campaigns = this.campaigns.map((each) => (each.id === campaign.id ? campaign : each));
    this.save();
  }

  private save(): void {
    const book: StoredBook = { activeId: this.activeId, campaigns: this.campaigns };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
    } catch {
      // Without storage the campaigns last for this visit only.
    }
  }
}

function readStoredBook(): StoredBook {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as StoredBook | null;
    return stored && Array.isArray(stored.campaigns) ? stored : { activeId: null, campaigns: [] };
  } catch {
    return { activeId: null, campaigns: [] };
  }
}
