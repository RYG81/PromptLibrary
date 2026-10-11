import { useState } from "react";
import type { AppState, Prompt } from "../lib/types";
import { CATEGORY_EMOJI } from "../lib/types";
import { cn, extractVars, timeAgo, tokenCount } from "../lib/utils";
import { db } from "../lib/db";
import { CopyButton, Icon, IconButton, useToast } from "./ui";

function Mark({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safe})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

function Meta({ icon, children, title }: { icon: string; children: React.ReactNode; title: string }) {
  return (
    <span title={title} className="mono inline-flex items-center gap-1 text-[10px] tabular-nums text-ink-3">
      <Icon name={icon} className="h-3 w-3" strokeWidth={1.9} />
      {children}
    </span>
  );
}

export default function PromptCard({
  prompt,
  state,
  layout,
  query,
  onEdit,
  onRun,
  onTagClick,
}: {
  prompt: Prompt;
  state: AppState;
  layout: "grid" | "list";
  query: string;
  onEdit: (p: Prompt) => void;
  onRun: (p: Prompt) => void;
  onTagClick: (tag: string) => void;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const collection = state.collections.find((c) => c.id === prompt.collectionId);
  const vars = extractVars(prompt.prompt);
  const tokens = tokenCount(prompt.prompt) + tokenCount(prompt.negative);
  const isVideo = prompt.media === "video";
  const loras = (prompt.resources ?? []).filter((r) => r.type.toLowerCase().includes("lora"));

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-xl border border-line bg-surface transition-all duration-200",
        "hover:-translate-y-px hover:border-line-2 hover:shadow-card",
        layout === "grid" ? "flex-col" : "flex-row",
      )}
    >
      {/* ── preview ── */}
      <button
        onClick={() => onRun(prompt)}
        title="Open prompt"
        className={cn(
          "relative shrink-0 overflow-hidden border-line bg-canvas-2 text-left transition-colors",
          layout === "grid" ? "aspect-[16/9] w-full border-b" : "w-36 border-r sm:w-44",
        )}
      >
        {prompt.image ? (
          <img src={prompt.image} alt={prompt.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
        ) : (
          <span
            className="grain absolute inset-0 block"
            style={{
              backgroundImage:
                "radial-gradient(circle at 26% 24%, var(--pf-glow-a), transparent 58%), radial-gradient(circle at 78% 82%, var(--pf-glow-b), transparent 55%)",
            }}
          />
        )}

        <span
          className={cn(
            "mono absolute left-2 top-2 inline-flex items-center gap-1 rounded px-1.5 py-[3px] text-[9px] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm",
          )}
          style={{ background: isVideo ? "var(--pf-teal)" : "rgba(0,0,0,.55)" }}
        >
          <Icon name={isVideo ? "video" : "image"} className="h-2.5 w-2.5" strokeWidth={2.4} />
          {isVideo ? "vid" : "img"}
        </span>

        <span className="absolute bottom-2 left-2 text-[15px] leading-none" title={prompt.category}>
          {CATEGORY_EMOJI[prompt.category] ?? "•"}
        </span>

        {!prompt.image ? (
          <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="mono rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
              open
            </span>
          </span>
        ) : null}
      </button>

      {/* ── body ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2 border-b border-line-3 px-3.5 py-2.5">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                autoFocus
                defaultValue={prompt.title}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== prompt.title) db.patchPrompt(prompt.id, { title: v });
                  setRenaming(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="w-full rounded border border-accent-line bg-surface px-1 text-[13.5px] font-semibold text-ink outline-none"
              />
            ) : (
              <h3
                className="display cursor-text truncate text-[13.5px] font-semibold text-ink"
                title="Double-click to rename"
                onDoubleClick={() => setRenaming(true)}
              >
                <Mark text={prompt.title} query={query} />
              </h3>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="mono rounded border border-line bg-surface-2 px-1.5 py-[1px] text-[9.5px] font-medium text-ink-2">
                {prompt.model}
              </span>
              <span className="truncate text-[10.5px] text-ink-3">{prompt.category}</span>
              {prompt.source && prompt.source !== "starter" && prompt.source !== "custom" ? (
                <span className="mono rounded bg-teal-soft px-1 py-0.5 text-[9px] text-teal">{prompt.source}</span>
              ) : null}
              {prompt.safetyRating && prompt.safetyRating !== "PG" ? (
                <span
                  className={cn(
                    "mono rounded px-1 py-0.5 text-[9px] font-medium",
                    ["R", "X", "XXX", "Unrated"].includes(prompt.safetyRating)
                      ? "bg-warn/10 text-warn"
                      : "bg-surface-2 text-ink-3",
                  )}
                >
                  {prompt.safetyRating}
                </span>
              ) : null}
            </div>
          </div>

          <button
            onClick={() => db.toggleFavorite(prompt.id)}
            title={prompt.favorite ? "Remove favorite" : "Favorite"}
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-all active:scale-90",
              prompt.favorite
                ? "border-warn/40 bg-warn/10 text-warn"
                : "border-transparent text-ink-3 hover:border-line hover:bg-surface-2 hover:text-warn",
            )}
          >
            <Icon name="star" className={cn("h-3.5 w-3.5", prompt.favorite && "fill-current")} />
          </button>
        </div>

        <div className="flex-1 space-y-2 px-3.5 py-2.5">
          <p className={cn("text-[12px] leading-relaxed text-ink-2", layout === "grid" ? "line-clamp-3" : "line-clamp-2")}>
            <Mark text={prompt.prompt} query={query} />
          </p>

          {vars.length ? (
            <div className="flex flex-wrap items-center gap-1">
              <Icon name="wand" className="h-3 w-3 text-accent-text dark:text-accent" />
              {vars.slice(0, 3).map((v) => (
                <code key={v} className="mono rounded bg-accent-soft px-1 py-[1px] text-[9.5px] font-medium text-accent-text dark:text-accent">
                  {v}
                </code>
              ))}
            </div>
          ) : null}

          {loras.length ? (
            <div className="flex flex-wrap items-center gap-1">
              <Icon name="layers" className="h-3 w-3 text-teal" />
              {loras.slice(0, 4).map((l, i) => (
                <span key={`${l.modelVersionId ?? l.name ?? "lora"}-${i}`} className="mono rounded bg-teal-soft px-1 py-[1px] text-[9.5px] text-teal">
                  {l.name || (l.modelVersionId ? `v${l.modelVersionId}` : "LoRA")}{l.weight !== undefined ? ` · ${l.weight}` : ""}
                </span>
              ))}
            </div>
          ) : null}

          {prompt.tags.length ? (
            <div className="flex flex-wrap gap-1">
              {prompt.tags.slice(0, layout === "grid" ? 4 : 6).map((t) => (
                <button
                  key={t}
                  onClick={() => onTagClick(t)}
                  title={`Filter by #${t}`}
                  className="mono rounded border border-line px-1.5 py-[1px] text-[9.5px] text-ink-3 transition-colors hover:border-accent-line hover:text-accent-text dark:hover:text-accent"
                >
                  {t}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* metadata strip */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-line-3 px-3.5 py-1.5">
          <Meta icon="bolt" title="Estimated tokens">{tokens}</Meta>
          <Meta icon="clock" title={new Date(prompt.updatedAt).toLocaleString()}>{timeAgo(prompt.updatedAt)}</Meta>
          <Meta icon="copy" title="Times copied">{prompt.uses}</Meta>
          <Meta icon="sliders" title="Aspect ratio">{prompt.aspectRatio}</Meta>
          {prompt.seed ? <Meta icon="dice" title="Seed">{prompt.seed}</Meta> : null}
          {prompt.sourceAuthor ? <Meta icon="user" title="Source creator">{prompt.sourceAuthor}</Meta> : null}
          {prompt.sourceUrl ? (
            <a
              href={prompt.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mono ml-auto inline-flex items-center gap-1 text-[9.5px] text-accent-text underline decoration-accent-line underline-offset-2 hover:text-accent dark:text-accent"
            >
              source <Icon name="arrowRight" className="h-2.5 w-2.5" />
            </a>
          ) : null}
          {collection ? <span className="text-[11px]" title={collection.name}>{collection.emoji}</span> : null}
        </div>

        {/* actions — always visible, no hover-guessing */}
        <div className="flex items-center gap-1.5 border-t border-line bg-canvas-2/40 px-2.5 py-2">
          <CopyButton
            text={prompt.prompt}
            label="Copy"
            size="sm"
            className="flex-1"
            onCopied={(ok) => {
              if (ok) {
                db.registerUse(prompt.id, prompt.prompt);
                toast("Prompt copied");
              } else toast("Clipboard blocked", "warn");
            }}
          />
          <IconButton icon="wand" label="Open & fill variables" size="iconSm" variant="outline" onClick={() => onRun(prompt)} />
          <IconButton icon="pencil" label="Edit" size="iconSm" variant="outline" onClick={() => onEdit(prompt)} />
          <IconButton
            icon="layers"
            label="Duplicate"
            size="iconSm"
            variant="outline"
            onClick={() => {
              const c = db.duplicatePrompt(prompt.id);
              if (c) {
                toast("Duplicated");
                onEdit(c);
              }
            }}
          />
          <IconButton
            icon={confirming ? "check" : "trash"}
            label={confirming ? "Click again to confirm" : "Delete"}
            size="iconSm"
            variant="outline"
            className={confirming ? "border-danger/50 text-danger" : ""}
            onClick={() => {
              if (confirming) {
                db.deletePrompt(prompt.id);
                toast("Deleted", "warn");
              } else {
                setConfirming(true);
                setTimeout(() => setConfirming(false), 2200);
              }
            }}
          />
        </div>
      </div>
    </article>
  );
}
