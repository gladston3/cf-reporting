import { describe, it, expect } from 'vitest';

import { getTemplate, listTemplates } from '@/lib/reports/registry';

describe('report registry', () => {
  it('returns traffic-overview template by id', () => {
    const tpl = getTemplate('traffic-overview');
    expect(tpl).toBeDefined();
    expect(tpl!.id).toBe('traffic-overview');
    expect(tpl!.name).toBe('Traffic Overview');
  });

  it('returns undefined for unknown template id', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });

  it('listTemplates returns all registered templates', () => {
    const all = listTemplates();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((t) => t.id === 'traffic-overview')).toBe(true);
  });

  it('each template has required fields', () => {
    for (const tpl of listTemplates()) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.description).toBeTruthy();
      expect(typeof tpl.generate).toBe('function');
    }
  });
});
