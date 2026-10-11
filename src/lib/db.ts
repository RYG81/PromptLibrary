import { useSyncExternalStore } from "react";
import { initialState, seedPrompts, SEED_COLLECTIONS } from "./seed";
import { META_PROMPTS, type MetaPrompt } from "./metaprompts";
import { CATEGORIES, type AppState, type Collection, type MediaType, type Prompt, type PromptDraft, type Settings } from "./types";
import { uid } from "./utils";

const STORAGE_KEY = "promptlibrary.db.v1";
const META_KEY = "promptlibrary.meta.v1";
const PREF_KEY = "promptlibrary.prefs.v1";

/* ------------------------------------------------------------------ *
 * A tiny JSON "database": one object, serialised into localStorage.  *
 * Swap `read`/`write` for fetch() calls and the UI keeps working.    *
 * ------------------------------------------------------------------ */

function canUseStorage(): boolean {
  try {
    const k = "__pf_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** One-time rename migration: carries v1-era data over to the new keys. */
const LEGACY_KEYS: [string, string][] = [
  ["promptforge.db.v1", STORAGE_KEY],
  ["promptforge.meta.v1", META_KEY],
  ["promptforge.prefs.v1", PREF_KEY],
];

function migrateLegacyKeys() {
  if (!canUseStorage()) return;
  try {
    for (const [from, to] of LEGACY_KEYS) {
      const value = window.localStorage.getItem(from);
      if (value !== null && window.localStorage.getItem(to) === null) {
        window.localStorage.setItem(to, value);
      }
      if (value !== null) window.localStorage.removeItem(from);
    }
  } catch {
    /* ignore */
  }
}

function read(): AppState {
  if (!canUseStorage()) return initialState();
  try {
    migrateLegacyKeys();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as AppState;
    return normalise(parsed, true);
  } catch {
    return initialState();
  }
}

function normalise(input: Partial<AppState> | null | undefined, migrateStarter = false): AppState {
  const base = initialState();
  if (!input) return base;
  const known: Set<string> = new Set<string>(CATEGORIES);
  let prompts = Array.isArray(input.prompts)
    ? input.prompts.filter((p) => p && typeof p.prompt === "string").map((p) => ({
        ...emptyPrompt(),
        ...p,
        tags: Array.isArray(p.tags) ? p.tags : [],
        resources: Array.isArray(p.resources) ? p.resources : [],
        media: (p.media === "video" ? "video" : "image") as MediaType,
        category: p.category && known.has(p.category) ? (p.category as string) : "Cinematic",
        source: p.source ?? (String(p.id ?? "").startsWith("seed_") ? "starter" : "custom"),
        safetyRating: p.safetyRating ?? "PG",
        isNsfw: Boolean(p.isNsfw),
      }))
    : seedPrompts();
  // Existing browsers receive the new starter pack once, without resurrecting
  // seed prompts the user deletes after this versioned migration.
  if (migrateStarter && (input.version ?? 1) < 2 && prompts.some((p) => p.id.startsWith("seed_"))) {
    const existing = new Set(prompts.map((p) => p.id));
    prompts = [...prompts, ...seedPrompts().filter((p) => !existing.has(p.id))];
  }
  const collections = Array.isArray(input.collections) && input.collections.length
    ? input.collections
    : SEED_COLLECTIONS;
  return {
    version: 2,
    prompts,
    collections,
    settings: { ...base.settings, ...(input.settings ?? {}) },
    history: Array.isArray(input.history) ? input.history.slice(0, 60) : [],
  };
}

export function emptyPrompt(): Prompt {
  const t = Date.now();
  return {
    id: uid(),
    title: "Untitled prompt",
    prompt: "",
    negative: "",
    model: "Flux 1.1 Pro",
    media: "image",
    category: "Portrait",
    tags: [],
    collectionId: null,
    aspectRatio: "1:1",
    seed: "",
    notes: "",
    favorite: false,
    image: null,
    uses: 0,
    createdAt: t,
    updatedAt: t,
    source: "custom",
    safetyRating: "PG",
    isNsfw: false,
    resources: [],
  };
}

function write(state: AppState) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full — drop images first, then retry once.
    try {
      const lite: AppState = {
        ...state,
        prompts: state.prompts.map((p) => ({ ...p, image: null })),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lite));
    } catch {
      /* give up silently */
    }
  }
}

let state: AppState = read();
const listeners = new Set<() => void>();

