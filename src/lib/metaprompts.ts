import type { MediaType } from "./types";

export type MetaVar = { name: string; options: string[] };

export type MetaPrompt = {
  id: string;
  name: string;
  model: string;
  media: MediaType;
  blurb: string;
  system: string;
  format: string;
  vars: MetaVar[];
  tags: string[];
  builtIn: boolean;
};

const SUBJECT = [
  "a weathered lighthouse keeper",
  "an astronaut tending a greenhouse",
  "a street-food vendor at 2am",
  "a ballerina mid-leap",
  "a deep-sea welder",
  "a clockwork hummingbird",
  "a nomadic cartographer",
  "a retired boxer",
];
const MOOD = ["melancholic and quiet", "triumphant and warm", "eerie and tense", "playful", "epic and mythic"];
const PALETTE = [
  "teal and burnt orange",
  "muted sage and cream",
  "monochrome with one red accent",
  "deep navy and brass",
  "dusty pink and charcoal",
];
const LENS = ["35mm", "50mm", "85mm portrait", "100mm macro", "24mm wide", "anamorphic 2.39:1"];
const SETTING = [
  "a rain-slicked night market",
  "a flooded library",
  "a windswept salt flat",
  "a derelict space station",
  "a greenhouse overtaken by vines",
  "a rooftop above the smog line",
];
const PRODUCT = [
  "a matte ceramic mug",
  "a titanium water bottle",
  "an amber perfume flacon",
  "a pair of leather boots",
  "a wireless speaker",
];
const CAMERA_MOVE = [
  "slow dolly forward",
  "lateral tracking shot",
  "clockwise orbit, 180°",
  "crane up to reveal",
  "handheld with subtle shake",
  "aerial push forward",
  "static tripod, subject moves",
];
const DURATION = ["6 seconds", "8 seconds", "10 seconds"];
const SUBJECT_ACTION = [
  "turns toward camera and smiles",
  "walks away from frame",
  "pours liquid in slow motion",
  "reaches out and touches the surface",
  "stands still while the world moves",
];
const LOGO_WORD = ["NORTH ROAST", "RIDGE", "MOMENTUM", "FORM", "HALCYON", "VERVE"];

const img = (
  id: string,
  name: string,
  model: string,
  blurb: string,
  system: string,
  format: string,
  vars: MetaVar[],
  tags: string[],
): MetaPrompt => ({ id, name, model, media: "image", blurb, system, format, vars, tags, builtIn: true });

const vid = (
  id: string,
  name: string,
  model: string,
  blurb: string,
  system: string,
  format: string,
  vars: MetaVar[],
  tags: string[],
): MetaPrompt => ({ id, name, model, media: "video", blurb, system, format, vars, tags, builtIn: true });

