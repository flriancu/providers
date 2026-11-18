import { describe, expect, it } from 'vitest';
import { NO_LABEL } from '../../src/domain/filter';
import { href, parseRoute, steadyRoute } from '../../src/ui/route';

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

describe('hostile addresses', () => {
  it('reads filters named after built-in properties as plain values', () => {
    const { selection } = parseRoute('#/?f=__proto__~x&f=constructor~y&f=toString~z').query;
    expect(Object.keys(selection)).toEqual(['__proto__', 'constructor', 'toString']);
    expect(Object.hasOwn(selection, '__proto__') && selection['__proto__']).toEqual(['x']);
  });

  it('keeps a malformed escape as typed instead of failing', () => {
    expect(parseRoute('#/p/%')).toMatchObject({ page: 'provider', id: '%' });
    expect(parseRoute('#/p/%E0%A4%A/edit')).toMatchObject({ page: 'edit', id: '%E0%A4%A' });
  });
});

describe('a route that changes only in part', () => {
  it('keeps the same filters object while only the search changes, and the same route for the same address', () => {
    const before = parseRoute('#/?f=facet-area~l1&q=fo');
    const typed = steadyRoute(before, parseRoute('#/?f=facet-area~l1&q=fot'));
    expect(typed.query.q).toBe('fot');
    expect(typed.query.selection).toBe(before.query.selection);
    expect(steadyRoute(before, parseRoute('#/?f=facet-area~l1&q=fo'))).toBe(before);
    const opened = steadyRoute(before, parseRoute('#/p/x?f=facet-area~l1&q=fo'));
    expect(opened).toMatchObject({ page: 'provider', id: 'x' });
    expect(opened.query).toBe(before.query);
    expect(steadyRoute(before, parseRoute('#/?f=facet-area~l2&q=fo')).query.selection).toEqual({ 'facet-area': ['l2'] });
  });
});
