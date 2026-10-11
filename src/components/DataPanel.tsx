import { useMemo, useRef, useState } from "react";
import { db } from "../lib/db";
import { ALL_MODELS, type AppState } from "../lib/types";
import { cn, downloadJSON, timeAgo, tokenCount } from "../lib/utils";
import { Button, Cell, Icon, IconButton, Micro, Select, TextArea, ThemeSwitch, useToast } from "./ui";

const KEYS: [string, string][] = [
  ["N", "new prompt"],
  ["/", "focus search"],
  ["⌘K", "focus search"],
  ["G", "grid / list"],
  ["I", "idea lab"],
  ["Esc", "close dialog"],
];

function Tile({
  icon,
  value,
  label,
  sub,
}: {
  icon: string;
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface p-3.5 transition-all hover:border-accent-line hover:shadow-card">
      <div className="flex items-start justify-between">
        <Icon name={icon} className="h-4 w-4 text-accent" />
        {sub ? <span className="text-[10px] tabular-nums text-ink-3">{sub}</span> : null}
      </div>
      <div className="mt-3 text-[24px] font-semibold leading-none tracking-tight text-ink tabular-nums">
        {value}
      </div>
      <Micro className="mt-1.5 block">{label}</Micro>
      <span className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-accent-soft opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
    </div>
  );
}

