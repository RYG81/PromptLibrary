import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sidebar, { type View } from "./components/Sidebar";
import PromptCard from "./components/PromptCard";
import PromptEditor from "./components/PromptEditor";
import RunDialog from "./components/RunDialog";
import IdeaLab from "./components/IdeaLab";
import MetaPrompts from "./components/MetaPrompts";
import GalleryImport from "./components/GalleryImport";
import DataPanel from "./components/DataPanel";
import { Button, Chip, Icon, IconButton, Micro, Pill, Popover, Rule, Segmented, ThemeSwitch, ToastProvider } from "./components/ui";
import { emptyPrompt, setPref, useDB, usePrefs } from "./lib/db";
import { CATEGORIES, CATEGORY_EMOJI, IMAGE_MODELS, VIDEO_MODELS, type MediaType, type Prompt } from "./lib/types";
import { cn, tokenCount } from "./lib/utils";
import { ThemeProvider } from "./lib/theme";

type Sort = "updated" | "created" | "title" | "uses" | "tokens";

const SORTS: { key: Sort; label: string }[] = [
  { key: "updated", label: "Last updated" },
  { key: "created", label: "Newest" },
  { key: "title", label: "A–Z" },
  { key: "uses", label: "Most copied" },
  { key: "tokens", label: "Longest" },
];