function commit(next: AppState) {
  state = next;
  write(state);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDB(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function getSnapshot(): AppState {
  return state;
}

/** Read the current state outside of React (event handlers, non-hook modules). */
export const getState = getSnapshot;

/* ----------------------------- actions ----------------------------- */

export const db = {
  upsertPrompt(draft: PromptDraft): Prompt {
    const existing = draft.id ? state.prompts.find((p) => p.id === draft.id) : undefined;
    let saved: Prompt;
    if (existing) {
      saved = { ...existing, ...draft, id: existing.id, updatedAt: Date.now() } as Prompt;
      commit({
        ...state,
        prompts: state.prompts.map((p) => (p.id === saved.id ? saved : p)),
      });
    } else {
      const base = emptyPrompt();
      saved = { ...base, ...draft, id: base.id, createdAt: Date.now(), updatedAt: Date.now() } as Prompt;
      commit({ ...state, prompts: [saved, ...state.prompts] });
    }
    return saved;
  },

  /** Add externally sourced prompts while preventing duplicate imports. */
  importPrompts(drafts: PromptDraft[]): { added: number; skipped: number } {
    const existingKeys = new Set(
      state.prompts
        .filter((p) => p.sourceId || p.sourceUrl)
        .map((p) => `${p.source ?? ""}:${p.sourceId ?? p.sourceUrl}`),
    );
    const titlePromptKeys = new Set(state.prompts.map((p) => `${p.title.trim().toLowerCase()}|${p.prompt.trim()}`));
    const added: Prompt[] = [];
    let skipped = 0;
    for (const draft of drafts) {
      const identity = draft.sourceId || draft.sourceUrl
        ? `${draft.source ?? ""}:${draft.sourceId ?? draft.sourceUrl}`
        : "";
      const textKey = `${(draft.title ?? "").trim().toLowerCase()}|${(draft.prompt ?? "").trim()}`;
      if (!draft.prompt?.trim() || (identity && existingKeys.has(identity)) || titlePromptKeys.has(textKey)) {
        skipped++;
        continue;
      }
      const base = emptyPrompt();
      const saved = {
        ...base,
        ...draft,
        id: uid(),
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        resources: Array.isArray(draft.resources) ? draft.resources : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Prompt;
      added.push(saved);
      if (identity) existingKeys.add(identity);
      titlePromptKeys.add(textKey);
    }
    if (added.length) commit({ ...state, prompts: [...added, ...state.prompts] });
    return { added: added.length, skipped };
  },

  patchPrompt(id: string, patch: PromptDraft) {
    commit({
      ...state,
      prompts: state.prompts.map((p) =>
        p.id === id ? ({ ...p, ...patch, id, updatedAt: Date.now() } as Prompt) : p,
      ),
    });
  },

  deletePrompt(id: string) {
    commit({ ...state, prompts: state.prompts.filter((p) => p.id !== id) });
  },

  duplicatePrompt(id: string): Prompt | undefined {
    const src = state.prompts.find((p) => p.id === id);
    if (!src) return undefined;
    const copy: Prompt = {
      ...src,
      id: uid(),
      title: `${src.title} (copy)`,
      uses: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    commit({ ...state, prompts: [copy, ...state.prompts] });
    return copy;
  },

  toggleFavorite(id: string) {
    const p = state.prompts.find((x) => x.id === id);
    if (!p) return;
    db.patchPrompt(id, { favorite: !p.favorite });
  },

  registerUse(id: string, finalText?: string) {
    const p = state.prompts.find((x) => x.id === id);
    if (p) {
      commit({
        ...state,
        prompts: state.prompts.map((x) => (x.id === id ? { ...x, uses: x.uses + 1 } : x)),
        history: [{ id, text: finalText ?? p.prompt, at: Date.now() }, ...state.history].slice(0, 60),
      });
    } else if (finalText) {
      commit({ ...state, history: [{ id: "adhoc", text: finalText, at: Date.now() }, ...state.history].slice(0, 60) });
    }
  },

  clearHistory() {
    commit({ ...state, history: [] });
  },

  addCollection(name: string, emoji = "📁"): Collection {
    const col: Collection = { id: uid("col"), name: name.trim() || "New collection", emoji };
    commit({ ...state, collections: [...state.collections, col] });
    return col;
  },

  updateCollection(id: string, patch: Partial<Collection>) {
    commit({
      ...state,
      collections: state.collections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  },

  deleteCollection(id: string) {
    commit({
      ...state,
      collections: state.collections.filter((c) => c.id !== id),
      prompts: state.prompts.map((p) => (p.collectionId === id ? { ...p, collectionId: null } : p)),
    });
  },

  updateSettings(patch: Partial<Settings>) {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  },

  /** Merge an imported JSON payload; keeps existing items on id collision. */
  importJSON(payload: unknown, mode: "merge" | "replace" = "merge"): { prompts: number; collections: number } {
    const incoming = normalise(payload as Partial<AppState>);
    if (mode === "replace") {
      commit({ ...incoming, version: 2 });
      return { prompts: incoming.prompts.length, collections: incoming.collections.length };
    }
    const colById = new Map(state.collections.map((c) => [c.id, c]));
    const collections = [...state.collections];
    for (const c of incoming.collections) {
      if (!colById.has(c.id)) {
        collections.push(c);
        colById.set(c.id, c);
      }
    }
    const byId = new Set(state.prompts.map((p) => p.id));
    const added = incoming.prompts
      .filter((p) => !byId.has(p.id))
      .map((p) => ({ ...p, id: uid(), createdAt: p.createdAt || Date.now(), updatedAt: Date.now() }));
    const newCollections = collections.length - state.collections.length;
    commit({ ...state, collections, prompts: [...added, ...state.prompts] });
    return { prompts: added.length, collections: newCollections };
  },

  exportJSON(): string {
    return JSON.stringify(state, null, 2);
  },

  loadSeed() {
    commit(initialState());
  },

  wipe() {
    commit({ version: 2, prompts: [], collections: SEED_COLLECTIONS, settings: state.settings, history: [] });
  },
};

/* ══════════════════════════════════════════════════════════════
   META-PROMPT STORE — a second JSON document, same pattern.
   Holds the LLM system prompts that write prompts.
   ══════════════════════════════════════════════════════════════ */

function readMeta(): MetaPrompt[] {
  if (!canUseStorage()) return META_PROMPTS;
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (!raw) return META_PROMPTS;
    const parsed = JSON.parse(raw) as MetaPrompt[];
    if (!Array.isArray(parsed) || !parsed.length) return META_PROMPTS;
    // keep built-ins fresh from source, layer user edits + customs on top
    const user = parsed.filter((m) => m && !m.builtIn);
    const edited = new Map(
      parsed.filter((m) => m && m.builtIn).map((m) => [m.id, m]),
    );
    const builtIns = META_PROMPTS.map((b) => edited.get(b.id) ?? b);
    return [...builtIns, ...user];
  } catch {
    return META_PROMPTS;
  }
}

function writeMeta(list: MetaPrompt[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

let metaState: MetaPrompt[] = readMeta();
const metaListeners = new Set<() => void>();

function commitMeta(next: MetaPrompt[]) {
  metaState = next;
  writeMeta(next);
  metaListeners.forEach((l) => l());
}

export function useMeta(): MetaPrompt[] {
  const sub = (l: () => void) => {
    metaListeners.add(l);
    return () => {
      metaListeners.delete(l);
    };
  };
  return useSyncExternalStore(sub, () => metaState, () => metaState);
}

export const metaDb = {
  upsert(draft: MetaPrompt): MetaPrompt {
    const i = metaState.findIndex((m) => m.id === draft.id);
    if (i >= 0) {
      const next = [...metaState];
      next[i] = draft;
      commitMeta(next);
    } else {
      commitMeta([...metaState, draft]);
    }
    return draft;
  },
  remove(id: string) {
    commitMeta(metaState.filter((m) => m.id !== id));
  },
  duplicate(id: string): MetaPrompt | undefined {
    const src = metaState.find((m) => m.id === id);
    if (!src) return undefined;
    const copy: MetaPrompt = { ...src, id: uid("meta"), name: `${src.name} (copy)`, builtIn: false };
    commitMeta([...metaState, copy]);
    return copy;
  },
  reset() {
    commitMeta(META_PROMPTS);
  },
};

/* ══════════════════════════════════════════════════════════════
   UI PREFERENCES — persisted scalars (rail collapse, layout…)
   ══════════════════════════════════════════════════════════════ */

export type Prefs = { rail: boolean; layout: "grid" | "list" };

function readPrefs(): Prefs {
  const fallback: Prefs = { rail: false, layout: "grid" };
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Prefs>) } : fallback;
  } catch {
    return fallback;
  }
}

let prefState: Prefs = readPrefs();
const prefListeners = new Set<() => void>();

export function usePrefs(): Prefs {
  const sub = (l: () => void) => {
    prefListeners.add(l);
    return () => {
      prefListeners.delete(l);
    };
  };
  return useSyncExternalStore(sub, () => prefState, () => prefState);
}

export function setPref(patch: Partial<Prefs>) {
  prefState = { ...prefState, ...patch };
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify(prefState));
    } catch {
      /* ignore */
    }
  }
  prefListeners.forEach((l) => l());
}
