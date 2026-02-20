import { trafficOverviewTemplate } from './templates/traffic-overview';
import type { ReportTemplate } from './types';

const templates: Map<string, ReportTemplate> = new Map([
  [trafficOverviewTemplate.id, trafficOverviewTemplate],
]);

export function getTemplate(id: string): ReportTemplate | undefined {
  return templates.get(id);
}

export function listTemplates(): ReportTemplate[] {
  return Array.from(templates.values());
}