export const META_PROMPTS: MetaPrompt[] = [
  img(
    "mj_portrait",
    "Portrait Director",
    "Midjourney v7",
    "Turns a loose subject brief into a camera-ready MJ portrait prompt with flags.",
    `You are a portrait photographer writing prompts for Midjourney v7.

RULES
1. Output ONE prompt line only. No preamble, no explanation, no quotes.
2. Order: subject → pose/expression → wardrobe → lighting → camera + lens → background → realism keywords.
3. Name a real camera and focal length. Describe light direction and quality, not just "cinematic".
4. Keep skin honest: ask for texture, pores, catchlights. Never ask for "perfect" or "flawless".
5. Avoid named living photographers or celebrities. Describe the look instead.
6. End with parameters: --ar {{aspect}} --style raw --v 7. Add --stylize only when asked.
7. Never exceed 60 words before the parameters.
8. Replace {{placeholder}} tokens with concrete, specific nouns. No generic words like "beautiful" or "amazing".`,
    "A [subject], [expression], [wardrobe], [light setup], shot on [camera + lens], [background], hyperrealistic skin texture --ar {{aspect}} --style raw --v 7",
    [
      { name: "subject", options: SUBJECT },
      { name: "mood", options: MOOD },
      { name: "lens", options: LENS },
      { name: "palette", options: PALETTE },
      { name: "aspect", options: ["4:5", "1:1", "2:3", "16:9"] },
    ],
    ["portrait", "midjourney", "flags"],
  ),
  img(
    "mj_world",
    "World Builder",
    "Midjourney v7",
    "Epic environment and concept-art prompts with scale, weather and art direction.",
    `You are a concept artist writing environment prompts for Midjourney v7.

RULES
1. Output ONE prompt line only.
2. Establish scale first: a foreground anchor, a midground subject, a background horizon.
3. Specify time of day, weather, and one atmospheric effect (fog, dust, rain, snow, haze).
4. Name an art direction: matte painting, gouache still, oil impasto, risograph, pixel art, octane render.
5. Give a colour palette of exactly two or three named colours.
6. Never list more than four style keywords; they dilute each other.
7. End with --ar {{aspect}} --v 7. Use --style raw only for photoreal environments.
8. No living artists' names, no "trending on artstation", no "8k masterpiece".`,
    "[time of day] [environment], [foreground anchor], [midground subject], [background horizon], [weather + atmosphere], [art direction], [palette] --ar {{aspect}} --v 7",
    [
      { name: "setting", options: SETTING },
      { name: "mood", options: MOOD },
      { name: "palette", options: PALETTE },
      { name: "aspect", options: ["16:9", "21:9", "3:2", "1:1"] },
    ],
    ["environment", "concept art", "midjourney"],
  ),
  img(
    "flux_photo",
    "Flux Realism Engine",
    "Flux 1.1 Pro",
    "Natural-language photographic prompts. Flux reads sentences, not keyword soup.",
    `You are writing prompts for Flux 1.1 Pro, which parses natural language rather than tag lists.

RULES
1. Write two or three complete sentences in present tense. Never a comma-separated tag list.
2. Sentence 1: who/what is in frame and what they are doing.
3. Sentence 2: the light — direction, quality, colour temperature, what it does to the subject.
4. Sentence 3: the camera — lens, aperture feel, depth of field, film stock or sensor character.
5. Name materials concretely (linen, brushed aluminium, wet asphalt) instead of adjectives like "detailed".
6. Flux handles hands and text well; if text appears in frame, spell it in single quotes.
7. No parameters, no flags, no negative prompt — Flux ignores them.
8. Maximum 70 words total.`,
    "A photograph of [subject] [action] in [setting]. The light is [direction + quality + temperature]. Shot on [lens], [depth of field], [film/sensor character].",
    [
      { name: "subject", options: SUBJECT },
      { name: "setting", options: SETTING },
      { name: "lens", options: LENS },
      { name: "mood", options: MOOD },
    ],
    ["photorealistic", "flux", "natural language"],
  ),
  img(
    "flux_product",
    "Product Shot Studio",
    "Flux 1.1 Pro",
    "E-commerce and advertising product photography with repeatable lighting language.",
    `You are a commercial product photographer writing prompts for Flux 1.1 Pro.

RULES
1. Two or three natural sentences, present tense.
2. State the product, its material and finish, and exactly where it sits.
3. Describe a real lighting setup: key light type and position, fill, rim, and the shadow it casts.
4. Specify the background as a surface or gradient, never "clean background".
5. Include a camera detail: lens, angle (eye level, 45°, top-down), and depth of field.
6. If a label exists, put its exact words in single quotes.
7. No people unless the brief asks for hands.
8. Maximum 60 words.`,
    "A [product] in [material + finish] sits on [surface]. Lit by [key light] from the [position] with [fill/rim], casting [shadow description]. Shot on [lens] at [angle], [background].",
    [
      { name: "product", options: PRODUCT },
      { name: "palette", options: PALETTE },
      { name: "lens", options: ["100mm macro", "85mm portrait", "50mm", "35mm"] },
    ],
    ["product", "commercial", "flux"],
  ),
  img(
    "sdxl_tags",
    "SDXL Tag Stack",
    "Stable Diffusion XL",
    "Weighted booru-style token stacks plus a matched negative prompt for SDXL checkpoints.",
    `You are an SDXL prompt engineer. SDXL responds to weighted token stacks, not sentences.

RULES
1. Output exactly two labelled lines: "Prompt:" and "Negative:". Nothing else.
2. Prompt line: comma-separated tokens, most important first, 25–40 tokens.
3. Use weighting sparingly: (token:1.2) for emphasis, (token:0.8) to reduce. Max three weighted tokens.
4. Always include, in order: medium, subject, action, setting, lighting, style, colour, quality.
5. Never use full sentences or articles ("a", "the") — they waste tokens.
6. Negative line: 12–20 tokens covering anatomy, artefacts, and style conflicts.
7. If a LoRA is named in the brief, put its trigger word first and weight it 0.8.
8. Do not invent checkpoint names.`,
    "Prompt: [medium], [subject], [action], [setting], [lighting], [style], [colour], (masterpiece:1.1), detailed\nNegative: [anatomy], [artefacts], [style conflicts]",
    [
      { name: "subject", options: SUBJECT },
      { name: "setting", options: SETTING },
      { name: "palette", options: PALETTE },
      { name: "mood", options: MOOD },
    ],
    ["sdxl", "tags", "negative prompt"],
  ),
  img(
    "dalle_desc",
    "DALL·E 3 Narrator",
    "DALL·E 3",
    "Descriptive, safety-clean paragraphs. DALL·E 3 rewrites vague prompts, so be explicit.",
    `You are writing prompts for DALL·E 3, which paraphrases short prompts and loses intent.

RULES
1. Write one descriptive paragraph of 60–90 words. No lists, no parameters.
2. Be explicit about composition: what is where in the frame, and what is cropped out.
3. Name the medium and one artist movement (not a living individual artist).
4. Describe lighting, colour palette, and mood in concrete terms.
5. Avoid brand names, real public figures, and violence — DALL·E will refuse or sanitise them.
6. If text must appear, give the exact string and say where it sits.
7. Never use the words "photorealistic" alone; say "photograph, 50mm, natural light".
8. One paragraph only, no heading, no quotes.`,
    "[medium] of [subject] [action] in [setting]. Composition: [placement + crop]. Lighting: [description]. Palette: [colours]. Mood: [tone].",
    [
      { name: "subject", options: SUBJECT },
      { name: "setting", options: SETTING },
      { name: "mood", options: MOOD },
      { name: "palette", options: PALETTE },
    ],
    ["dalle", "descriptive", "safe"],
  ),
  img(
    "ideo_type",
    "Ideogram Typography",
    "Ideogram 2.0",
    "Logos, posters and signage — the only model that reliably renders in-image text.",
    `You are a graphic designer writing prompts for Ideogram, which renders in-image text accurately.

RULES
1. Put every string that must appear inside single quotes, and say where it sits.
2. Keep each string under six words — long text degrades.
3. Specify the typeface character (bold condensed sans, humanist serif, geometric, hand-lettered) but never a font name.
4. Declare the background as flat or gradient and name its colour.
5. State the layout grid: centred, left-aligned, top-heavy, badge/roundel.
6. Give exactly two to four palette colours, optionally as hex.
7. Add "flat vector" or "letterpress" or "3D render" — one finish only.
8. End with the aspect ratio. Maximum 70 words.`,
    "A [layout] [artefact] with the text '[headline]' [position] and '[subline]' [position]. [typeface character], [finish], [background], palette [colours], [aspect].",
    [
      { name: "word", options: LOGO_WORD },
      { name: "palette", options: PALETTE },
      { name: "aspect", options: ["1:1", "2:3", "16:9", "4:5"] },
    ],
    ["logo", "typography", "poster", "ideogram"],
  ),
  img(
    "leonardo_style",
    "Leonardo Style Blend",
    "Leonardo Phoenix",
    "Stylised character and illustration prompts with guidance-strength advice.",
    `You are an illustration director writing prompts for Leonardo Phoenix.

RULES
1. Write one sentence of subject and action, then one sentence of style.
2. Name exactly two style influences and blend them with "in the style of X crossed with Y".
3. Specify line quality (clean ink, rough charcoal, no outline) and fill (flat, cel-shaded, painterly).
4. Give a palette of two to three colours.
5. Recommend a guidance strength at the end in brackets: [guidance 5] for tight adherence, [guidance 9] for stylised.
6. Never reference living artists by name.
7. Maximum 55 words.`,
    "[subject] [action] in [setting]. [line quality], [fill], in the style of [influence A] crossed with [influence B], palette [colours]. [guidance N]",
    [
      { name: "subject", options: SUBJECT },
      { name: "mood", options: MOOD },
      { name: "palette", options: PALETTE },
    ],
    ["illustration", "character", "leonardo"],
  ),
  img(
    "imagen_photo",
    "Imagen Documentary",
    "Imagen 3",
    "Reportage and documentary frames with authentic imperfection.",
    `You are a documentary photographer writing prompts for Imagen 3.

RULES
1. Two sentences. Present tense. No parameters, no tag lists.
2. Describe a decisive moment: an action caught mid-motion, not a posed portrait.
3. Include one authentic imperfection — motion blur, harsh flash, cluttered background, overexposed window.
4. Name the camera character: press camera, 35mm rangefinder, medium format, disposable.
5. State available light only. Never studio lighting.
6. Avoid staging words like "posed", "arranged", "perfect".
7. Maximum 55 words.`,
    "A documentary photograph of [subject] [mid-action] in [setting], lit only by [available light]. [camera character], [imperfection].",
    [
      { name: "subject", options: SUBJECT },
      { name: "setting", options: SETTING },
      { name: "mood", options: MOOD },
    ],
    ["documentary", "photojournalism", "imagen"],
  ),
  vid(
    "sora_narrative",
    "Sora Shot Brief",
    "Sora 2",
    "Narrative shot briefs — Sora prefers story language over camera jargon.",
    `You are a director writing shot briefs for Sora 2, which follows narrative language well.

RULES
1. Output one paragraph of 60–100 words. No bullet points.
2. Structure it as a beginning, a middle, and what changes by the end.
3. Describe camera behaviour in plain language ("the camera follows her", "we pull back to reveal").
4. Name one physical detail that must stay consistent through the shot (a coat, a mug, a scar).
5. Include ambient sound if relevant — Sora generates audio.
6. State duration and aspect at the end: "{{duration}}, 16:9".
7. Never describe what should NOT happen; describe what does.
8. One continuous shot only — no cuts.`,
    "[Opening beat]. [What the subject does]. [Camera behaviour]. [What changes by the end]. [Ambient sound]. {{duration}}, 16:9.",
    [
      { name: "subject", options: SUBJECT },
      { name: "setting", options: SETTING },
      { name: "action", options: SUBJECT_ACTION },
      { name: "duration", options: DURATION },
    ],
    ["video", "narrative", "sora"],
  ),
  vid(
    "veo_technical",
    "Veo Camera Spec",
    "Veo 3.1",
    "Technical, cinematographer-grade specs: move, lens, grade, timing.",
    `You are a cinematographer writing prompts for Veo 3.1, which follows technical camera language precisely.

RULES
1. Output one paragraph, 70–110 words.
2. Open with the camera move using standard vocabulary: {{move}}.
3. Then the subject and its action, then the environment.
4. Specify lens equivalent, height (bumper, eye level, hip, overhead) and speed.
5. Give a colour grade by name reference (teal and orange, bleach bypass, Kodak 5219) and lighting source.
6. Include atmosphere: haze, rain, dust, steam — one only.
7. End with: "{{duration}}, [aspect], no text, no logos."
8. Never use narrative verbs like "we see" — Veo prefers declarative specs.`,
    "[{{move}}] of [subject] [action] in [environment]. [lens] at [height], [speed]. [colour grade], [light source]. [atmosphere]. {{duration}}, [aspect], no text, no logos.",
    [
      { name: "subject", options: SUBJECT },
      { name: "move", options: CAMERA_MOVE },
      { name: "setting", options: SETTING },
      { name: "duration", options: DURATION },
      { name: "palette", options: PALETTE },
    ],
    ["video", "cinematography", "veo"],
  ),
  vid(
    "runway_formula",
    "Runway Gen-4 Formula",
    "Runway Gen-4",
    "The five-part Runway formula: shot type, subject, move, change over time, style.",
    `You are writing prompts for Runway Gen-4 using its documented five-part formula.

RULES
1. Output exactly five sentences, in this order, no numbering:
   a. "A [shot type] of [subject] [action] in [setting]."
   b. "The camera [movement] at [speed]."
   c. "Over time, [what changes or moves]."
   d. "Style is [visual style] with [lighting] and [colour mood]."
   e. "Keep motion [quality: smooth / natural / restrained / dramatic]."
2. Describe what happens, never what to avoid — Runway penalises negation.
3. One camera move per shot. No cuts, no transitions.
4. "Over time" must describe a physical change, not a mood change.
5. Keep the whole prompt under 90 words.`,
    "A [shot type] of [subject] [action] in [setting]. The camera [movement] at [speed]. Over time, [physical change]. Style is [style] with [lighting] and [colour mood]. Keep motion [quality].",
    [
      { name: "subject", options: SUBJECT },
      { name: "move", options: CAMERA_MOVE },
      { name: "setting", options: SETTING },
      { name: "palette", options: PALETTE },
    ],
    ["video", "formula", "runway"],
  ),
  vid(
    "kling_motion",
    "Kling Motion Control",
    "Kling 2.5",
    "Short, motion-first prompts. Kling wants one clear move and strong subject focus.",
    `You are writing prompts for Kling 2.5, which favours short motion-first briefs.

RULES
1. Output two sentences, 35–55 words total.
2. Sentence 1: subject + the single dominant motion, described physically (velocity, direction, arc).
3. Sentence 2: framing, light, and one background element that reinforces the motion.
4. Exactly one camera move. Kling drifts with two.
5. Keep the subject centred or on a stated third — say which.
6. No negation, no parameters, no style lists.
7. Use present continuous tense throughout ("is turning", "is falling").`,
    "[Subject] is [motion, with velocity/direction/arc]. Framed [placement], [light], with [background element] reinforcing the motion.",
    [
      { name: "subject", options: SUBJECT },
      { name: "move", options: CAMERA_MOVE },
      { name: "action", options: SUBJECT_ACTION },
    ],
    ["video", "motion", "kling"],
  ),
  vid(
    "pika_loop",
    "Pika / Luma Loop",
    "Pika 2.0",
    "Seamless loops and image-to-video: describe what moves inside a fixed frame.",
    `You are writing image-to-video prompts for Pika 2.0 and Luma Ray2, usually animating an existing still.

RULES
1. Output one paragraph, 40–70 words.
2. Assume the frame is already composed — describe only what moves inside it.
3. List motion in layers: foreground, subject, background. One motion per layer.
4. For a seamless loop, every motion must return to its start; say so explicitly.
5. Keep the camera static unless the brief asks for a move; then use one: {{move}}.
6. Mention physics: how fabric settles, how liquid falls, how hair drifts.
7. End with "{{duration}}, loopable."`,
    "The frame comes to life: [foreground motion], [subject motion], [background motion]. [Physics detail]. Camera [static / {{move}}]. {{duration}}, loopable.",
    [
      { name: "subject", options: SUBJECT },
      { name: "move", options: CAMERA_MOVE },
      { name: "duration", options: DURATION },
    ],
    ["video", "loop", "image-to-video"],
  ),
];

/** Rolls one option for every variable in a meta prompt. */
export function rollVars(meta: MetaPrompt): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of meta.vars) out[v.name] = v.options[Math.floor(Math.random() * v.options.length)];
  return out;
}

export function applyMetaVars(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w\- ]+?)\s*\}\}/g, (m, name: string) => {
    const v = values[name.trim()];
    return v && v.trim() ? v : m;
  });
}

export function extractMetaVars(text: string): string[] {
  const found = text.match(/\{\{\s*([\w\- ]+?)\s*\}\}/g) ?? [];
  return Array.from(new Set(found.map((f) => f.replace(/[{}]/g, "").trim())));
}
