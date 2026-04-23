import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Concept } from "../types";
import {
  fetchConcepts,
  addConceptApi,
  updateConceptApi,
  deleteConceptApi,
  hasApiUrl,
} from "../api";

// LocalStorage fallback key (used only when Google Sheets is not configured)
const LOCAL_KEY = "study-prep-concepts-local";

function loadLocal(): Concept[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocal(concepts: Concept[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(concepts));
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function useConcepts() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiEnabled = hasApiUrl();
  const mountedRef = useRef(true);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    loadConcepts();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  async function loadConcepts() {
    setLoading(true);
    setError(null);
    try {
      if (hasApiUrl()) {
        const data = await fetchConcepts();
        if (mountedRef.current) setConcepts(data);
      } else {
        if (mountedRef.current) setConcepts(loadLocal());
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || "Failed to load concepts");
        // Fallback to local
        setConcepts(loadLocal());
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  // Refresh when API URL changes
  const refresh = useCallback(async () => {
    await loadConcepts();
  }, []);

  const addConcept = useCallback(
    async (title: string, description: string) => {
      const newId = crypto.randomUUID();
      const learnedDate = todayStr();
      const optimistic: Concept = {
        id: newId,
        title,
        description,
        learnedDate,
        recapDay3Done: false,
        recapDay7Done: false,
      };

      // Optimistic update
      setConcepts((prev) => [optimistic, ...prev]);

      if (hasApiUrl()) {
        setSyncing(true);
        try {
          const created = await addConceptApi(title, description, learnedDate);
          // Replace optimistic with server version
          setConcepts((prev) => prev.map((c) => (c.id === newId ? created : c)));
        } catch (err: any) {
          setError(err.message || "Failed to add concept");
          // Remove optimistic on failure
          setConcepts((prev) => prev.filter((c) => c.id !== newId));
        } finally {
          setSyncing(false);
        }
      } else {
        // Local fallback
        saveLocal([optimistic, ...loadLocal()]);
      }
    },
    []
  );

  const markRecapDone = useCallback(
    async (id: string) => {
      // Determine which recap to mark
      const concept = concepts.find((c) => c.id === id);
      if (!concept) return;

      const learned = new Date(concept.learnedDate + "T00:00:00");
      const today = new Date(todayStr() + "T00:00:00");
      const diffDays = Math.floor(
        (today.getTime() - learned.getTime()) / (1000 * 60 * 60 * 24)
      );

      let field: "recapDay3Done" | "recapDay7Done" | null = null;
      if (diffDays >= 3 && !concept.recapDay3Done) {
        field = "recapDay3Done";
      } else if (diffDays >= 7 && !concept.recapDay7Done) {
        field = "recapDay7Done";
      }
      if (!field) return;

      // Optimistic update
      setConcepts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, [field!]: true } : c))
      );

      if (hasApiUrl()) {
        setSyncing(true);
        try {
          await updateConceptApi(id, field, true);
        } catch (err: any) {
          setError(err.message || "Failed to update concept");
          // Revert
          setConcepts((prev) =>
            prev.map((c) => (c.id === id ? { ...c, [field!]: false } : c))
          );
        } finally {
          setSyncing(false);
        }
      } else {
        const local = loadLocal();
        saveLocal(
          local.map((c) => (c.id === id ? { ...c, [field!]: true } : c))
        );
      }
    },
    [concepts]
  );

  const deleteConcept = useCallback(
    async (id: string) => {
      const snapshot = concepts.find((c) => c.id === id);
      setConcepts((prev) => prev.filter((c) => c.id !== id));

      if (hasApiUrl()) {
        setSyncing(true);
        try {
          await deleteConceptApi(id);
        } catch (err: any) {
          setError(err.message || "Failed to delete concept");
          // Revert
          if (snapshot) {
            setConcepts((prev) => [snapshot, ...prev]);
          }
        } finally {
          setSyncing(false);
        }
      } else {
        saveLocal(loadLocal().filter((c) => c.id !== id));
      }
    },
    [concepts]
  );

  // Today's concepts
  const todaysConcepts = useMemo(
    () => concepts.filter((c) => c.learnedDate === todayStr()),
    [concepts]
  );

  // Recap concepts
  const recapConcepts = useMemo(() => {
    const today = new Date(todayStr() + "T00:00:00");
    return concepts.filter((c) => {
      const learned = new Date(c.learnedDate + "T00:00:00");
      const diffDays = Math.floor(
        (today.getTime() - learned.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays >= 3 && !c.recapDay3Done) return true;
      if (diffDays >= 7 && !c.recapDay7Done) return true;
      return false;
    });
  }, [concepts]);

  // Completed
  const completedConcepts = useMemo(
    () =>
      concepts.filter(
        (c) => c.learnedDate !== todayStr() && c.recapDay3Done && c.recapDay7Done
      ),
    [concepts]
  );

  return {
    concepts,
    todaysConcepts,
    recapConcepts,
    completedConcepts,
    addConcept,
    markRecapDone,
    deleteConcept,
    todayStr,
    daysAgo,
    formatDate,
    loading,
    syncing,
    error,
    refresh,
    apiEnabled,
  };
}
