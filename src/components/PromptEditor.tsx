import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../lib/db";
import { ASPECT_RATIOS, ALL_MODELS, CATEGORIES, type Prompt, type SafetyRating } from "../lib/types";
import { QUICK_TAGS } from "../lib/seed";
import { cn, compressImage, extractVars, tokenCount } from "../lib/utils";
import { compileAll } from "../lib/compile";
import {
  Button,
  Cell,
  Icon,
  IconButton,
  Micro,
  Modal,
  Select,
  TextArea,
  TextInput,
  useToast,
} from "./ui";

const SNIPPETS: { label: string; text: string; group: string }[] = [
  { group: "Light", label: "golden hour", text: "golden hour rim light" },
  { group: "Light", label: "overcast", text: "soft overcast diffusion" },
  { group: "Light", label: "spotlight", text: "hard single-source spotlight" },
  { group: "Light", label: "neon", text: "neon practical lights" },
  { group: "Light", label: "chiaroscuro", text: "candlelit chiaroscuro" },
  { group: "Light", label: "moonlight", text: "cold blue moonlight" },
  { group: "Camera", label: "35mm", text: "shot on 35mm film, shallow depth of field" },
  { group: "Camera", label: "85mm", text: "85mm portrait lens, f/1.8" },
  { group: "Camera", label: "macro", text: "100mm macro, extreme detail" },
  { group: "Camera", label: "wide", text: "wide symmetrical composition, 24mm" },
  { group: "Camera", label: "anamorphic", text: "anamorphic lens, 2.39:1" },
  { group: "Style", label: "cinematic", text: "cinematic film still" },
  { group: "Style", label: "gouache", text: "gouache illustration on cold-press paper" },
  { group: "Style", label: "octane 3d", text: "hyper-real 3d render, octane, soft AO" },
  { group: "Style", label: "diorama", text: "isometric diorama, clay material, tilt-shift" },
  { group: "Style", label: "risograph", text: "risograph print, 2 spot colours" },
  { group: "Motion", label: "dolly in", text: "camera slowly dollies forward" },
  { group: "Motion", label: "orbit", text: "camera orbits subject, 180 degree arc" },
  { group: "Motion", label: "tracking", text: "lateral tracking shot alongside subject" },
  { group: "Motion", label: "crane up", text: "crane up revealing the scene" },
  { group: "Motion", label: "handheld", text: "handheld documentary camera, subtle shake" },
  { group: "Motion", label: "aerial", text: "aerial push forward, drone movement" },
  { group: "Finish", label: "film grain", text: "fine film grain, kodak portra 400" },
  { group: "Finish", label: "volumetric", text: "volumetric fog and dust motes" },
  { group: "Finish", label: "sss", text: "subsurface scattering, realistic skin" },
  { group: "Finish", label: "8k detail", text: "extreme texture detail, ultra sharp" },
];

const GROUPS: string[] = Array.from(new Set(SNIPPETS.map((s) => s.group)));

