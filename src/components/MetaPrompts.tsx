import { useEffect, useMemo, useState } from "react";
import { metaDb, useMeta } from "../lib/db";
import { applyMetaVars, rollVars, type MetaPrompt } from "../lib/metaprompts";
import { ALL_MODELS, type MediaType } from "../lib/types";
import { cn, copyText, uid } from "../lib/utils";
import {
  Button,
  Cell,
  Chip,
  CopyButton,
  Icon,
  IconButton,
  Micro,
  Modal,
  Rule,
  Select,
  TextArea,
  TextInput,
  useToast,
} from "./ui";

const BLANK: MetaPrompt = {
  id: "",
  name: "",
  model: ALL_MODELS[0],
  media: "image",
  blurb: "",
  system: "",
  format: "",
  vars: [],
  tags: [],
  builtIn: false,
};

export default function MetaPrompts() {
  const meta = useMeta();
  const toast = useToast();
  const [selected, setSelected] = useState<string>(meta[0]?.id ?? "");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<MediaType | "all">("all");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [rolling, setRolling] = useState(false);
  const [editing, setEditing] = useState<MetaPrompt | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return meta.filter((m) => {
      if (filter !== "all" && m.media !== filter) return false;
      if (!s) return true;
      return [m.name, m.model, m.blurb, m.tags.join(" "), m.system].join(" ").toLowerCase().includes(s);
    });
  }, [meta, q, filter]);

  const current = useMemo(() => meta.find((m) => m.id === selected) ?? list[0] ?? meta[0], [meta, selected, list]);

  useEffect(() => {
    setVars({});
  }, [current?.id]);

  /* rolling animation: cycle values briefly before settling */
  const surprise = () => {
    if (!current) return;
    const final = rollVars(current);
    setRolling(true);
    let ticks = 0;
    const iv = window.setInterval(() => {
      ticks++;
      setVars(rollVars(current));
      if (ticks >= 7) {
        window.clearInterval(iv);
        setVars(final);
        setRolling(false);
        toast("Rolled a fresh brief");
      }
    }, 55);
  };

  const brief = current ? applyMetaVars(current.format, vars) : "";
  const rolled = current ? current.vars.every((v) => (vars[v.name] ?? "").trim()) : false;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* header */}
      <header className="border-b border-line px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-line bg-teal-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">
              <Icon name="wand" className="h-3 w-3" /> Meta prompts
            </span>
            <h1 className="display mt-2.5 text-[26px] font-semibold leading-none text-ink sm:text-[30px]">
              System prompts that write prompts
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-2">
              Paste one into any LLM as the system message, then roll a brief. Each model gets its own grammar —
              Midjourney flags, Flux sentences, SDXL tag stacks, Veo camera specs.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={() => setEditing({ ...BLANK, id: uid("meta") })}>
            <Icon name="plus" className="h-3.5 w-3.5" /> New meta prompt
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[19rem_1fr]">
        {/* ── master list ── */}
        <div className="flex min-h-0 flex-col border-line lg:border-r">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
            <div className="relative flex-1">
              <Icon name="search" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search meta prompts…"
                className="h-8 w-full rounded-lg border border-line bg-surface pl-8 pr-2 text-[12px] text-ink placeholder:text-ink-3/80 outline-none transition focus:border-accent-line"
              />
            </div>
            <div className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
              {(["all", "image", "video"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFilter(m)}
                  title={m}
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-md transition-all",
                    filter === m ? "bg-surface text-accent-text shadow-card dark:text-accent" : "text-ink-3 hover:text-ink-2",
                  )}
                >
                  <Icon name={m === "video" ? "video" : m === "image" ? "image" : "layers"} className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {(["image", "video"] as MediaType[])
              .map((kind) => ({ kind, items: list.filter((m) => m.media === kind) }))
              .filter((g) => g.items.length)
              .map((g) => (
                <div key={g.kind} className="border-b border-line-3 last:border-0">
                  <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-line-3 bg-canvas-2/95 px-3 py-1.5 backdrop-blur">
                    <Icon name={g.kind === "video" ? "video" : "image"} className="h-3 w-3 text-ink-3" />
                    <Micro>{g.kind === "video" ? "Video models" : "Image models"}</Micro>
                    <span className="mono ml-auto text-[9.5px] tabular-nums text-ink-3">{g.items.length}</span>
                  </div>
                  {g.items.map((m) => {
                    const on = current?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelected(m.id)}
                        className={cn(
                          "relative flex w-full flex-col gap-0.5 border-b border-line-3 px-3 py-2.5 text-left transition-colors last:border-0",
                          on ? "bg-accent-soft" : "hover:bg-surface-2",
                        )}
                      >
                        {on ? <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" /> : null}
                        <span className="flex items-center gap-1.5">
                          <span className={cn("truncate text-[12.5px] font-semibold", on ? "text-accent-text dark:text-accent" : "text-ink")}>
                            {m.name}
                          </span>
                          <span className="mono ml-auto shrink-0 text-[9.5px] text-ink-3">{m.vars.length}v</span>
                        </span>
                        <span className="truncate text-[11px] text-ink-3">{m.model}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            {!list.length ? (
              <p className="px-4 py-8 text-center text-[12.5px] text-ink-3">No meta prompts match.</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 border-t border-line px-3 py-2">
            <Micro>{meta.length} total</Micro>
            <Button
              size="xs"
              variant="ghost"
              className="ml-auto"
              onClick={() => {
                if (confirm("Reset all meta prompts to the built-in set? Your custom ones are removed.")) {
                  metaDb.reset();
                  toast("Meta prompts reset", "info");
                }
              }}
            >
              <Icon name="shuffle" className="h-3 w-3" /> Reset
            </Button>
          </div>
        </div>

        {/* ── detail ── */}
        <div className="min-h-0 overflow-y-auto bg-canvas-2/40">
          {current ? (
            <div className="space-y-4 p-4 sm:p-5">
              {/* title row */}
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="display text-[20px] font-semibold leading-none text-ink">{current.name}</h2>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                        current.media === "video" ? "border-teal-line bg-teal-soft text-teal" : "border-accent-line bg-accent-soft text-accent-text dark:text-accent",
                      )}
                    >
                      <Icon name={current.media === "video" ? "video" : "image"} className="h-2.5 w-2.5" />
                      {current.media}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-ink-2">{current.blurb}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Chip>{current.model}</Chip>
                    {current.tags.map((t) => (
                      <Chip key={t} className="mono">{t}</Chip>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton icon="pencil" label="Edit meta prompt" size="iconSm" variant="outline" onClick={() => setEditing({ ...current })} />
                  <IconButton
                    icon="layers"
                    label="Duplicate"
                    size="iconSm"
                    variant="outline"
                    onClick={() => {
                      const c = metaDb.duplicate(current.id);
                      if (c) {
                        setSelected(c.id);
                        toast("Duplicated");
                      }
                    }}
                  />
                  <IconButton
                    icon="trash"
                    label="Delete"
                    size="iconSm"
                    variant="outline"
                    className="hover:text-danger"
                    onClick={() => {
                      if (confirm(`Delete "${current.name}"?`)) {
                        metaDb.remove(current.id);
                        setSelected("");
                        toast("Deleted", "warn");
                      }
                    }}
                  />
                </div>
              </div>

              <Rule />

              {/* system prompt */}
              <section className="overflow-hidden rounded-xl border border-line bg-surface">
                <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
                  <Icon name="book" className="h-3.5 w-3.5 text-accent-text dark:text-accent" />
                  <Micro>System message</Micro>
                  <span className="mono ml-auto text-[10px] tabular-nums text-ink-3">
                    {current.system.trim().split(/\s+/).length} words
                  </span>
                  <CopyIconInline text={current.system} label="Copy system prompt" />
                </div>
                <pre className="mono max-h-[22rem] overflow-auto whitespace-pre-wrap break-words px-3.5 py-3 text-[11.5px] leading-[1.75] text-ink-2">
                  {current.system}
                </pre>
              </section>

              {/* variables + surprise me */}
              <section className="rounded-xl border border-line bg-surface">
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
                  <Icon name="dice" className="h-3.5 w-3.5 text-teal" />
                  <Micro>Surprise me</Micro>
                  <span className="text-[11px] text-ink-3">
                    {current.vars.length} slot{current.vars.length === 1 ? "" : "s"}
                  </span>
                  <Button variant="teal" size="sm" className="ml-auto" onClick={surprise}>
                    <Icon name="shuffle" className={cn("h-3 w-3", rolling && "animate-spin")} /> Roll all
                  </Button>
                </div>

                {current.vars.length ? (
                  <div className="grid gap-2 p-3 sm:grid-cols-2">
                    {current.vars.map((v) => (
                      <div
                        key={v.name}
                        className="flex items-center gap-2 rounded-lg border border-line bg-canvas-2/50 px-2.5 py-1.5 transition-colors focus-within:border-accent-line"
                      >
                        <code className="mono shrink-0 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent-text dark:text-accent">
                          {v.name}
                        </code>
                        <input
                          value={vars[v.name] ?? ""}
                          onChange={(e) => setVars((s) => ({ ...s, [v.name]: e.target.value }))}
                          placeholder={v.options[0]}
                          className="mono min-w-0 flex-1 bg-transparent text-[11.5px] text-ink outline-none placeholder:text-ink-3/70"
                        />
                        <IconButton
                          icon="dice"
                          label={`Reroll ${v.name}`}
                          size="iconSm"
                          onClick={() => setVars((s) => ({ ...s, [v.name]: v.options[Math.floor(Math.random() * v.options.length)] }))}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-4 text-[12px] text-ink-3">This meta prompt has no variables — just copy the system message.</p>
                )}

                {/* composed brief */}
                <div className="border-t border-line px-3 py-3">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Icon name="sparkle" className="h-3 w-3 text-ink-3" />
                    <Micro>User brief</Micro>
                    {rolled ? (
                      <span className="mono ml-auto text-[9.5px] text-ok">ready</span>
                    ) : current.vars.length ? (
                      <span className="mono ml-auto text-[9.5px] text-ink-3">roll to fill</span>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "mono min-h-[2.5rem] whitespace-pre-wrap break-words rounded-lg border border-dashed px-3 py-2 text-[11.5px] leading-relaxed transition-colors",
                      rolled ? "border-teal-line bg-teal-soft text-ink" : "border-line bg-canvas-2/40 text-ink-3",
                    )}
                  >
                    {brief || "—"}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <CopyButton text={current.system} label="Copy system" size="sm" onCopied={(ok) => ok && toast("System prompt copied")} />
                    <CopyButton
                      text={brief}
                      label="Copy brief"
                      variant="outline"
                      size="sm"
                      onCopied={(ok) => (ok ? toast("Brief copied") : toast("Clipboard blocked", "warn"))}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const ok = await copyText(`${current.system}\n\n---\n\nBRIEF:\n${brief}`);
                        toast(ok ? "System + brief copied" : "Clipboard blocked", ok ? "ok" : "warn");
                      }}
                    >
                      <Icon name="layers" className="h-3 w-3" /> Copy both
                    </Button>
                  </div>
                </div>
              </section>

              {/* output format */}
              <section className="rounded-xl border border-line bg-surface p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <Icon name="sliders" className="h-3 w-3 text-ink-3" />
                  <Micro>Expected output shape</Micro>
                </div>
                <p className="mono text-[11.5px] leading-relaxed text-ink-2">{current.format}</p>
              </section>
            </div>
          ) : (
            <div className="grid h-full place-items-center p-10 text-center">
              <div>
                <Icon name="wand" className="mx-auto h-8 w-8 text-ink-3" />
                <p className="mt-3 text-[13px] text-ink-2">Select a meta prompt, or create your own.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* editor */}
      <MetaEditor
        draft={editing}
        onClose={() => setEditing(null)}
        onSaved={(m) => {
          setSelected(m.id);
          setEditing(null);
        }}
      />
    </div>
  );
}

function CopyIconInline({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <IconButton
      icon={done ? "check" : "copy"}
      label={done ? "Copied" : label}
      size="iconSm"
      active={done}
      className={done ? "text-ok" : ""}
      onClick={async () => {
        const ok = await copyText(text);
        setDone(ok);
        setTimeout(() => setDone(false), 1300);
      }}
    />
  );
}

function MetaEditor({
  draft,
  onClose,
  onSaved,
}: {
  draft: MetaPrompt | null;
  onClose: () => void;
  onSaved: (m: MetaPrompt) => void;
}) {
  const toast = useToast();
  const [d, setD] = useState<MetaPrompt | null>(draft);
  const [varText, setVarText] = useState("");

  useEffect(() => {
    setD(draft);
    setVarText(
      (draft?.vars ?? [])
        .map((v) => `${v.name}: ${v.options.join(" | ")}`)
        .join("\n"),
    );
  }, [draft]);

  if (!d) return null;

  const set = <K extends keyof MetaPrompt>(k: K, v: MetaPrompt[K]) => setD((s) => (s ? { ...s, [k]: v } : s));

  const save = () => {
    if (!d.name.trim() || !d.system.trim()) {
      toast("Name and system message are required", "warn");
      return;
    }
    const vars = varText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, rest] = line.split(":");
        const options = (rest ?? "")
          .split("|")
          .map((o) => o.trim())
          .filter(Boolean);
        return { name: (name ?? "").trim(), options: options.length ? options : ["example"] };
      })
      .filter((v) => v.name);
    const saved = metaDb.upsert({ ...d, vars });
    toast("Meta prompt saved");
    onSaved(saved);
  };

  return (
    <Modal
      open
      onClose={onClose}
      wide
      icon="wand"
      title={d.builtIn ? `Edit · ${d.name}` : "New meta prompt"}
      subtitle="System message, expected output shape, and the variable slots Surprise Me rolls."
    >
      <div className="max-h-[calc(100vh-13rem)] space-y-4 overflow-y-auto p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Cell label="Name" icon="tag">
            <TextInput value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Portrait Director" />
          </Cell>
          <Cell label="Blurb" icon="book">
            <TextInput value={d.blurb} onChange={(e) => set("blurb", e.target.value)} placeholder="One line describing what it does" />
          </Cell>
          <Cell label="Media" icon={d.media === "video" ? "video" : "image"}>
            <Select
              icon={d.media === "video" ? "video" : "image"}
              value={d.media}
              onChange={(e) => set("media", e.target.value as MediaType)}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </Select>
          </Cell>
          <Cell label="Model" icon="bolt">
            <Select icon="bolt" value={d.model} onChange={(e) => set("model", e.target.value)}>
              {ALL_MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </Cell>
        </div>

        <Cell label="System message" icon="book" hint="The instructions you paste into an LLM as the system role.">
          <TextArea rows={12} value={d.system} onChange={(e) => set("system", e.target.value)} className="mono text-[12px] leading-relaxed" />
        </Cell>

        <Cell label="Expected output shape" icon="sliders" hint="Shown to the user as a reminder of the format the model must return.">
          <TextArea rows={2} value={d.format} onChange={(e) => set("format", e.target.value)} className="mono text-[12px]" />
        </Cell>

        <Cell
          label="Variable slots"
          icon="dice"
          hint="One per line: name: option | option | option. Surprise Me rolls these."
        >
          <TextArea rows={5} value={varText} onChange={(e) => setVarText(e.target.value)} className="mono text-[12px]" placeholder={"subject: a diver | a chef\nlens: 35mm | 85mm"} />
        </Cell>

        <Cell label="Tags (comma separated)" icon="tag">
          <TextInput
            value={d.tags.join(", ")}
            onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))}
            placeholder="portrait, midjourney"
            className="mono text-[12px]"
          />
        </Cell>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line bg-canvas-2/50 px-5 py-3">
        <span className="mono text-[10.5px] text-ink-3">{d.builtIn ? "built-in" : "custom"}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>
            <Icon name="check" className="h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
