import { RESEARCH_AREAS, type ResearchArea } from '../../domain/research-area.ts';
import type { TechTree, TreeColumn } from '../../domain/tech-tree.ts';
import type { Technology } from '../../domain/technology.ts';

/** Cards per sub-column before a tier column widens to another sub-column. */
const CARDS_PER_SUB_COLUMN = 16;
const MAX_SUB_COLUMNS = 4;

export interface BoardLayout {
  columns: BoardColumn[];
  bands: Band[];
}

export interface BoardColumn {
  id: string;
  column: TreeColumn;
}

export interface Band {
  area: ResearchArea;
  cells: Cell[];
}

export interface Cell {
  columnId: string;
  groups: CategoryGroup[];
}

export interface CategoryGroup {
  category: string;
  technologies: Technology[];
}

export function layoutBoard(tree: TechTree): BoardLayout {
  const columns = tree.columns().map(boardColumn);
  const bands = RESEARCH_AREAS.map((area) => ({
    area,
    cells: columns.map((column) => cellOf(tree, area, column)),
  }));
  return { columns, bands };
}

export function columnId(column: TreeColumn): string {
  return column.kind === 'repeatable' ? 'repeatable' : `tier-${column.tier}`;
}

/** How many cards wide a column must be to keep its fullest cell at a comfortable height. */
export function subColumnsFor(fullestCellSize: number): number {
  const needed = Math.ceil(fullestCellSize / CARDS_PER_SUB_COLUMN);
  return Math.min(MAX_SUB_COLUMNS, Math.max(1, needed));
}

function boardColumn(column: TreeColumn): BoardColumn {
  return { id: columnId(column), column };
}

function cellOf(tree: TechTree, area: ResearchArea, column: BoardColumn): Cell {
  return { columnId: column.id, groups: groupByCategory(tree.technologiesIn(area, column.column)) };
}

function groupByCategory(technologies: Technology[]): CategoryGroup[] {
  const groups = new Map<string, Technology[]>();
  for (const technology of technologies) {
    groups.set(technology.category, [...(groups.get(technology.category) ?? []), technology]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, members]) => ({ category, technologies: byName(members) }));
}

function byName(technologies: Technology[]): Technology[] {
  return [...technologies].sort((left, right) => left.name.localeCompare(right.name));
}