function Shell() {
  const state = useDB();
  const prefs = usePrefs();
  const searchRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>("library");
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("updated");
  const [drawer, setDrawer] = useState(false);
  const [media, setMedia] = useState<MediaType | "all">("all");
  const [category, setCategory] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [adultVisible, setAdultVisible] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPrompt, setEditorPrompt] = useState<Prompt | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [runPrompt, setRunPrompt] = useState<Prompt | null>(null);

  const layout = prefs.layout;
  const setLayout = (l: "grid" | "list") => setPref({ layout: l });

  const openNew = useCallback(() => {
    const base = emptyPrompt();
    base.model = state.settings.defaultModel;
    base.negative = state.settings.defaultNegative;
    base.media = state.settings.defaultMedia;
    base.collectionId = collection;
    if (category) base.category = category;
    setEditorPrompt(base);
    setIsNew(true);
    setEditorOpen(true);
  }, [state.settings, collection, category]);

  const openEdit = useCallback((p: Prompt) => {
    setEditorPrompt(p);
    setIsNew(false);
    setEditorOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "Escape") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setView("library");
        searchRef.current?.focus();
        return;
      }
      if (typing || editorOpen || runPrompt || drawer) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === "/") {
        e.preventDefault();
        setView("library");
        searchRef.current?.focus();
      } else if (k === "n") {
        e.preventDefault();
        openNew();
      } else if (k === "g") {
        setLayout(layout === "grid" ? "list" : "grid");
      } else if (k === "i") {
        setView((v) => (v === "idea" ? "library" : "idea"));
      } else if (k === "m") {
        setView((v) => (v === "meta" ? "library" : "meta"));
      } else if (k === "[") {
        setPref({ rail: !prefs.rail });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew, editorOpen, runPrompt, drawer, layout, prefs.rail]);

  useEffect(() => {
    const h = () => openNew();
    window.addEventListener("pf:new", h as EventListener);
    return () => window.removeEventListener("pf:new", h as EventListener);
  }, [openNew]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.prompts.filter((p) => {
      if (collection && p.collectionId !== collection) return false;
      if (favoritesOnly && !p.favorite) return false;
      if (tags.length && !tags.every((t) => p.tags.includes(t))) return false;
      if (!adultVisible && (p.isNsfw || ["R", "X", "XXX", "Unrated"].includes(p.safetyRating ?? ""))) return false;
      if (media !== "all" && p.media !== media) return false;
      if (category && p.category !== category) return false;
      if (model && p.model !== model) return false;
      if (!q) return true;
      return [p.title, p.prompt, p.negative, p.notes, p.model, p.tags.join(" "), p.category, p.source, p.sourceAuthor]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case "created": return b.createdAt - a.createdAt;
        case "title": return a.title.localeCompare(b.title);
        case "uses": return b.uses - a.uses;
        case "tokens": return tokenCount(b.prompt) - tokenCount(a.prompt);
        default: return b.updatedAt - a.updatedAt;
      }
    });
  }, [state.prompts, query, collection, tags, favoritesOnly, sort, media, category, model, adultVisible]);

  const activeCollection = state.collections.find((c) => c.id === collection);
  const filtersOn = !!query || !!collection || tags.length > 0 || favoritesOnly || media !== "all" || !!category || !!model;
  const imgCount = state.prompts.filter((p) => p.media === "image").length;
  const vidCount = state.prompts.length - imgCount;

  const clearFilters = () => {
    setQuery(""); setTags([]); setFavoritesOnly(false);
    setCollection(null); setMedia("all"); setCategory(null); setModel(null);
  };

  const toggleAdultVisibility = () => {
    if (adultVisible) {
      setAdultVisible(false);
      setAdultConfirmed(false);
      setRunPrompt(null);
      if (editorPrompt?.isNsfw || ["R", "X", "XXX", "Unrated"].includes(editorPrompt?.safetyRating ?? "")) {
        setEditorOpen(false);
        setEditorPrompt(null);
      }
      return;
    }
    if (!adultConfirmed && !confirm("Show adult-rated prompt text? You must be 18 or older. No images are imported.")) return;
    setAdultConfirmed(true);
    setAdultVisible(true);
  };

  const sidebar = (onClose?: () => void, collapsed = false) => (
    <Sidebar
      state={state}
      view={view}
      setView={setView}
      activeCollection={collection}
      setActiveCollection={setCollection}
      activeTags={tags}
      toggleTag={(t) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))}
      clearFilters={clearFilters}
      favoritesOnly={favoritesOnly}
      setFavoritesOnly={setFavoritesOnly}
      activeCategory={category}
      setActiveCategory={setCategory}
      collapsed={collapsed}
      onToggleCollapse={() => setPref({ rail: !prefs.rail })}
      onClose={onClose}
    />
  );

  return (
    <div className="relative flex min-h-screen">
      <div className="backdrop" />
      <div className="hairglow" />

      {/* sidebar — collapsible */}
      <div className="relative z-20 hidden shrink-0 lg:block" style={{ width: prefs.rail ? 60 : 272 }}>
        <div className="fixed inset-y-0 left-0 transition-[width] duration-200" style={{ width: prefs.rail ? 60 : 272 }}>
          {sidebar(undefined, prefs.rail)}
        </div>
      </div>

      {drawer ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px] animate-[fade_.15s_ease-out]" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-[17rem] animate-[slideIn_.2s_ease-out]">{sidebar(() => setDrawer(false))}</div>
        </div>
      ) : null}

      <main className="relative z-10 flex min-w-0 flex-1 flex-col border-l border-line">
        {view === "meta" ? (
          <>
            <div className="flex items-center gap-2 border-b border-line bg-canvas/85 px-3 py-2 backdrop-blur-xl sm:px-5">
              <IconButton icon="list" label="Menu" className="lg:hidden" onClick={() => setDrawer(true)} />
              <IconButton
                icon={prefs.rail ? "chevronRight" : "arrowLeft"}
                label={prefs.rail ? "Expand sidebar ( [ )" : "Collapse sidebar ( [ )"}
                className="hidden lg:inline-flex"
                onClick={() => setPref({ rail: !prefs.rail })}
              />
              <Micro>Meta prompts</Micro>
              <div className="ml-auto flex items-center gap-1.5">
                <ThemeSwitch />
                <IconButton icon="layers" label="Library" onClick={() => setView("library")} />
              </div>
            </div>
            <div className="h-[calc(100dvh-3.4rem)] min-h-0 flex-1">
              <MetaPrompts />
            </div>
          </>
        ) : view === "import" ? (
          <>
            <div className="flex items-center gap-2 border-b border-line bg-canvas/85 px-3 py-2 backdrop-blur-xl sm:px-5">
              <IconButton icon="list" label="Menu" className="lg:hidden" onClick={() => setDrawer(true)} />
              <IconButton
                icon={prefs.rail ? "chevronRight" : "arrowLeft"}
                label={prefs.rail ? "Expand sidebar ([)" : "Collapse sidebar ([)"}
                className="hidden lg:inline-flex"
                onClick={() => setPref({ rail: !prefs.rail })}
              />
              <Micro>Gallery importer</Micro>
              <div className="ml-auto flex items-center gap-1.5">
                <IconButton
                  icon={adultVisible ? "eye" : "shield"}
                  label={adultVisible ? "Hide adult-rated prompts" : "Show adult-rated prompts"}
                  active={adultVisible}
                  onClick={toggleAdultVisibility}
                />
                <ThemeSwitch />
                <IconButton icon="layers" label="Library" onClick={() => setView("library")} />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <GalleryImport
                showAdult={adultVisible}
                onAdultEnabled={() => {
                  setAdultConfirmed(true);
                  setAdultVisible(true);
                }}
                onOpenLibrary={() => setView("library")}
              />
            </div>
          </>
        ) : (
          <>
            {/* ══════════ toolbar ══════════ */}
            <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-xl">
              <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                <IconButton icon="list" label="Menu" className="lg:hidden" onClick={() => setDrawer(true)} />
                <IconButton
                  icon={prefs.rail ? "chevronRight" : "arrowLeft"}
                  label={prefs.rail ? "Expand sidebar ( [ )" : "Collapse sidebar ( [ )"}
                  className="hidden lg:inline-flex"
                  onClick={() => setPref({ rail: !prefs.rail })}
                />

                <Rule vertical className="hidden lg:block" />

                <div className="group relative flex-1">
                  <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3 transition-colors group-focus-within:text-accent-text dark:group-focus-within:text-accent" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setView("library"); }}
                    placeholder="Search prompts, tags, models, notes…"
                    className="h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-14 text-[13px] text-ink placeholder:text-ink-3 outline-none transition-all hover:border-line-2 focus:border-accent-line focus:ring-[3px] focus:ring-[color:var(--pf-accent-soft)]"
                  />
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                    {query ? (
                      <button onClick={() => setQuery("")} className="rounded p-0.5 text-ink-3 transition hover:text-ink" title="Clear search">
                        <Icon name="x" className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <kbd className="mono hidden rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[9.5px] text-ink-3 sm:block">/</kbd>
                    )}
                  </div>
                </div>

                <Rule vertical className="hidden sm:block" />

                <div className="hidden sm:block"><ThemeSwitch /></div>
                <IconButton icon="wand" label="Meta prompts (M)" onClick={() => setView("meta")} />
                <IconButton icon="download" label="Import from galleries" onClick={() => setView("import")} />
                <IconButton icon="flask" label="Idea Lab (I)" active={view === "idea"} onClick={() => setView(view === "idea" ? "library" : "idea")} />
                <IconButton icon="database" label="Data & backup" active={view === "data"} onClick={() => setView(view === "data" ? "library" : "data")} />
                <IconButton
                  icon={adultVisible ? "eye" : "shield"}
                  label={adultVisible ? "Hide adult-rated prompts" : "Show adult-rated prompts"}
                  active={adultVisible}
                  onClick={toggleAdultVisibility}
                />

                <Rule vertical className="hidden sm:block" />

                <Button variant="primary" size="sm" onClick={openNew} className="hidden sm:inline-flex">
                  <Icon name="plus" className="h-3.5 w-3.5" /> New
                  <kbd className="mono ml-1 rounded border border-white/25 bg-white/10 px-1 text-[9px]">N</kbd>
                </Button>
                <IconButton icon="plus" label="New prompt (N)" variant="primary" className="sm:hidden" onClick={openNew} />
              </div>

              {/* ══════════ filter strip ══════════ */}
              {view === "library" ? (
                <>
                  <div className="flex items-center gap-2 border-t border-line px-3 py-2 sm:px-4">
                    <Segmented
                      value={media}
                      onChange={setMedia}
                      options={[
                        { value: "all", label: "All", count: state.prompts.length },
                        { value: "image", icon: "image", count: imgCount },
                        { value: "video", icon: "video", count: vidCount },
                      ]}
                    />

                    <Popover
                      width="w-80"
                      trigger={({ open, toggle }) => (
                        <button
                          onClick={toggle}
                          className={cn(
                            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-all",
                            open || model || category
                              ? "border-accent-line bg-accent-soft text-accent-text dark:text-accent"
                              : "border-line bg-surface text-ink-2 hover:border-line-2",
                          )}
                        >
                          <Icon name="filter" className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Filters</span>
                          {model || category ? (
                            <span className="mono rounded bg-accent/20 px-1 text-[9.5px] tabular-nums">
                              {[model, category].filter(Boolean).length}
                            </span>
                          ) : null}
                          <Icon name="chevron" className="h-3 w-3" />
                        </button>
                      )}
                    >
                      {(close) => (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Micro>Image models</Micro>
                            <div className="flex flex-wrap gap-1">
                              {IMAGE_MODELS.map((m) => (
                                <Chip key={m} active={model === m} onClick={() => setModel(model === m ? null : m)}>{m}</Chip>
                              ))}
                            </div>
                          </div>
                          <Rule />
                          <div className="space-y-1.5">
                            <Micro>Video models</Micro>
                            <div className="flex flex-wrap gap-1">
                              {VIDEO_MODELS.map((m) => (
                                <Chip key={m} active={model === m} onClick={() => setModel(model === m ? null : m)}>{m}</Chip>
                              ))}
                            </div>
                          </div>
                          <Rule />
                          <div className="space-y-1.5">
                            <Micro>Category</Micro>
                            <div className="flex max-h-44 flex-wrap gap-1 overflow-y-auto">
                              {CATEGORIES.map((c) => (
                                <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                                  <span>{CATEGORY_EMOJI[c]}</span>{c}
                                </Chip>
                              ))}
                            </div>
                          </div>
                          <Rule />
                          <div className="flex gap-2">
                            <Button size="sm" variant="primary" className="flex-1" onClick={() => { setModel(null); setCategory(null); setMedia("all"); close(); }}>
                              Reset
                            </Button>
                            <Button size="sm" className="flex-1" onClick={close}>Done</Button>
                          </div>
                        </div>
                      )}
                    </Popover>

                    <IconButton
                      icon="star"
                      label="Favorites only"
                      active={favoritesOnly}
                      className={favoritesOnly ? "text-warn" : ""}
                      onClick={() => setFavoritesOnly(!favoritesOnly)}
                    />
                    <IconButton
                      icon="dice"
                      label="Surprise me — open a random prompt"
                      onClick={() => {
                        const pool = filtered.length ? filtered : state.prompts;
                    if (pool.length) setRunPrompt(pool[Math.floor(Math.random() * pool.length)]);
                      }}
                    />

                    <div className="relative ml-auto">
                      <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as Sort)}
                        className="h-9 appearance-none rounded-lg border border-line bg-surface pl-2.5 pr-7 text-[12px] font-medium text-ink-2 outline-none transition hover:border-line-2 focus:border-accent-line"
                      >
                        {SORTS.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
                      </select>
                      <Icon name="chevron" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                    </div>

                    <IconButton
                      icon={layout === "grid" ? "list" : "grid"}
                      label={layout === "grid" ? "List view (G)" : "Grid view (G)"}
                      onClick={() => setLayout(layout === "grid" ? "list" : "grid")}
                    />

                    <span className="mono hidden shrink-0 text-[11px] tabular-nums text-ink-3 md:block">
                      {filtered.length}/{state.prompts.length}
                    </span>
                    {filtersOn ? <IconButton icon="x" label="Clear all filters" onClick={clearFilters} /> : null}
                  </div>

                  {(activeCollection || tags.length > 0) ? (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-canvas-2/40 px-3 py-1.5 sm:px-4">
                      {activeCollection ? <Pill onRemove={() => setCollection(null)}>{activeCollection.emoji} {activeCollection.name}</Pill> : null}
                      {tags.map((t) => (
                        <Pill key={t} tone="plain" onRemove={() => setTags((p) => p.filter((x) => x !== t))}>#{t}</Pill>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </header>

            {/* ══════════ content ══════════ */}
            <div className="flex-1">
              {view === "library" ? (
                <div className="px-3 py-4 sm:px-4">
                  {state.prompts.length === 0 ? (
                    <div className="mx-auto mt-20 max-w-sm text-center">
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-accent to-[color:var(--pf-teal)] shadow-[0_8px_24px_-10px_var(--pf-accent)]">
                        <Icon name="sparkle" className="h-7 w-7 text-white" />
                      </div>
                      <h2 className="display mt-4 text-[18px] font-semibold text-ink">Library is empty</h2>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                        Create a prompt, roll one in the Idea Lab, or import a JSON backup.
                      </p>
                      <div className="mt-5 flex justify-center gap-2">
                        <Button variant="primary" size="sm" onClick={openNew}><Icon name="plus" className="h-3.5 w-3.5" /> New</Button>
                        <Button size="sm" onClick={() => setView("idea")}><Icon name="flask" className="h-3.5 w-3.5" /> Idea Lab</Button>
                        <Button size="sm" onClick={() => setView("data")}><Icon name="upload" className="h-3.5 w-3.5" /> Import</Button>
                      </div>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="mx-auto mt-20 max-w-sm text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-line bg-surface">
                        <Icon name="search" className="h-5 w-5 text-ink-3" />
                      </div>
                      <h2 className="display mt-4 text-[16px] font-semibold text-ink">No matches</h2>
                      <p className="mt-1.5 text-[12.5px] text-ink-2">Try a different search or clear the filters.</p>
                      <Button size="sm" className="mt-4" onClick={clearFilters}>Clear filters</Button>
                    </div>
                  ) : (
                    <div className={cn("grid gap-3", layout === "grid" ? "sm:grid-cols-2 2xl:grid-cols-3" : "mx-auto max-w-4xl grid-cols-1")}>
                      {filtered.map((p, i) => (
                        <div key={p.id} className="rise" style={{ animationDelay: `${Math.min(i, 14) * 16}ms` }}>
                          <PromptCard
                            prompt={p}
                            state={state}
                            layout={layout}
                            query={query}
                            onEdit={openEdit}
                            onRun={setRunPrompt}
                            onTagClick={(t) => { setTags((prev) => (prev.includes(t) ? prev : [...prev, t])); setCollection(null); }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

          {view === "idea" ? <IdeaLab onSaved={(p) => { setView("library"); openEdit(p); }} /> : null}
              {view === "data" ? <DataPanel state={state} /> : null}
            </div>

            <footer className="flex items-center justify-center gap-2 border-t border-line bg-canvas-2/40 px-4 py-2.5 text-[11px] text-ink-3">
              <Icon name="database" className="h-3 w-3" />
              <span className="mono tabular-nums">
                {state.prompts.length} prompts · {(new Blob([JSON.stringify(state)]).size / 1024).toFixed(0)} KB
              </span>
              <Rule vertical />
              <span>stored locally as JSON</span>
            </footer>
          </>
        )}
      </main>

      <PromptEditor
        key={editorPrompt?.id ?? "new-prompt"}
        open={editorOpen}
        prompt={editorPrompt}
        isNew={isNew}
        onClose={() => { setEditorOpen(false); setEditorPrompt(null); }}
        state={state}
      />

      <RunDialog prompt={runPrompt} onClose={() => setRunPrompt(null)} onRemix={openEdit} onEdit={openEdit} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </ThemeProvider>
  );
}
