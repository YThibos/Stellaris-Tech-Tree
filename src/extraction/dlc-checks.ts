import { isBlock, type ScriptBlock, type ScriptEntry } from '../script/script-node.ts';

const DIRECT_CHECKS = new Set(['host_has_dlc', 'has_dlc']);

/**
 * Which DLCs a condition cannot hold without. The game checks a DLC directly, as in
 * `host_has_dlc = "Apocalypse"`, or through a named check such as `has_machine_age_dlc = yes`
 * defined in its scripted triggers. Only checks that must hold count: one inside an OR, a NOT or
 * a negated named check leaves another way in, so it requires nothing.
 */
export class DlcChecks {
  private readonly triggers = new Map<string, ScriptBlock>();
  private readonly resolved = new Map<string, string[]>();

  /** Learns the named checks of one scripted triggers file; a later definition replaces an earlier one. */
  learnFrom(file: ScriptBlock): void {
    for (const entry of file.entries)
      if (entry.key && isBlock(entry.value)) this.triggers.set(entry.key, entry.value);
  }

  requiredBy(condition: ScriptBlock): string[] {
    return [...new Set(this.mandatoryEntries(condition).flatMap((entry) => this.dlcsOf(entry)))];
  }

  /** The entries that must all hold: the top level and anything inside an AND. */
  private mandatoryEntries(condition: ScriptBlock): ScriptEntry[] {
    return condition.entries.flatMap((entry) =>
      entry.key === 'AND' && isBlock(entry.value) ? this.mandatoryEntries(entry.value) : [entry],
    );
  }

  private dlcsOf(entry: ScriptEntry): string[] {
    if (entry.key === null || isBlock(entry.value)) return [];
    if (DIRECT_CHECKS.has(entry.key)) return [unquoted(entry.value)];
    return entry.value === 'yes' ? this.dlcsOfTrigger(entry.key) : [];
  }

  private dlcsOfTrigger(name: string): string[] {
    const known = this.resolved.get(name);
    if (known) return known;
    const trigger = this.triggers.get(name);
    if (!trigger) return [];
    this.resolved.set(name, []);
    const dlcs = this.requiredBy(trigger);
    this.resolved.set(name, dlcs);
    return dlcs;
  }
}

function unquoted(value: string): string {
  return value.replace(/^"|"$/g, '');
}
