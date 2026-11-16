import { describe, expect, it } from 'vitest';
import { NO_LABEL } from '../../src/domain/filter';
import { href, parseRoute } from '../../src/ui/route';

describe('the address (FR-12)', () => {
  it('reads every page', () => {
    expect(parseRoute('')).toMatchObject({ page: 'list' });
    expect(parseRoute('#/labels')).toMatchObject({ page: 'labels' });
    expect(parseRoute('#/new')).toMatchObject({ page: 'new' });
    expect(parseRoute('#/p/abc')).toMatchObject({ page: 'provider', id: 'abc' });
    expect(parseRoute('#/p/abc/edit')).toMatchObject({ page: 'edit', id: 'abc' });
  });

  it('keeps filters and search across pages, and reads back what it wrote', () => {
    const query = { selection: { 'facet-category': ['l1', NO_LABEL], 'facet-area': ['l2'] }, q: 'grădina foto' };
    const address = href({ page: 'provider', id: 'p1' }, query);
    expect(address.startsWith('#/p/p1?')).toBe(true);
    expect(parseRoute(address)).toEqual({ page: 'provider', id: 'p1', query });
  });

  it('writes nothing extra when nothing is filtered or searched', () => {
    expect(href({ page: 'list' })).toBe('#/');
    expect(href({ page: 'list' }, { selection: { 'facet-area': [] }, q: '  ' })).toBe('#/');
  });

  it('ignores malformed filter values and repeats', () => {
    expect(parseRoute('#/?f=nolabel&f=~x&f=a~&f=a~b&f=a~b').query.selection).toEqual({ a: ['b'] });
  });
});
