import { useEffect, useMemo, useState } from "react";
import type { Prompt } from "../lib/types";
import { CATEGORY_EMOJI } from "../lib/types";
import { compile, compileMeta } from "../lib/compile";
import { applyVars, cn, copyText, extractVars, tokenCount } from "../lib/utils";
import { db } from "../lib/db";
import { Button, CopyButton, Icon, IconButton, Micro, Modal, useToast } from "./ui";

export default function RunDialog({
  prompt,
  onClose,
  onRemix,
  onEdit,
}: {
  prompt: Prompt | null;
  onClose: () => void;
  onRemix?: (p: Prompt) => void;
  onEdit?: (p: Prompt) => void;
}) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>({});

  const vars = useMemo(() => (prompt ? extractVars(prompt.prompt) : []), [prompt?.id]);
  const [flash, setFlash] = useState(false);

  useEffect(() => setValues({}), [prompt?.id]);

  const finalPreview = useMemo(() => (prompt ? compile(prompt, values) : ""), [prompt, values]);

  /* keyboard: C copies, E edits — both work while the dialog is open */
  useEffect(() => {
    if (!prompt) return;
    const onKey = async (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "c") {
        e.preventDefault();
        const ok = await copyText(finalPreview);
        if (ok) {
          db.registerUse(prompt.id, finalPreview);
          setFlash(true);
          setTimeout(() => setFlash(false), 900);
          toast("Prompt copied  ·  C");
        } else toast("Clipboard blocked", "warn");
      } else if (k === "e") {
        e.preventDefault();
        onEdit?.(prompt);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prompt, finalPreview, onEdit, onClose, toast]);

  if (!prompt) return null;

  const filled = vars.every((v) => (values[v] ?? "").trim().length > 0);
  const resolvedBody = applyVars(prompt.prompt, values);
  const finalText = compile(prompt, values);

  return (
    <Modal
      open
      onClose={onClose}
      wide
      icon="wand"
      title={prompt.title}
      subtitle={
        <span className="inline-flex items-center gap-1.5">
          <span>{CATEGORY_EMOJI[prompt.category] ?? "•"} {prompt.category}</span>
          <span className="opacity-40">·</span>
          <span>{prompt.model}</span>
          <span className="opacity-40">·</span>
          <span>{prompt.media === "video" ? "video" : "image"}</span>
        </span>
      }
    >
      <div className="max-h-[calc(100vh-11rem)] space-y-4 overflow-y-auto p-5">
        {vars.length ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Icon name="wand" className="h-3 w-3 text-accent-2" />
              <Micro>Variables</Micro>
              <span className="ml-auto text-[10.5px] text-ink-3">
                {filled ? "ready" : `${vars.filter((v) => !(values[v] ?? "").trim()).length} empty`}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {vars.map((v) => (
                <label key={v} className="group flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 transition focus-within:border-accent-line">
                  <code className="shrink-0 rounded bg-accent-2/10 px-1.5 py-0.5 text-[10.5px] font-medium text-accent-2">
                    {v}
                  </code>
                  <input
                    autoFocus={vars.length === 1}
                    value={values[v] ?? ""}
                    onChange={(e) => setValues((s) => ({ ...s, [v]: e.target.value }))}
                    placeholder={`value for ${v}`}
                    className="h-9 min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3/70"
                  />
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {/* output */}
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-accent-line bg-accent-soft/50 p-4 transition-shadow",
            flash && "ring-pulse",
          )}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <Icon name="sparkle" className="h-3 w-3 text-accent" />
            <Micro>Final prompt</Micro>
            <kbd className="mono ml-auto rounded border border-line bg-surface px-1.5 py-0.5 text-[9.5px] text-ink-3">C copy</kbd>
            <kbd className="mono rounded border border-line bg-surface px-1.5 py-0.5 text-[9.5px] text-ink-3">E edit</kbd>
            <span className="mono text-[10px] tabular-nums text-ink-3">{tokenCount(finalText)} tok</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink">
            {resolvedBody || "—"}
          </p>
          {finalText !== resolvedBody ? (
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-accent">
              {finalText.slice(resolvedBody.length)}
            </p>
          ) : null}
          {prompt.negative.trim() ? (
            <div className="mt-3 border-t border-accent-line/50 pt-2.5">
              <Micro>Negative</Micro>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{prompt.negative}</p>
            </div>
          ) : null}
        </div>

        {prompt.notes.trim() ? (
          <div className="flex gap-2 rounded-xl border border-line bg-canvas-2/50 p-3 text-[12px] leading-relaxed text-ink-2">
            <Icon name="book" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
            <span>{prompt.notes}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-canvas-2/50 px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <CopyButton
            text={finalText}
            label="Copy prompt"
            size="sm"
            onCopied={(ok) => {
              if (ok) {
                db.registerUse(prompt.id, finalText);
                toast("Prompt copied");
              } else toast("Clipboard blocked", "warn");
            }}
          />
          {prompt.negative.trim() ? (
            <CopyButton
              text={compileMeta(prompt)}
              label="Copy settings"
              variant="outline"
              size="sm"
              onCopied={(ok) => ok && toast("Settings copied")}
            />
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            icon="shuffle"
            label="Create a remix copy"
            size="iconSm"
            variant="outline"
            onClick={() => {
              const copy = db.duplicatePrompt(prompt.id);
              if (copy) {
                onRemix?.(copy);
                toast("Remix created", "info");
              }
              onClose();
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onEdit?.(prompt);
              onClose();
            }}
          >
            <Icon name="pencil" className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
