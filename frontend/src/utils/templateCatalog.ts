// @ts-nocheck
// Shared in-memory cache for the template catalog. Both /home and the chatbot
// /style picker import this so the catalog is fetched at most once per session
// instead of re-fetching every time a modal/tab opens.

export type Template = { name: string; description: string };

let cache: Template[] | null = null;
let inflight: Promise<Template[]> | null = null;

export function getTemplateCatalog(): Promise<Template[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetch("/templates/catalog.json")
    .then((r) => r.json())
    .then((data: Template[]) => {
      cache = data;
      inflight = null;
      return data;
    })
    .catch((e) => {
      inflight = null;
      throw e;
    });
  return inflight;
}

// Synchronous peek — returns the cached catalog if it's already loaded, else null.
export function getCachedCatalog(): Template[] | null {
  return cache;
}
