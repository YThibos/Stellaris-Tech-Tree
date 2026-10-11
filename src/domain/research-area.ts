export const RESEARCH_AREAS = ['physics', 'society', 'engineering'] as const;

export type ResearchArea = (typeof RESEARCH_AREAS)[number];

export function isResearchArea(value: string): value is ResearchArea {
  return (RESEARCH_AREAS as readonly string[]).includes(value);
}
