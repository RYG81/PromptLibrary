import type { MediaType, PromptDraft, PromptResource, SafetyRating } from "./types";

export type CivitaiSort = "Most Reactions" | "Most Comments" | "Most Collected" | "Newest" | "Oldest" | "Random";
export type RatingScope = "sfw" | "adult" | "all";

export type CivitaiImage = {
  id: number;
  url?: string;
  type?: string;
  width?: number;
  height?: number;
  nsfw?: boolean;
  nsfwLevel?: string | number;
  browsingLevel?: number;
  createdAt?: string;
  postId?: number;
  username?: string;
  baseModel?: string;
  modelVersionIds?: number[];
  stats?: { likeCount?: number; heartCount?: number };
  meta?: Record<string, unknown> | null;
};

export type CivitaiModel = {
  id: number;
  name: string;
  type?: string;
  nsfw?: boolean;
  creator?: { username?: string };
  tags?: string[];
  modelVersions?: {
    id: number;
    name?: string;
    baseModel?: string;
    trainedWords?: string[];
    stats?: { downloadCount?: number };
  }[];
};

export type ApiPage<T> = { items?: T[]; metadata?: { nextCursor?: string | null } };

export class SourceError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "SourceError";
  }
}

async function getJSON<T>(url: string, token?: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(token?.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
      },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new SourceError("Could not reach this source. Check your connection or try JSON/CSV import instead.");
  }
  if (response.status === 429) {
    const retry = response.headers.get("Retry-After");
    throw new SourceError(`Rate limited by source${retry ? ` — wait ${retry}s` : " — wait a moment"}.`, 429);
  }
  if (!response.ok) {
    const msg = response.status === 401 || response.status === 403
      ? "Civitai rejected this API token or the account cannot see these results."
      : `Source request failed (${response.status}).`;
    throw new SourceError(msg, response.status);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new SourceError("The source returned invalid JSON.");
  }
}

function assertCivitaiToken(token: string) {
  if (!token.trim()) throw new SourceError("Add a Civitai API token first. The token is used for this request only and is not saved.");
}

function bearerValue(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, "");
}

export async function searchCivitaiImages({
  token,
  scope,
  media,
  sort,
  queryType,
  query,
  cursor,
  signal,
}: {
  token: string;
  scope: RatingScope;
  media: MediaType;
  sort: CivitaiSort;
  queryType: "feed" | "model" | "creator" | "post" | "base";
  query: string;
  cursor?: string | null;
  signal?: AbortSignal;
}): Promise<ApiPage<CivitaiImage>> {
  assertCivitaiToken(token);
  const params = new URLSearchParams({
    limit: "100",
    sort,
    period: "Month",
    withMeta: "true",
    type: media,
    browsingLevel: scope === "sfw" ? "3" : scope === "adult" ? "28" : "31",
  });
  if (query.trim()) {
    if (queryType === "model") params.set("modelId", query.trim());
    if (queryType === "creator") params.set("username", query.trim());
    if (queryType === "post") params.set("postId", query.trim());
    if (queryType === "base") params.set("baseModels", query.trim());
  }
  if (cursor) params.set("cursor", cursor);
  return getJSON<ApiPage<CivitaiImage>>(`https://civitai.com/api/v1/images?${params}`, bearerValue(token), signal);
}

export async function searchCivitaiLoras({
  token,
  query,
  scope,
  cursor,
  signal,
}: {
  token: string;
  query: string;
  scope: RatingScope;
  cursor?: string | null;
  signal?: AbortSignal;
}): Promise<ApiPage<CivitaiModel>> {
  assertCivitaiToken(token);
  const params = new URLSearchParams({
    limit: "50",
    types: "LORA",
    sort: "Most Downloaded",
    nsfw: String(scope !== "sfw"),
  });
  if (query.trim()) params.set("query", query.trim());
  if (cursor) params.set("cursor", cursor);
  return getJSON<ApiPage<CivitaiModel>>(`https://civitai.com/api/v1/models?${params}`, bearerValue(token), signal);
}

export type LexicaImage = {
  id?: string;
  gallery?: string;
  prompt?: string;
  width?: number;
  height?: number;
  seed?: string | number;
  model?: string;
  guidance?: number;
  nsfw?: boolean;
  srcSmall?: string;
};

export async function searchLexica(query: string, signal?: AbortSignal): Promise<LexicaImage[]> {
  if (!query.trim()) throw new SourceError("Enter a search phrase for Lexica.");
  const data = await getJSON<{ images?: LexicaImage[] }>(
    `https://lexica.art/api/v1/search?q=${encodeURIComponent(query.trim())}`,
    undefined,
    signal,
  );
  return Array.isArray(data.images) ? data.images : [];
}

const CATEGORY_HINTS: [RegExp, string][] = [
  [/portrait|face|headshot|beauty/i, "Portrait"],
  [/product|bottle|shoe|packaging|commercial/i, "Product"],
  [/fashion|editorial|runway|wardrobe/i, "Fashion"],
  [/architecture|building|interior|room|facade/i, "Architecture"],
  [/landscape|mountain|forest|ocean|wildlife|animal/i, "Landscape"],
  [/anime|manga|cel-shaded/i, "Anime"],
  [/logo|typography|lettering|poster/i, "Logo & Type"],
  [/fantasy|dragon|wizard|myth/i, "Fantasy"],
  [/sci.?fi|cyberpunk|space|robot/i, "Sci-Fi"],
  [/abstract|texture|fluid|pattern/i, "Abstract"],
  [/food|ramen|coffee|dish/i, "Food"],
];

