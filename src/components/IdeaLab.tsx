import { useMemo, useState } from "react";
import { BANKS, BANK_LABELS, type BankKey } from "../lib/seed";
import { ALL_MODELS, ASPECT_RATIOS, CATEGORIES, CATEGORY_EMOJI, type MediaType, type Prompt } from "../lib/types";
import { cn, copyText, pick, tokenCount } from "../lib/utils";
import { db, getSnapshot } from "../lib/db";
import { Button, Cell, Icon, IconButton, Micro, Select, TextArea, TextInput, useToast } from "./ui";

const ORDER: BankKey[] = ["subject", "setting", "medium", "lighting", "mood", "palette", "detail"];

const BANK_ICON: Record<BankKey, string> = {
  subject: "sparkle",
  setting: "folder",
  medium: "layers",
  lighting: "sun",
  mood: "bolt",
  palette: "sliders",
  detail: "settings",
};

function compose(v: Partial<Record<BankKey, string>>): string {
  const head = [v.subject, v.setting].filter(Boolean).join(", ");
  const tail = [
    v.medium,
    v.lighting,
    v.mood ? `${v.mood} atmosphere` : null,
    v.palette ? `${v.palette} colour palette` : null,
    v.detail,
  ]
    .filter(Boolean)
    .join(", ");
  return [head, tail].filter(Boolean).join(", ").replace(/\s+/g, " ").trim();
}

export default function IdeaLab({ onSaved }: { onSaved: (p: Prompt) => void }) {
  const toast = useToast();
  const [on, setOn] = useState<Record<BankKey, boolean>>({
    subject: true,
    setting: true,
    medium: true,
    lighting: true,
    mood: true,
    palette: false,
    detail: true,
  });
  const [values, setValues] = useState<Partial<Record<BankKey, string>>>({});
  const [output, setOutput] = useState("");
  const [model, setModel] = useState<string>(ALL_MODELS[1]);
  const [media, setMedia] = useState<MediaType>("image");
  const [category, setCategory] = useState<string>("Cinematic");
  const [aspect, setAspect] = useState<string>("16:9");
  const [title, setTitle] = useState("");
  const [log, setLog] = useState<string[]>([]);

  const preview = useMemo(() => compose(values), [values]);
  const text = output || preview;

  const generate = () => {
    const next: Partial<Record<BankKey, string>> = {};
    for (const k of ORDER) if (on[k]) next[k] = pick(BANKS[k]);
    setValues(next);
    const t = compose(next);
    setOutput(t);
    setLog((l) => [t, ...l].slice(0, 10));
  };

  const save = () => {
    const t = text.trim();
    if (!t) return toast("Generate an idea first", "warn");
    const saved = db.upsertPrompt({
      title: title.trim() || values.subject?.slice(0, 40) || "Generated idea",
      prompt: t,
      negative: getSnapshot().settings.defaultNegative,
      model,
      media,
      category,
      aspectRatio: aspect,
      tags: ["idea"],
      collectionId: null,
    });
    onSaved(saved);
    toast("Saved to library");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-accent">
            <Icon name="flask" className="h-3 w-3" /> Idea Lab
          </span>
          <h1 className="display mt-3 text-[26px] font-semibold leading-none text-ink sm:text-[30px]">
            Roll a prompt
          </h1>
        </div>
        <Button variant="primary" onClick={generate}>
          <Icon name="shuffle" /> Generate
          <kbd className="ml-1 rounded border border-white/20 bg-white/10 px-1 font-mono text-[9.5px]">I</kbd>
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* ── slots ── */}
        <section className="space-y-2 rounded-2xl border border-line bg-surface p-3.5">
          {ORDER.map((k) => {
            const active = on[k];
            return (
              <div
                key={k}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border p-2 transition-all duration-200",
                  active ? "border-line bg-canvas-2/50" : "border-transparent opacity-45",
                )}
              >
                <button
                  onClick={() => setOn((s) => ({ ...s, [k]: !s[k] }))}
                  title={active ? "Disable slot" : "Enable slot"}
                  className={cn(
                    "relative h-5 w-8 shrink-0 rounded-full transition-colors duration-200",
                    active ? "bg-accent" : "bg-line-2",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                      active ? "translate-x-[15px]" : "translate-x-0.5",
                    )}
                  />
                </button>

                <Icon
                  name={BANK_ICON[k]}
                  className={cn("h-3.5 w-3.5 shrink-0", active ? "text-accent" : "text-ink-3")}
                />

                <div className="min-w-0 flex-1">
                  <Micro>{BANK_LABELS[k]}</Micro>
                  <div className="truncate text-[12.5px] leading-tight text-ink">
                    {values[k] ?? <span className="text-ink-3">—</span>}
                  </div>
                </div>

                <IconButton
                  icon="dice"
                  label={`Reroll ${BANK_LABELS[k]}`}
                  size="iconSm"
                  disabled={!active}
                  onClick={() => setValues((v) => ({ ...v, [k]: pick(BANKS[k]) }))}
                />
              </div>
            );
          })}
        </section>

        {/* ── output + save ── */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-accent-line bg-accent-soft/30 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Icon name="sparkle" className="h-3 w-3 text-accent" />
              <Micro>Output</Micro>
              <span className="ml-auto text-[10.5px] tabular-nums text-ink-3">
                {tokenCount(text)} tokens
              </span>
            </div>
            <TextArea
              rows={7}
              value={text}
              onChange={(e) => setOutput(e.target.value)}
              placeholder="Hit Generate to compose a prompt…"
              className="border-transparent bg-surface/70 text-[13px]"
            />
            <div className="mt-3 flex items-center gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  if (!text) return;
                  if (await copyText(text)) {
                    db.registerUse("adhoc", text);
                    toast("Idea copied");
                  }
                }}
              >
                <Icon name="copy" className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={generate}>
                <Icon name="dice" className="h-3.5 w-3.5" /> Reroll
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-line bg-surface p-3.5 sm:grid-cols-3">
            <Cell label="Media" icon={media === "video" ? "video" : "image"}>
              <Select
                icon={media === "video" ? "video" : "image"}
                value={media}
                onChange={(e) => setMedia(e.target.value as MediaType)}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </Select>
            </Cell>
            <Cell label="Model" icon="bolt">
              <Select icon="bolt" value={model} onChange={(e) => setModel(e.target.value)}>
                {ALL_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Cell>
            <Cell label="Aspect" icon="sliders">
              <Select icon="sliders" value={aspect} onChange={(e) => setAspect(e.target.value)}>
                {ASPECT_RATIOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Cell>
            <div className="col-span-2 sm:col-span-3">
              <Cell label="Category" icon="tag">
                <Select icon="tag" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_EMOJI[c]} {c}
                    </option>
                  ))}
                </Select>
              </Cell>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <TextInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={values.subject ? values.subject.slice(0, 34) : "Title…"}
              />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <Button variant="primary" className="w-full" onClick={save}>
                <Icon name="plus" /> Save to library
              </Button>
            </div>
          </div>

          {log.length > 1 ? (
            <div className="rounded-2xl border border-line bg-surface p-3.5">
              <div className="mb-2 flex items-center gap-1.5">
                <Icon name="clock" className="h-3 w-3 text-ink-3" />
                <Micro>Session</Micro>
              </div>
              <ul className="space-y-0.5">
                {log.map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setOutput(item)}
                      className="line-clamp-1 w-full rounded-lg px-2 py-1.5 text-left text-[11.5px] text-ink-3 transition hover:bg-surface-2 hover:text-ink"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