export default function PromptEditor({
  prompt,
  open,
  onClose,
  state,
  isNew = false,
}: {
  prompt: Prompt | null;
  open: boolean;
  onClose: () => void;
  isNew?: boolean;
  state: {
    collections: { id: string; name: string; emoji: string }[];
    settings: { defaultModel: string; defaultNegative: string };
  };
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Prompt | null>(prompt);
  const [tagInput, setTagInput] = useState("");
  const [group, setGroup] = useState("Light");
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(prompt), [prompt]);

  const set = <K extends keyof Prompt>(key: K, value: Prompt[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const vars = useMemo(() => (draft ? extractVars(draft.prompt) : []), [draft?.prompt]);
  const compiled = useMemo(() => (draft ? compileAll(draft) : ""), [draft]);

  if (!open || !draft) return null;

  const groups = GROUPS;

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-");
    if (!t || draft.tags.includes(t)) return;
    set("tags", [...draft.tags, t]);
  };

  const insertAtCursor = (text: string) => {
    const el = areaRef.current;
    if (!el) {
      set("prompt", `${draft.prompt}${draft.prompt && !draft.prompt.endsWith(" ") ? " " : ""}${text}`);
      return;
    }
    const start = el.selectionStart ?? draft.prompt.length;
    const end = el.selectionEnd ?? start;
    const before = draft.prompt.slice(0, start);
    const after = draft.prompt.slice(end);
    const pad = before && !/[,\s]$/.test(before) ? ", " : "";
    const next = `${before}${pad}${text}${after && !/^[,\s]/.test(after) ? " " : ""}${after}`;
    set("prompt", next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = (before + pad + text).length;
      el.setSelectionRange(pos, pos);
    });
  };

  const save = () => {
    if (!draft.prompt.trim() && !draft.title.trim()) {
      toast("Add a title or prompt first", "warn");
      return;
    }
    db.upsertPrompt({ ...draft, title: draft.title.trim() || draft.prompt.slice(0, 48) });
    toast(isNew ? "Prompt created" : "Saved");
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      icon="wand"
      title={isNew ? "New prompt" : draft.title || "Edit prompt"}
      subtitle={
        <span className="inline-flex items-center gap-2">
          <span>{tokenCount(draft.prompt)} tokens</span>
          {vars.length ? (
            <>
              <span className="opacity-40">·</span>
              <span className="text-accent">{vars.length} variable{vars.length > 1 ? "s" : ""}</span>
            </>
          ) : null}
        </span>
      }
    >
      <div className="grid max-h-[calc(100vh-11rem)] grid-cols-1 overflow-y-auto lg:grid-cols-[1.55fr_1fr]">
        {/* ═══════════ LEFT: content ═══════════ */}
        <div className="space-y-4 border-line p-5 lg:border-r">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm">
              {draft.title.trim() ? draft.title.trim().charAt(0).toUpperCase() : "?"}
            </span>
            <TextInput
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Untitled prompt…"
              className="flex-1 border-transparent bg-transparent px-1 text-[15px] font-semibold hover:border-line focus:border-accent-line focus:bg-surface"
            />
            <IconButton
              icon="star"
              label={draft.favorite ? "Remove favorite" : "Favorite"}
              size="icon"
              active={draft.favorite}
              className={draft.favorite ? "text-warn" : ""}
              onClick={() => set("favorite", !draft.favorite)}
            />
          </div>

          {/* prompt */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Icon name="sparkle" className="h-3 w-3 text-accent" />
                <Micro>Prompt</Micro>
              </span>
              <button
                onClick={() => insertAtCursor("{{subject}}")}
                className="inline-flex items-center gap-1 rounded-md border border-accent-2/30 bg-accent-2/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-2 transition hover:bg-accent-2/20"
              >
                <Icon name="wand" className="h-2.5 w-2.5" /> add variable
              </button>
            </div>
            <TextArea
              ref={areaRef}
              rows={7}
              value={draft.prompt}
              onChange={(e) => set("prompt", e.target.value)}
              placeholder="cinematic photo of {{subject}} in a rain-soaked alley, volumetric fog, 35mm…"
              className="text-[13px]"
            />
          </div>

          {/* modifier palette */}
          <div className="rounded-xl border border-line bg-canvas-2/50 p-2.5">
            <div className="mb-2 flex items-center gap-1">
              <Icon name="bolt" className="h-3 w-3 text-ink-3" />
              <Micro>Modifiers</Micro>
              <div className="ml-auto flex gap-0.5">
                {groups.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroup(g)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10.5px] font-medium transition-colors",
                      group === g ? "bg-accent-soft text-accent" : "text-ink-3 hover:text-ink-2",
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {SNIPPETS.filter((s) => s.group === group).map((s) => (
                <button
                  key={s.label}
                  onClick={() => insertAtCursor(s.text)}
                  className="rounded-lg border border-line bg-surface px-2 py-1 text-[11px] text-ink-2 transition-all hover:border-accent-line hover:text-accent active:scale-95"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* negative */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Icon name="x" className="h-3 w-3 text-danger" />
                <Micro>Negative</Micro>
              </span>
              <button
                onClick={() => set("negative", state.settings.defaultNegative)}
                className="text-[10.5px] font-medium text-accent hover:underline"
              >
                default
              </button>
            </div>
            <TextArea
              rows={2}
              value={draft.negative}
              onChange={(e) => set("negative", e.target.value)}
              placeholder="blurry, watermark, extra limbs…"
              className="text-[12.5px]"
            />
          </div>

          {/* notes */}
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5">
              <Icon name="book" className="h-3 w-3 text-ink-3" />
              <Micro>Notes</Micro>
            </span>
            <TextArea
              rows={2}
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="What worked, parameters to try next…"
              className="text-[12.5px]"
            />
          </div>
        </div>

        {/* ═══════════ RIGHT: settings ═══════════ */}
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2.5">
            <Cell label="Media" icon={draft.media === "video" ? "video" : "image"}>
              <Select
                icon={draft.media === "video" ? "video" : "image"}
                value={draft.media}
                onChange={(e) => {
                  const m = e.target.value as "image" | "video";
                  set("media", m);
                  if (m === "video" && !draft.category.startsWith("Video")) set("category", "Video · Cinematic");
                  if (m === "image" && draft.category.startsWith("Video")) set("category", "Cinematic");
                }}
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
              </Select>
            </Cell>
            <Cell label="Model" icon="bolt">
              <Select icon="bolt" value={draft.model} onChange={(e) => set("model", e.target.value)}>
                {!(ALL_MODELS as readonly string[]).includes(draft.model) ? (
                  <option value={draft.model}>{draft.model} · imported base model</option>
                ) : null}
                {ALL_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Cell>
            <Cell label="Category" icon="tag">
              <Select icon="tag" value={draft.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Cell>
            <Cell label="Aspect" icon="sliders">
              <Select icon="sliders" value={draft.aspectRatio} onChange={(e) => set("aspectRatio", e.target.value)}>
                {ASPECT_RATIOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Cell>
            <Cell label="Seed" icon="dice">
              <div className="relative">
                <Icon name="dice" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
                <input
                  value={draft.seed}
                  onChange={(e) => set("seed", e.target.value)}
                  placeholder="auto"
                  inputMode="numeric"
                  className="h-9 w-full rounded-xl border border-line bg-surface pl-8 pr-8 text-[12.5px] font-medium text-ink-2 placeholder:text-ink-3/70 outline-none transition hover:border-line-2 focus:border-accent-line"
                />
                <button
                  title="Randomise seed"
                  onClick={() => set("seed", String(Math.floor(Math.random() * 999999)))}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-3 transition hover:bg-surface-2 hover:text-accent"
                >
                  <Icon name="shuffle" className="h-3 w-3" />
                </button>
              </div>
            </Cell>
            <Cell label="Collection" icon="folder">
              <Select icon="folder" value={draft.collectionId ?? ""} onChange={(e) => set("collectionId", e.target.value || null)}>
                <option value="">Unfiled</option>
                {state.collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </Select>
            </Cell>
          </div>

          {/* tags */}
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5">
              <Icon name="tag" className="h-3 w-3 text-ink-3" />
              <Micro>Tags</Micro>
            </span>
            <div className="flex gap-1.5">
              <TextInput
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagInput);
                    setTagInput("");
                  }
                }}
                placeholder="Add tag…"
              />
            </div>
            {draft.tags.length ? (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {draft.tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => set("tags", draft.tags.filter((x) => x !== t))}
                    className="group inline-flex items-center gap-1 rounded-md border border-accent-line bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-medium text-accent"
                  >
                    {t}
                    <Icon name="x" className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-1 pt-0.5">
              {QUICK_TAGS.filter((t) => !draft.tags.includes(t))
                .slice(0, 8)
                .map((t) => (
                  <button
                    key={t}
                    onClick={() => addTag(t)}
                    className="rounded-md border border-line px-1.5 py-0.5 text-[10.5px] text-ink-3 transition hover:border-accent-line hover:text-accent"
                  >
                    +{t}
                  </button>
                ))}
            </div>
          </div>

          {/* provenance / rating / LoRA resources */}
          <div className="space-y-2 rounded-xl border border-line bg-canvas-2/40 p-2.5">
            <div className="flex items-center gap-1.5">
              <Icon name="link" className="h-3 w-3 text-teal" />
              <Micro>Source &amp; rating</Micro>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Cell label="Source" icon="book">
                <TextInput value={draft.source ?? "custom"} onChange={(e) => set("source", e.target.value)} placeholder="custom / Civitai" />
              </Cell>
              <Cell label="Rating" icon="shield">
                <Select
                  icon="shield"
                  value={draft.safetyRating ?? "PG"}
                  onChange={(e) => {
                    const rating = e.target.value as SafetyRating;
                    set("safetyRating", rating);
                    set("isNsfw", ["R", "X", "XXX"].includes(rating));
                  }}
                >
                  {(["PG", "PG-13", "R", "X", "XXX", "Unrated"] as SafetyRating[]).map((rating) => (
                    <option key={rating} value={rating}>{rating}</option>
                  ))}
                </Select>
              </Cell>
              <Cell label="Creator" icon="user">
                <TextInput value={draft.sourceAuthor ?? ""} onChange={(e) => set("sourceAuthor", e.target.value)} placeholder="creator username" />
              </Cell>
              <Cell label="Source URL" icon="link">
                <TextInput value={draft.sourceUrl ?? ""} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://…" />
              </Cell>
            </div>
            {draft.resources?.length ? (
              <div className="border-t border-line pt-2">
                <div className="mb-1 flex items-center gap-1.5">
                  <Icon name="layers" className="h-3 w-3 text-teal" />
                  <Micro>Model resources / LoRAs</Micro>
                </div>
                <div className="flex flex-wrap gap-1">
                  {draft.resources.map((r, i) => (
                    <span key={`${r.modelVersionId ?? r.name ?? r.type}-${i}`} className="mono rounded border border-teal-line bg-teal-soft px-1.5 py-0.5 text-[9.5px] text-teal">
                      {r.name || r.type}{r.modelVersionId ? ` · #${r.modelVersionId}` : ""}{r.weight !== undefined ? ` · ${r.weight}` : ""}{r.trigger ? ` · ${r.trigger}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* reference */}
          <div className="space-y-1.5">
            <span className="flex items-center gap-1.5">
              <Icon name="image" className="h-3 w-3 text-ink-3" />
              <Micro>Reference</Micro>
            </span>
            {draft.image ? (
              <div className="relative overflow-hidden rounded-xl border border-line">
                <img src={draft.image} alt="reference" className="h-32 w-full object-cover" />
                <IconButton
                  icon="trash"
                  label="Remove image"
                  size="iconSm"
                  onClick={() => set("image", null)}
                  className="absolute right-1.5 top-1.5 text-white"
                />
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-2 text-ink-3 transition-all hover:border-accent-line hover:text-accent"
              >
                <Icon name="image" className="h-5 w-5" />
                <span className="text-[11px] font-medium">Attach reference</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  set("image", await compressImage(file));
                } catch {
                  toast("Could not read that image", "warn");
                }
              }}
            />
          </div>

          {/* compiled preview */}
          <div className="rounded-xl border border-line bg-canvas-2/60 p-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Icon name="copy" className="h-3 w-3 text-ink-3" />
              <Micro>Compiled</Micro>
            </div>
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words text-[11.5px] leading-relaxed text-ink-2">
              {compiled || "—"}
            </pre>
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between gap-2 border-t border-line bg-canvas-2/40 px-5 py-3">
        <div className="flex items-center gap-2">
          {!isNew ? (
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  db.deletePrompt(draft.id);
                  toast("Deleted", "warn");
                  onClose();
                }}
              >
                <Icon name="trash" className="h-3.5 w-3.5" /> Delete
              </Button>
              {prompt && prompt.uses > 0 ? (
                <span className="text-[11px] text-ink-3">used {prompt.uses}×</span>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            <Icon name="check" className="h-3.5 w-3.5" /> {isNew ? "Create" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