function categorize(prompt: string, media: MediaType): string {
  if (media === "video") return "Video · Cinematic";
  return CATEGORY_HINTS.find(([rx]) => rx.test(prompt))?.[1] ?? "Cinematic";
}

function inferAspect(width?: number, height?: number): string {
  if (!width || !height) return "1:1";
  const ratio = width / height;
  const choices: [number, string][] = [
    [1, "1:1"], [3 / 2, "3:2"], [2 / 3, "2:3"], [16 / 9, "16:9"],
    [9 / 16, "9:16"], [4 / 5, "4:5"], [21 / 9, "21:9"],
  ];
  return choices.sort((a, b) => Math.abs(a[0] - ratio) - Math.abs(b[0] - ratio))[0][1];
}

function ratingFromCivitai(row: CivitaiImage): SafetyRating {
  const bit = typeof row.browsingLevel === "number" ? row.browsingLevel : null;
  if (bit !== null) {
    if (bit & 32) return "XXX";
    if (bit & 16) return "XXX";
    if (bit & 8) return "X";
    if (bit & 4) return "R";
    if (bit & 2) return "PG-13";
    if (bit & 1) return "PG";
  }
  const s = String(row.nsfwLevel ?? "").toLowerCase();
  if (s === "none" || s === "pg") return "PG";
  if (s === "soft" || s === "pg13" || s === "pg-13") return "PG-13";
  if (s === "mature" || s === "r") return "R";
  if (s === "x") return "X";
  if (s === "xxx") return "XXX";
  return row.nsfw ? "R" : "PG";
}

function safeString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function readResources(meta: Record<string, unknown> | null | undefined): PromptResource[] {
  if (!meta) return [];
  const raw = Array.isArray(meta.civitaiResources)
    ? meta.civitaiResources
    : Array.isArray(meta.resources)
      ? meta.resources
      : [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const e = entry as Record<string, unknown>;
    const resource: PromptResource = { type: safeString(e.type) || "model" };
    if (safeString(e.name)) resource.name = safeString(e.name);
    if (typeof e.modelVersionId === "number") resource.modelVersionId = e.modelVersionId;
    if (typeof e.weight === "number") resource.weight = e.weight;
    if (safeString(e.trigger)) resource.trigger = safeString(e.trigger);
    return [resource];
  });
}

function shortTitle(text: string, fallback: string): string {
  const sentence = text.replace(/\s+/g, " ").split(/[.!?\n]/)[0]?.trim() ?? "";
  return (sentence.length > 54 ? `${sentence.slice(0, 51)}…` : sentence) || fallback;
}

export function mapCivitaiImage(row: CivitaiImage): PromptDraft | null {
  const meta = row.meta;
  const prompt = meta ? safeString(meta.prompt) : "";
  if (!prompt) return null;
  const media: MediaType = row.type === "video" ? "video" : "image";
  const author = safeString(row.username) || "Civitai creator";
  const url = row.id ? `https://civitai.com/images/${row.id}` : `https://civitai.com/posts/${row.postId ?? ""}`;
  const resources = readResources(meta);
  const loraTags = resources.filter((r) => r.type.toLowerCase().includes("lora")).map(() => "lora");
  const rating = ratingFromCivitai(row);
  const sampler = safeString(meta?.sampler);
  const steps = typeof meta?.steps === "number" ? meta.steps : undefined;
  const cfgScale = typeof meta?.cfgScale === "number" ? meta.cfgScale : undefined;
  const seed = meta?.seed === undefined || meta?.seed === null ? "" : String(meta.seed);
  const notes = [
    "Imported from public Civitai generation metadata.",
    sampler ? `Sampler: ${sampler}` : "",
    steps ? `Steps: ${steps}` : "",
    cfgScale ? `CFG: ${cfgScale}` : "",
    resources.length ? `Resources: ${resources.map((r) => `${r.type}${r.weight !== undefined ? ` ${r.weight}` : ""}${r.modelVersionId ? ` #${r.modelVersionId}` : ""}`).join(", ")}` : "",
  ].filter(Boolean).join("\n");

  return {
    title: shortTitle(prompt, `${row.baseModel ?? "Civitai"} · ${row.id}`),
    prompt,
    negative: safeString(meta?.negativePrompt),
    model: safeString(row.baseModel) || "Civitai model",
    media,
    category: categorize(prompt, media),
    tags: [...new Set(["civitai", media, rating.toLowerCase(), ...loraTags])],
    aspectRatio: inferAspect(row.width, row.height),
    seed,
    notes,
    favorite: false,
    image: null,
    source: "civitai",
    sourceId: String(row.id),
    sourceUrl: url,
    sourceAuthor: author,
    safetyRating: rating,
    isNsfw: rating !== "PG" && rating !== "PG-13",
    resources,
    sampler,
    cfgScale,
    steps,
  };
}

