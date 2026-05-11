import { useState, useCallback, useEffect, useRef } from 'react';
import type { Concept, ImageAttachment } from './types';
import { today, toInputDate } from './dates';
import { load, save } from './storage';
import * as sheets from './sheets';

export type Backend = 'local' | 'sheets';

type AnyConcept = Partial<Concept> & {
  text?: string;
  recapDay3?: boolean;
  recapDay7?: boolean;
};

const STORAGE_KEY = 'sm-concepts-v2';

function normalise(input: AnyConcept): Concept {
  let images: ImageAttachment[] = [];
  const rawImages = (input as { images?: unknown }).images;
  if (Array.isArray(rawImages)) {
    images = rawImages as ImageAttachment[];
  } else if (typeof rawImages === 'string' && rawImages.trim()) {
    try { images = JSON.parse(rawImages) as ImageAttachment[]; } catch { images = []; }
  }
  return {
    id: String(input.id || crypto.randomUUID()),
    title: String(input.title ?? input.text ?? ''),
    notes: String(input.notes ?? ''),
    images,
    dateAdded: toInputDate(String(input.dateAdded || today())),
    reviewedDay3: Boolean(input.reviewedDay3 ?? input.recapDay3 ?? false),
    reviewedDay7: Boolean(input.reviewedDay7 ?? input.recapDay7 ?? false),
  };
}

export function useConceptStore() {
  const [items, setItems] = useState<Concept[]>(() =>
    load<AnyConcept[]>(STORAGE_KEY, load<AnyConcept[]>('sm-concepts', [])).map(normalise)
  );
  const [backend, setBackend] = useState<Backend>(() => sheets.isConfigured() ? 'sheets' : 'local');
  const [loading, setLoading] = useState(backend === 'sheets');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didBoot = useRef(false);
  const pollInFlight = useRef(false);
  const lastLocalMutation = useRef(0);

  useEffect(() => { save(STORAGE_KEY, items); }, [items]);

  useEffect(() => {
    if (backend !== 'sheets' || didBoot.current) return;
    didBoot.current = true;
    setLoading(true);
    sheets.fetchAll()
      .then(remote => { setItems(remote.map(normalise)); setError(null); })
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load Google Sheets data'))
      .finally(() => setLoading(false));
  }, [backend]);

  const add = useCallback((title: string, notes: string, dateAdded: string, images: ImageAttachment[] = []) => {
    const concept = normalise({ title, notes, images, dateAdded, reviewedDay3: false, reviewedDay7: false });
    lastLocalMutation.current = Date.now();
    setItems(prev => [concept, ...prev]);
    if (backend === 'sheets') sheets.addOne(concept).catch(err => setError(err.message));
  }, [backend]);

  const edit = useCallback((id: string, title: string, notes: string, dateAdded?: string, images?: ImageAttachment[]) => {
    const current = items.find(item => item.id === id);
    const nextDate = dateAdded || current?.dateAdded || today();
    const dateChanged = current ? nextDate !== current.dateAdded : false;
    const nextReviewedDay3 = dateChanged ? false : Boolean(current?.reviewedDay3);
    const nextReviewedDay7 = dateChanged ? false : Boolean(current?.reviewedDay7);

    lastLocalMutation.current = Date.now();
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, title, notes, images: images ?? item.images, dateAdded: nextDate, reviewedDay3: nextReviewedDay3, reviewedDay7: nextReviewedDay7 }
        : item
    ));
    if (backend === 'sheets') {
      sheets.editOne(id, title, notes, images ?? current?.images ?? [], nextDate, nextReviewedDay3, nextReviewedDay7).catch(err => setError(err.message));
    }
  }, [backend, items]);

  const remove = useCallback((id: string) => {
    lastLocalMutation.current = Date.now();
    setItems(prev => prev.filter(item => item.id !== id));
    if (backend === 'sheets') sheets.deleteOne(id).catch(err => setError(err.message));
  }, [backend]);

  const markReview = useCallback((id: string, day: 3 | 7) => {
    lastLocalMutation.current = Date.now();
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return day === 3 ? { ...item, reviewedDay3: true } : { ...item, reviewedDay7: true };
    }));
    if (backend === 'sheets') sheets.markReview(id, day).catch(err => setError(err.message));
  }, [backend]);

  const clear = useCallback(() => {
    lastLocalMutation.current = Date.now();
    setItems([]);
    if (backend === 'sheets') sheets.clearAll().catch(err => setError(err.message));
  }, [backend]);

  const replaceAll = useCallback((next: Concept[]) => {
    setItems(next.map(normalise));
  }, []);

  const sync = useCallback(async () => {
    if (backend !== 'sheets') return;
    setSyncing(true);
    try {
      const remote = await sheets.fetchAll();
      setItems(remote.map(normalise));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [backend]);

  useEffect(() => {
    if (backend !== 'sheets') return;
    const interval = window.setInterval(async () => {
      if (pollInFlight.current) return;
      // Give optimistic writes a short window to reach Apps Script before pulling again.
      if (Date.now() - lastLocalMutation.current < 2500) return;
      pollInFlight.current = true;
      try {
        const remote = await sheets.fetchAll();
        setItems(remote.map(normalise));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auto-sync failed');
      } finally {
        pollInFlight.current = false;
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [backend]);

  const connectSheets = useCallback(async (url: string) => {
    sheets.setUrl(url);
    setBackend('sheets');
    setLoading(true);
    try {
      const remote = await sheets.fetchAll();
      if (remote.length > 0) {
        setItems(remote.map(normalise));
      } else if (items.length > 0) {
        await Promise.all(items.map(item => sheets.addOne(item)));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      didBoot.current = true;
      setLoading(false);
    }
  }, [items]);

  const disconnectSheets = useCallback(() => {
    sheets.clearUrl();
    setBackend('local');
    setError(null);
    didBoot.current = false;
  }, []);

  return {
    items,
    backend,
    loading,
    syncing,
    error,
    add,
    edit,
    remove,
    markReview,
    clear,
    sync,
    replaceAll,
    connectSheets,
    disconnectSheets,
  };
}