export default function DataPanel({ state }: { state: AppState }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [raw, setRaw] = useState("");

  const stats = useMemo(() => {
    const tags = new Map<string, number>();
    const models = new Map<string, number>();
    const cats = new Map<string, number>();
    let tokens = 0;
    let images = 0;
    for (const p of state.prompts) {
      tokens += tokenCount(p.prompt) + tokenCount(p.negative);
      for (const t of p.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
      models.set(p.model, (models.get(p.model) ?? 0) + 1);
      cats.set(p.category, (cats.get(p.category) ?? 0) + 1);
      if (p.image) images++;
    }
    return {
      tokens,
      images,
      tags: tags.size,
      topTags: [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
      models: [...models.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      cats: [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      bytes: new Blob([JSON.stringify(state)]).size,
    };
  }, [state]);

  const img = state.prompts.filter((p) => p.media === "image").length;
  const vid = state.prompts.length - img;
  const max = stats.models[0]?.[1] ?? 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent">
            <Icon name="database" className="h-3 w-3" /> Local store
          </span>
          <h1 className="display mt-3 text-[26px] font-semibold leading-none text-ink sm:text-[30px]">
            Data &amp; backup
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-ink-2">
            Everything is a single JSON document in your browser — no server, no Postgres. Export it, move it, or
            hand-edit and paste it back.
          </p>
        </div>
        <ThemeSwitch />
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon="layers" value={String(state.prompts.length)} label="Prompts" sub={`${img}i / ${vid}v`} />
        <Tile icon="book" value={String(state.collections.length)} label="Collections" />
        <Tile icon="tag" value={String(stats.tags)} label="Unique tags" />
        <Tile icon="bolt" value={stats.tokens.toLocaleString()} label="Est. tokens" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* backup / import */}
        <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center gap-2">
            <Icon name="download" className="h-4 w-4 text-accent" />
            <h2 className="text-[13.5px] font-semibold tracking-tight text-ink">Backup</h2>
            <span className="ml-auto text-[10.5px] tabular-nums text-ink-3">
              {(stats.bytes / 1024).toFixed(1)} KB
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                downloadJSON(state, `prompt-library-${new Date().toISOString().slice(0, 10)}.json`);
                toast("Backup downloaded");
              }}
            >
              <Icon name="download" className="h-3.5 w-3.5" /> Export .json
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(db.exportJSON());
                  toast("JSON copied to clipboard");
                } catch {
                  toast("Clipboard blocked — use Export", "warn");
                }
              }}
            >
              <Icon name="copy" className="h-3.5 w-3.5" /> Copy JSON
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                db.loadSeed();
                toast("Starter library restored", "info");
              }}
            >
              <Icon name="book" className="h-3.5 w-3.5" /> Starter data
            </Button>
          </div>

          <div className="border-t border-line pt-3">
            <div className="mb-2 flex items-center gap-2">
              <Icon name="upload" className="h-3.5 w-3.5 text-accent" />
              <Micro>Import</Micro>
              <div className="ml-auto flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
                {(["merge", "replace"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10.5px] font-medium capitalize transition-colors",
                      mode === m ? "bg-surface text-accent shadow-soft" : "text-ink-3 hover:text-ink-2",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" className="h-3.5 w-3.5" /> Choose file
              </Button>
              <Button size="sm" variant="subtle" onClick={() => setRaw(" ")}>
                Paste JSON
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const res = db.importJSON(JSON.parse(await file.text()), mode);
                    toast(`Imported ${res.prompts} prompt(s)`);
                  } catch {
                    toast("That file isn't valid JSON", "warn");
                  }
                }}
              />
            </div>
            {raw !== "" ? (
              <div className="mt-2.5 space-y-2">
                <TextArea
                  rows={5}
                  autoFocus
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  placeholder='{ "prompts": [ … ] }'
                  className="font-mono text-[11px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      try {
                        const res = db.importJSON(JSON.parse(raw), mode);
                        toast(`Imported ${res.prompts} prompt(s)`);
                        setRaw("");
                      } catch {
                        toast("Invalid JSON", "warn");
                      }
                    }}
                  >
                    Import
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRaw("")}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-danger/25 bg-danger/5 p-3">
            <div className="flex items-center gap-1.5">
              <Icon name="bolt" className="h-3 w-3 text-danger" />
              <Micro className="text-danger">Danger zone</Micro>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-snug text-danger/70">
              Wipes every prompt from this browser. Export a backup first — this cannot be undone.
            </p>
            <Button
              variant="danger"
              size="sm"
              className="mt-2"
              onClick={() => {
                if (confirm("Delete all prompts from this browser?")) {
                  db.wipe();
                  toast("Local store wiped", "warn");
                }
              }}
            >
              <Icon name="trash" className="h-3.5 w-3.5" /> Delete all
            </Button>
          </div>
        </section>

        {/* defaults + insights */}
        <div className="space-y-4">
          <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <Icon name="settings" className="h-4 w-4 text-accent" />
              <h2 className="text-[13.5px] font-semibold tracking-tight text-ink">Defaults</h2>
            </div>
            <Cell label="Model" icon="bolt">
              <Select
                icon="bolt"
                value={state.settings.defaultModel}
                onChange={(e) => db.updateSettings({ defaultModel: e.target.value })}
              >
                {ALL_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Cell>
            <Cell label="Negative" icon="x">
              <TextArea
                rows={3}
                value={state.settings.defaultNegative}
                onChange={(e) => db.updateSettings({ defaultNegative: e.target.value })}
                className="text-[12px]"
              />
            </Cell>
          </section>

          <section className="space-y-4 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <Icon name="grid" className="h-4 w-4 text-accent" />
              <h2 className="text-[13.5px] font-semibold tracking-tight text-ink">Insights</h2>
            </div>
            <div className="space-y-1.5">
              {stats.models.map(([m, n]) => (
                <div key={m} className="flex items-center gap-2">
                  <span className="w-36 shrink-0 truncate text-[11.5px] text-ink-2">{m}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-[10.5px] tabular-nums text-ink-3">{n}</span>
                </div>
              ))}
            </div>
            {stats.topTags.length ? (
              <div className="flex flex-wrap gap-1">
                {stats.topTags.map(([t, n]) => (
                  <span
                    key={t}
                    className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-ink-2"
                  >
                    {t} <span className="text-ink-3">{n}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className="space-y-2.5 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-2">
              <Icon name="clock" className="h-4 w-4 text-accent" />
              <h2 className="text-[13.5px] font-semibold tracking-tight text-ink">Recent copies</h2>
              {state.history.length ? (
                <IconButton
                  icon="trash"
                  label="Clear history"
                  size="iconSm"
                  className="ml-auto"
                  onClick={() => db.clearHistory()}
                />
              ) : null}
            </div>
            {state.history.length ? (
              <ul className="space-y-1">
                {state.history.slice(0, 6).map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11.5px]">
                    <span className="mt-0.5 shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[9.5px] tabular-nums text-ink-3">
                      {timeAgo(h.at)}
                    </span>
                    <span className="line-clamp-2 text-ink-2">{h.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-ink-3">Nothing copied yet.</p>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <Icon name="sliders" className="h-4 w-4 text-accent" />
              <h2 className="text-[13.5px] font-semibold tracking-tight text-ink">Shortcuts</h2>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {KEYS.map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-2 text-[11.5px]">
                  <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2">
                    {k}
                  </kbd>
                  <span className="text-ink-3">{v}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