export function mapLexicaImage(row: LexicaImage): PromptDraft | null {
  const prompt = safeString(row.prompt);
  if (!prompt) return null;
  const media: MediaType = "image";
  const url = row.gallery || (row.id ? `https://lexica.art/?q=${encodeURIComponent(row.id)}` : "https://lexica.art");
  const ratio = inferAspect(row.width, row.height);
  return {
    title: shortTitle(prompt, "Lexica prompt"),
    prompt,
    negative: "",
    model: safeString(row.model) || "Lexica gallery",
    media,
    category: categorize(prompt, media),
    tags: [...new Set(["lexica", "gallery", row.nsfw ? "nsfw" : "sfw"])],
    aspectRatio: ratio,
    seed: row.seed === undefined ? "" : String(row.seed),
    notes: typeof row.guidance === "number" ? `Guidance: ${row.guidance}` : "Imported from Lexica search metadata.",
    favorite: false,
    image: null,
    source: "lexica",
    sourceId: row.id ?? undefined,
    sourceUrl: url,
    sourceAuthor: "",
    safetyRating: row.nsfw ? "Unrated" : "PG",
    isNsfw: Boolean(row.nsfw),
    resources: [],
  };
}

/** Small CSV reader that handles quoted cells and escaped double quotes. */
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted && ch === '"' && text[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (!quoted && ch === ",") {
      row.push(cell); cell = "";
    } else if (!quoted && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const headers = (rows.shift() ?? []).map((h) => h.trim());
  return rows
    .filter((r) => r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}

export function mapKreaRow(row: Record<string, string>, i: number): PromptDraft | null {
  const prompt = safeString(row.prompt);
  if (!prompt) return null;
  let raw: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(row.raw_data ?? "{}");
    if (parsed && typeof parsed === "object") raw = parsed as Record<string, unknown>;
  } catch {
    /* the prompt alone is still useful */
  }
  const discord = raw.raw_discord_data && typeof raw.raw_discord_data === "object"
    ? raw.raw_discord_data as Record<string, unknown>
    : {};
  const seed = discord.seed ?? raw.seed;
  const width = typeof discord.width === "number" ? discord.width : undefined;
  const height = typeof discord.height === "number" ? discord.height : undefined;
  return {
    title: shortTitle(prompt, `Krea prompt ${i + 1}`),
    prompt,
    negative: "",
    model: "Stable Diffusion 1.3",
    media: "image",
    category: categorize(prompt, "image"),
    tags: ["krea", "open-prompts", "sd-1.3"],
    aspectRatio: inferAspect(width, height),
    seed: seed === undefined ? "" : String(seed),
    notes: "Imported from Krea's archived Open Prompts dataset (early Stable Diffusion generations).",
    favorite: false,
    image: null,
    source: "krea",
    sourceId: `krea-${i}-${String(seed ?? "")}`,
    sourceUrl: "https://github.com/krea-ai/open-prompts",
    sourceAuthor: "Krea Open Prompts dataset",
    safetyRating: "Unrated",
    isNsfw: false,
    resources: [],
  };
}

/** Adapts Civitai, Lexica, Krea, or a generic JSON array/export into local prompt drafts. */
export function mapExternalJSON(input: unknown): PromptDraft[] {
  const root = input as Record<string, unknown> | unknown[] | null;
  if (!root) return [];
  const rows = Array.isArray(root)
    ? root
    : Array.isArray((root as Record<string, unknown>).items)
      ? (root as Record<string, unknown>).items as unknown[]
      : Array.isArray((root as Record<string, unknown>).images)
        ? (root as Record<string, unknown>).images as unknown[]
        : Array.isArray((root as Record<string, unknown>).prompts)
          ? (root as Record<string, unknown>).prompts as unknown[]
          : [root];
  return rows.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    if (row.meta && typeof row.meta === "object") {
      const mapped = mapCivitaiImage(row as unknown as CivitaiImage);
      return mapped ? [mapped] : [];
    }
    if (typeof row.prompt === "string") {
      const lexica = mapLexicaImage(row as unknown as LexicaImage);
      if (lexica && (row.gallery || row.srcSmall || row.promptid || row.model === "stable-diffusion")) return [lexica];
      return [{
        ...row,
        title: safeString(row.title) || shortTitle(row.prompt, "Imported prompt"),
        prompt: row.prompt,
        negative: safeString(row.negative ?? row.negativePrompt),
        model: safeString(row.model) || "Imported model",
        media: row.media === "video" || row.type === "video" ? "video" : "image",
        category: safeString(row.category) || categorize(row.prompt, "image"),
        tags: Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === "string") : ["imported"],
        aspectRatio: safeString(row.aspectRatio) || inferAspect(Number(row.width), Number(row.height)),
        image: null,
        favorite: false,
        source: safeString(row.source) || "custom",
        safetyRating: (row.safetyRating as SafetyRating) || "Unrated",
        isNsfw: Boolean(row.isNsfw ?? row.nsfw),
      } as PromptDraft];
    }
    return [];
  });
}