import { useMemo, useState } from "react";
import { db } from "../lib/db";
import { CATEGORY_EMOJI } from "../lib/types";
import { cn } from "../lib/utils";
import { Button, Icon, IconButton, Micro, Rule, TextInput, ThemeSwitch } from "./ui";
import { useTheme } from "@/lib/theme";
import type { AppState } from "../lib/types";

export type View = "library" | "idea" | "meta" | "import" | "data";

const EMOJIS = ["📁", "🌆", "🧑‍🎤", "📦", "🎨", "🧊", "🌿", "🔮", "🪐", "🕯️", "🏴‍☠️", "🧸", "🥷", "🌋"];

export default function Sidebar({
  state,
  view,
  setView,
  activeCollection,
  setActiveCollection,
  activeTags,
  toggleTag,
  clearFilters,
  favoritesOnly,
  setFavoritesOnly,
  activeCategory,
  setActiveCategory,
  collapsed,
  onToggleCollapse,
  onClose,
}: {
  state: AppState;
  view: View;
  setView: (v: View) => void;
  activeCollection: string | null;
  setActiveCollection: (id: string | null) => void;
  activeTags: string[];
  toggleTag: (tag: string) => void;
  clearFilters: () => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (v: boolean) => void;
  activeCategory: string | null;
  setActiveCategory: (c: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose?: () => void;
}) {
  const { mode, resolved, cycle } = useTheme();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of state.prompts) map.set(p.collectionId ?? "none", (map.get(p.collectionId ?? "none") ?? 0) + 1);
    return map;
  }, [state.prompts]);

  const catCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of state.prompts) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [state.prompts]);

  const topTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of state.prompts) for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
  }, [state.prompts]);

  const usage = useMemo(() => {
    const bytes = new Blob([JSON.stringify(state)]).size;
    return { kb: bytes / 1024, pct: Math.min(100, (bytes / (5 * 1024 * 1024)) * 100) };
  }, [state]);

  const imgs = state.prompts.filter((p) => p.media === "image").length;

  const NAV: { v: View; icon: string; label: string; badge?: number }[] = [
    { v: "library", icon: "layers", label: "Library", badge: state.prompts.length },
    { v: "idea", icon: "flask", label: "Idea Lab" },
    { v: "import", icon: "download", label: "Gallery import" },
    { v: "meta", icon: "wand", label: "Meta Prompts" },
    { v: "data", icon: "database", label: "Data" },
  ];

  /* ─────────────── collapsed rail ─────────────── */
  if (collapsed) {
    return (
      <aside className="flex h-full w-full flex-col items-center gap-1 border-r border-line bg-canvas-2/70 py-3 backdrop-blur-xl">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-[color:var(--pf-teal)] shadow-[0_4px_14px_-6px_var(--pf-accent)]">
          <Icon name="sparkle" className="h-4 w-4 text-white" strokeWidth={2.2} />
        </div>

        <Rule className="my-2 w-6" />

        <IconButton
          icon="plus"
          label="New prompt (N)"
          size="icon"
          variant="primary"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("pf:new"));
            onClose?.();
          }}
        />

        <div className="mt-1 flex flex-col items-center gap-0.5">
          {NAV.map((n) => (
            <button
              key={n.v}
              title={n.label}
              onClick={() => {
                setView(n.v);
                onClose?.();
              }}
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-xl transition-all duration-150 active:scale-95",
                view === n.v ? "bg-accent-soft text-accent-text dark:text-accent" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon name={n.icon} className="h-[17px] w-[17px]" />
              {n.badge ? (
                <span className="absolute -right-0.5 -top-0.5 rounded-full bg-accent px-1 text-[8.5px] font-semibold leading-[14px] text-accent-ink">
                  {n.badge > 99 ? "99" : n.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <Rule className="my-2 w-6" />

        <button
          title={favoritesOnly ? "Show all" : "Favorites only"}
          onClick={() => setFavoritesOnly(!favoritesOnly)}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl transition-all active:scale-95",
            favoritesOnly ? "bg-warn/15 text-warn" : "text-ink-3 hover:bg-surface-2 hover:text-ink",
          )}
        >
          <Icon name="star" className={cn("h-[17px] w-[17px]", favoritesOnly && "fill-current")} />
        </button>

        <div className="mt-auto flex flex-col items-center gap-1.5">
          <IconButton
            icon={resolved === "dark" ? "moon" : "sun"}
            label={`Theme: ${mode} — click to cycle`}
            size="icon"
            onClick={cycle}
          />
          <IconButton icon="chevronRight" label="Expand sidebar" size="icon" onClick={onToggleCollapse} />
        </div>
      </aside>
    );
  }

  /* ─────────────── expanded panel ─────────────── */
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-line bg-canvas-2/70 backdrop-blur-xl">
      {/* brand */}
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-accent to-[color:var(--pf-teal)] shadow-[0_4px_14px_-6px_var(--pf-accent)]">
          <Icon name="sparkle" className="h-4 w-4 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1 leading-none">
          <div className="display text-[14px] font-semibold text-ink">Prompt Library</div>
          <div className="mono mt-1 text-[10px] tabular-nums text-ink-3">
            {imgs} img · {state.prompts.length - imgs} vid
          </div>
        </div>
        {onClose ? (
          <IconButton icon="x" label="Close" size="iconSm" onClick={onClose} />
        ) : (
          <IconButton icon="arrowLeft" label="Collapse sidebar" size="iconSm" onClick={onToggleCollapse} />
        )}
      </div>

      {/* primary action */}
      <div className="border-b border-line px-3 py-3">
        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("pf:new"));
            onClose?.();
          }}
        >
          <Icon name="plus" className="h-3.5 w-3.5" /> New prompt
          <kbd className="ml-auto rounded border border-white/25 bg-white/10 px-1 text-[9px]">N</kbd>
        </Button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto py-2">
        {/* nav */}
        <nav className="space-y-0.5 px-2">
          {NAV.map((n) => (
            <button
              key={n.v}
              onClick={() => {
                setView(n.v);
                onClose?.();
              }}
              className={cn(
                "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150",
                view === n.v ? "bg-accent-soft text-accent-text dark:text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {view === n.v ? (
                <span className="absolute -left-2 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
              ) : null}
              <Icon name={n.icon} className="h-4 w-4" />
              <span className="flex-1 text-left">{n.label}</span>
              {n.badge ? <span className="mono text-[10px] tabular-nums text-ink-3">{n.badge}</span> : null}
            </button>
          ))}
        </nav>

        <Rule className="mx-3 my-2" />

        {/* everything */}
        <div className="px-2">
          <button
            onClick={() => {
              setActiveCollection(null);
              setActiveCategory(null);
              setView("library");
              onClose?.();
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-[7px] text-[12.5px] transition-colors",
              !activeCollection && !activeCategory
                ? "border border-line bg-surface text-ink shadow-card"
                : "border border-transparent text-ink-2 hover:bg-surface-2",
            )}
          >
            <Icon name="folder" className="h-3.5 w-3.5 text-ink-3" />
            Everything
            <span className="mono ml-auto text-[10px] tabular-nums text-ink-3">{state.prompts.length}</span>
          </button>
        </div>

        {/* categories */}
        {catCounts.length ? (
          <div className="space-y-0.5 border-t border-line-3 pt-2">
            <div className="px-4 pb-1">
              <Micro>Categories</Micro>
            </div>
            <div className="px-2">
              {catCounts.map(([c, n]) => {
                const on = activeCategory === c;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      setActiveCategory(on ? null : c);
                      setView("library");
                      onClose?.();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-[5px] text-[12px] transition-colors",
                      on ? "bg-teal-soft font-medium text-teal" : "text-ink-2 hover:bg-surface-2",
                    )}
                  >
                    <span className="text-[12px] leading-none">{CATEGORY_EMOJI[c] ?? "•"}</span>
                    <span className="truncate">{c}</span>
                    <span className="mono ml-auto text-[9.5px] tabular-nums text-ink-3">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* collections */}
        <div className="space-y-0.5 border-t border-line-3 pt-2">
          <div className="flex items-center justify-between px-4 pb-1">
            <Micro>Collections</Micro>
            <IconButton icon="plus" label="New collection" size="iconSm" onClick={() => setAdding((v) => !v)} />
          </div>

          {adding ? (
            <form
              className="flex gap-1 px-3 pb-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName.trim()) return;
                const col = db.addCollection(newName, EMOJIS[Math.floor(Math.random() * EMOJIS.length)]);
                setNewName("");
                setAdding(false);
                setActiveCollection(col.id);
              }}
            >
              <TextInput autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name…" className="h-8 text-[12px]" />
              <IconButton icon="check" label="Create" size="iconSm" variant="primary" type="submit" />
            </form>
          ) : null}

          <div className="px-2">
            {state.collections.map((c) => {
              const on = activeCollection === c.id;
              return (
                <div key={c.id} className="group relative">
                  <button
                    onClick={() => {
                      setActiveCollection(c.id);
                      setView("library");
                      onClose?.();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-[6px] pr-14 text-left text-[12.5px] transition-colors",
                      on ? "bg-surface font-medium text-ink shadow-card ring-1 ring-line" : "text-ink-2 hover:bg-surface-2",
                    )}
                  >
                    <span className="text-[12px] leading-none">{c.emoji}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="mono absolute right-8 text-[9.5px] tabular-nums text-ink-3">{counts.get(c.id) ?? 0}</span>
                  </button>
                  <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <IconButton icon="pencil" label="Rename" size="iconSm" onClick={() => setEditing(editing === c.id ? null : c.id)} />
                    <IconButton
                      icon="trash"
                      label="Delete collection"
                      size="iconSm"
                      onClick={() => {
                        const n = counts.get(c.id) ?? 0;
                        if (confirm(`Delete "${c.name}"? ${n} prompt(s) stay but become unfiled.`)) db.deleteCollection(c.id);
                      }}
                    />
                  </div>
                  {editing === c.id ? (
                    <div className="flex gap-1 px-1 pb-1.5 pt-1">
                      <select
                        value={c.emoji}
                        onChange={(e) => db.updateCollection(c.id, { emoji: e.target.value })}
                        className="h-8 rounded-lg border border-line bg-surface px-1 text-[12px]"
                      >
                        {EMOJIS.map((em) => (
                          <option key={em} value={em}>{em}</option>
                        ))}
                      </select>
                      <TextInput
                        autoFocus
                        defaultValue={c.name}
                        onChange={(e) => db.updateCollection(c.id, { name: e.target.value })}
                        onBlur={() => setEditing(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditing(null)}
                        className="h-8 text-[12px]"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* tags */}
        {topTags.length ? (
          <div className="space-y-1.5 border-t border-line-3 pt-2">
            <div className="flex items-center justify-between px-4">
              <Micro>Tags</Micro>
              {activeTags.length ? (
                <button onClick={clearFilters} className="text-[10px] font-medium text-accent-text dark:text-accent hover:underline">
                  reset
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1 px-3">
              {topTags.map(([tag, n]) => {
                const on = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => {
                      toggleTag(tag);
                      setView("library");
                    }}
                    className={cn(
                      "mono rounded border px-1.5 py-[3px] text-[10px] font-medium transition-all active:scale-95",
                      on
                        ? "border-accent-line bg-accent-soft text-accent-text dark:text-accent"
                        : "border-line bg-surface/60 text-ink-3 hover:border-line-2 hover:text-ink-2",
                    )}
                  >
                    {tag}
                    <span className="ml-1 opacity-55">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* footer */}
      <div className="space-y-2 border-t border-line px-3 py-2.5">
        <div className="flex items-center justify-between">
          <ThemeSwitch />
          <span className="mono flex items-center gap-1.5 text-[10px] tabular-nums text-ink-3">
            <Icon name="database" className="h-3 w-3" />
            {usage.kb.toFixed(0)} KB
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-[color:var(--pf-teal)] transition-all duration-500"
            style={{ width: `${Math.max(1.5, usage.pct)}%` }}
          />
        </div>
        <IconButton
          icon="arrowLeft"
          label="Collapse sidebar"
          size="iconSm"
          className="w-full"
          onClick={onToggleCollapse}
        />
      </div>
    </aside>
  );
}
