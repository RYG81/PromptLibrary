export type MediaType = "image" | "video";
export type SafetyRating = "PG" | "PG-13" | "R" | "X" | "XXX" | "Unrated";
export type PromptResource = {
  type: string;
  name?: string;
  modelVersionId?: number;
  weight?: number;
  trigger?: string;
};

export type Prompt = {
  id: string;
  title: string;
  prompt: string;
  negative: string;
  model: string;
  media: MediaType;
  category: string;
  tags: string[];
  collectionId: string | null;
  aspectRatio: string;
  seed: string;
  notes: string;
  favorite: boolean;
  image: string | null;
  uses: number;
  createdAt: number;
  updatedAt: number;
  /** External source attribution; imported prompts remain local to this browser. */
  source?: "starter" | "civitai" | "lexica" | "krea" | "custom" | string;
  sourceId?: string;
  sourceUrl?: string;
  sourceAuthor?: string;
  safetyRating?: SafetyRating;
  /** true if a source marks the text or generation as mature/NSFW */
  isNsfw?: boolean;
  resources?: PromptResource[];
  /** Additional generation metadata kept as readable text. */
  sampler?: string;
  cfgScale?: number;
  steps?: number;
};

export type Collection = {
  id: string;
  name: string;
  emoji: string;
};

export type Settings = {
  defaultModel: string;
  defaultNegative: string;
  defaultMedia: MediaType;
  theme: "dark";
};

export type AppState = {
  version: number;
  prompts: Prompt[];
  collections: Collection[];
  settings: Settings;
  history: { id: string; text: string; at: number }[];
  /** LLM system prompts that write prompts. Imported from lib/metaprompts to avoid a cycle. */
  metaPrompts?: unknown[];
};

export type PromptDraft = Partial<Prompt> & { title?: string };

export const IMAGE_MODELS = [
  "Midjourney v7",
  "Midjourney v6.1",
  "Flux 1.1 Pro",
  "Flux 1.1 Pro Ultra",
  "Flux.1 D",
  "Flux.1 S",
  "Flux Kontext",
  "Stable Diffusion XL",
  "SDXL 1.0",
  "SDXL Turbo",
  "SD 1.5",
  "SD 2.1",
  "DALL·E 3",
  "GPT Image 1",
  "SD 3.5 Large",
  "SD 3.5 Medium",
  "Imagen 3",
  "Imagen 4",
  "Ideogram 2.0",
  "Ideogram 3.0",
  "Leonardo Phoenix",
  "Recraft V3",
  "Adobe Firefly 3",
  "Pony Diffusion XL",
  "Illustrious XL",
  "NoobAI XL",
  "Juggernaut XL",
  "RealVisXL",
] as const;

export const VIDEO_MODELS = [
  "Sora 2",
  "Veo 3.1",
  "Runway Gen-4",
  "Kling 2.5",
  "Pika 2.0",
  "Pika 2.5",
  "Luma Ray2",
  "Kling 3.0",
  "Kling 2.5",
  "Wan 2.1",
  "HunyuanVideo",
  "LTX Video",
  "CogVideoX",
  "Hailuo MiniMax",
] as const;

export const ALL_MODELS = [...IMAGE_MODELS, ...VIDEO_MODELS] as const;

export const ASPECT_RATIOS = ["1:1", "3:2", "2:3", "16:9", "9:16", "4:5", "21:9"] as const;

export const DURATIONS = ["4s", "6s", "8s", "10s"] as const;

export const CATEGORIES = [
  "Portrait",
  "Cinematic",
  "Landscape",
  "Architecture",
  "Interior",
  "Product",
  "Food",
  "Anime",
  "3D Render",
  "Illustration",
  "Logo & Type",
  "Poster",
  "Fantasy",
  "Sci-Fi",
  "Nature",
  "Abstract",
  "Fashion",
  "Street",
  "Video · Cinematic",
  "Video · Commercial",
  "Video · Nature",
  "Video · Motion",
] as const;

export const VIDEO_CATEGORIES = CATEGORIES.filter((c) => c.startsWith("Video ·"));

export const CATEGORY_EMOJI: Record<string, string> = {
  Portrait: "🧑‍🎤",
  Cinematic: "🎬",
  Landscape: "🏞️",
  Architecture: "🏛️",
  Interior: "🛋️",
  Product: "📦",
  Food: "🍜",
  Anime: "🌸",
  "3D Render": "🧊",
  Illustration: "🎨",
  "Logo & Type": "🔤",
  Poster: "🪧",
  Fantasy: "🧙",
  "Sci-Fi": "🪐",
  Nature: "🌿",
  Abstract: "🌀",
  Fashion: "👗",
  Street: "🚶",
  "Video · Cinematic": "🎥",
  "Video · Commercial": "📺",
  "Video · Nature": "🦁",
  "Video · Motion": "🌊",
};
