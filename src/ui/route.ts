import { useEffect, useState } from 'react';

/**
 * Where the app is, kept in the address's hash so it works on any static host, survives a
 * reload and goes back with the browser's Back button.
 *   #/                      the provider list
 *   #/p/<id>                one provider
 *   #/p/<id>/edit, #/new    the provider form
 *   #/labels                labels and facets
 */
export type Route =
  { page: 'list' } | { page: 'provider'; id: string } | { page: 'edit'; id: string } | { page: 'new' } | { page: 'labels' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  if (parts[0] === 'labels') return { page: 'labels' };
  if (parts[0] === 'new') return { page: 'new' };
  if (parts[0] === 'p' && parts[1]) return parts[2] === 'edit' ? { page: 'edit', id: parts[1] } : { page: 'provider', id: parts[1] };
  return { page: 'list' };
}

export function href(route: Route): string {
  switch (route.page) {
    case 'list':
      return '#/';
    case 'labels':
      return '#/labels';
    case 'new':
      return '#/new';
    case 'provider':
      return `#/p/${encodeURIComponent(route.id)}`;
    case 'edit':
      return `#/p/${encodeURIComponent(route.id)}/edit`;
  }
}

export function go(route: Route) {
  location.hash = href(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
