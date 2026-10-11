import type { Prompt } from "./types";
import { applyVars } from "./utils";

/** Builds the final copy-paste string, adding native flags for models that support them. */
export function compile(p: Prompt, values?: Record<string, string>): string {
  const body = (values ? applyVars(p.prompt, values) : p.prompt).trim();
  const flags: string[] = [];
  const m = p.model.toLowerCase();
  const supportsFlags = m.includes("midjourney") || m.includes("niji") || m.includes("ideogram");
  if (supportsFlags) {
    if (p.aspectRatio) flags.push(`--ar ${p.aspectRatio}`);
    if (p.seed.trim()) flags.push(`--seed ${p.seed.trim()}`);
  }
  return flags.length ? `${body} ${flags.join(" ")}` : body;
}

/** Metadata block for models without native flags (handy for SD/Comfy workflows). */
export function compileMeta(p: Prompt): string {
  return [
    `model: ${p.model}`,
    `aspect: ${p.aspectRatio}`,
    p.seed.trim() ? `seed: ${p.seed.trim()}` : null,
    p.negative.trim() ? `negative: ${p.negative.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function compileAll(p: Prompt, values?: Record<string, string>): string {
  const main = compile(p, values);
  return p.negative.trim() ? `${main}\n\nNegative: ${p.negative.trim()}` : main;
}
