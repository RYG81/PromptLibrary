import { useMemo, useRef, useState } from "react";
import { db } from "../lib/db";
import type { PromptDraft } from "../lib/types";
import {
  mapCivitaiImage,
  mapExternalJSON,
  mapKreaRow,
  mapLexicaImage,
  parseCSV,
  searchCivitaiImages,
  searchCivitaiLoras,
  searchLexica,
  type CivitaiModel,
  type CivitaiSort,
  type RatingScope,
} from "../lib/gallerySources";
import { cn } from "../lib/utils";
import { Button, Chip, Icon, Micro, Rule, Segmented, TextArea, TextInput, useToast } from "./ui";

type SourceTab = "civitai" | "lexica" | "file";
type ImportRow = { key: string; draft: PromptDraft };
type GalleryMode = "gallery" | "loras";
type QueryType = "feed" | "model" | "creator" | "post" | "base";

function rowKey(draft: PromptDraft, index: number): string {
  return String(draft.sourceId || draft.sourceUrl || `${draft.title ?? "prompt"}-${index}`);
}

function safetyText(draft: PromptDraft): string {
  if (draft.safetyRating === "Unrated") return "unrated";
  return draft.safetyRating ?? (draft.isNsfw ? "adult" : "PG");
}

function adultRow(draft: PromptDraft): boolean {
  return Boolean(draft.isNsfw) || ["R", "X", "XXX", "Unrated"].includes(draft.safetyRating ?? "");
}

function resultRow(draft: PromptDraft, i: number): ImportRow {
  return { key: rowKey(draft, i), draft };
}

function SafetyBadge({ draft }: { draft: PromptDraft }) {
  const adult = adultRow(draft);
  return (
    <span
      className={cn(
        "mono shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.04em]",
        adult ? "border-warn/35 bg-warn/10 text-warn" : "border-teal-line bg-teal-soft text-teal",
      )}
    >
      {safetyText(draft)}
    </span>
  );
}

function PromptSnippet({ draft, reveal }: { draft: PromptDraft; reveal: boolean }) {
  const hidden = adultRow(draft) && !reveal;
  return (
    <p className={cn("line-clamp-2 text-[11.5px] leading-relaxed text-ink-2", hidden && "select-none blur-[5px]")}>
      {draft.prompt}
    </p>
  );
}

export default function GalleryImport({
  showAdult,
  onAdultEnabled,
  onOpenLibrary,
}: {
  showAdult: boolean;
  onAdultEnabled: () => void;
  onOpenLibrary: () => void;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<SourceTab>("civitai");
  const [scope, setScope] = useState<RatingScope>("sfw");
  const [ageChecked, setAgeChecked] = useState(false);
  const [results, setResults] = useState<ImportRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [civitaiToken, setCivitaiToken] = useState("");
  const [galleryMode, setGalleryMode] = useState<GalleryMode>("gallery");
  const [queryType, setQueryType] = useState<QueryType>("feed");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<CivitaiSort>("Most Reactions");
  const [media, setMedia] = useState<"image" | "video">("image");
  const [models, setModels] = useState<CivitaiModel[]>([]);
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [maxFileRows, setMaxFileRows] = useState(0);
  const [lastImported, setLastImported] = useState(0);

  const visibleRows = useMemo(
    () => results.filter(({ draft }) => {
      if (!showAdult && adultRow(draft)) return false;
      if (scope === "sfw" && adultRow(draft)) return false;
      return true;
    }),
    [results, showAdult, scope],
  );
  const selectedCount = visibleRows.filter((r) => selected.has(r.key)).length;
  const shouldAgeGate = scope !== "sfw";
  const adultReady = !shouldAgeGate || (ageChecked && showAdult);

  const resetResults = () => {
    setResults([]);
    setSelected(new Set());
    setNextCursor(null);
    setError("");
  };

  const checkAge = (checked: boolean) => {
    setAgeChecked(checked);
    if (checked) onAdultEnabled();
  };

  const runCivitaiGallery = async (next = false) => {
    if (!civitaiToken.trim()) {
      setError("A Civitai API token is required. It stays in this tab and is never saved.");
      return;
    }
    if (shouldAgeGate && !adultReady) {
      setError("Confirm you are 18+ before fetching mature-rated results.");
      return;
    }
    setBusy(true);
    setError("");
    if (!next) setNextCursor(null);
    try {
      const page = await searchCivitaiImages({
        token: civitaiToken,
        scope,
        media,
        sort,
        queryType,
        query,
        cursor: next ? nextCursor : null,
      });
      const mapped = (page.items ?? []).flatMap((item) => {
        const draft = mapCivitaiImage(item);
        return draft ? [draft] : [];
      });
      const newRows = mapped.map(resultRow);
      setResults((prev) => {
        const existing = new Set(prev.map((r) => r.key));
        return next ? [...prev, ...newRows.filter((r) => !existing.has(r.key))] : newRows;
      });
      setSelected((prev) => next ? prev : new Set());
      setNextCursor(page.metadata?.nextCursor ?? null);
      if (!mapped.length) setError("No public prompts with generation metadata on this page. Some creators hide prompt metadata.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Civitai request failed.");
    } finally {
      setBusy(false);
    }
  };

  const runCivitaiModels = async () => {
    if (!civitaiToken.trim()) {
      setError("A Civitai API token is required. It stays in this tab and is never saved.");
      return;
    }
    if (shouldAgeGate && !adultReady) {
      setError("Confirm you are 18+ before searching mature-rated models.");
      return;
    }
    setBusy(true);
    setError("");
    setModels([]);
    setResults([]);
    setSelected(new Set());
    try {
      const page = await searchCivitaiLoras({ token: civitaiToken, query, scope });
      setModels(page.items ?? []);
      setNextCursor(page.metadata?.nextCursor ?? null);
      if (!page.items?.length) setError("No LoRAs found for that search.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Civitai model search failed.");
    } finally {
      setBusy(false);
    }
  };

  const browseLora = async (modelId: number) => {
    setGalleryMode("gallery");
    setQueryType("model");
    setQuery(String(modelId));
    setResults([]);
    setSelected(new Set());
    setNextCursor(null);
    setBusy(true);
    setError("");
    try {
      const page = await searchCivitaiImages({
        token: civitaiToken,
        scope,
        media: "image",
        sort: "Most Reactions",
        queryType: "model",
        query: String(modelId),
      });
      const mapped = (page.items ?? []).flatMap((item) => {
        const draft = mapCivitaiImage(item);
        return draft ? [draft] : [];
      });
      setResults(mapped.map(resultRow));
      setNextCursor(page.metadata?.nextCursor ?? null);
      if (!mapped.length) setError("This model has no public gallery prompts with visible metadata.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this model gallery.");
    } finally {
      setBusy(false);
    }
  };

  const runLexica = async () => {
    if (shouldAgeGate && !adultReady) {
      setError("Confirm you are 18+ before including adult-rated results.");
      return;
    }
    setBusy(true);
    setError("");
    resetResults();
    try {
      const items = await searchLexica(query);
      const mapped = items
        .filter((item) => scope !== "sfw" || !item.nsfw)
        .flatMap((item) => {
          const draft = mapLexicaImage(item);
          return draft ? [draft] : [];
        });
      setResults(mapped.map(resultRow));
      setSelected(new Set());
      if (!mapped.length) setError("No results for this query and safety setting.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lexica search failed.");
    } finally {
      setBusy(false);
    }
  };

  const loadFile = async (file: File) => {
    setBusy(true);
    setError("");
    setFileName(file.name);
    try {
      const text = await file.text();
      let mapped: PromptDraft[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        mapped = parseCSV(text).slice(0, 500).flatMap((row, i) => {
          const p = mapKreaRow(row, i);
          return p ? [p] : [];
        });
      } else {
        mapped = mapExternalJSON(JSON.parse(text)).slice(0, 500);
      }
      setMaxFileRows(mapped.length);
      setResults(mapped.map(resultRow));
      setSelected(new Set(mapped.map((p, i) => rowKey(p, i))));
      if (!mapped.length) setError("No prompt records found. Use a Civitai/Lexica JSON response or Krea Open Prompts CSV.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse that file.");
    } finally {
      setBusy(false);
    }
  };

  const parsePasted = () => {
    setError("");
    try {
      const mapped = mapExternalJSON(JSON.parse(rawText)).slice(0, 500);
      setMaxFileRows(mapped.length);
      setResults(mapped.map(resultRow));
      setSelected(new Set(mapped.map((p, i) => rowKey(p, i))));
      if (!mapped.length) setError("No prompt records found in that JSON.");
    } catch {
      setError("Invalid JSON. Paste a Civitai/Lexica response, prompt array, or app export.");
    }
  };

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const addSelected = () => {
    const chosen = visibleRows.filter((r) => selected.has(r.key)).map((r) => r.draft);
    if (!chosen.length) {
      toast("Select at least one prompt", "warn");
      return;
    }
    const result = db.importPrompts(chosen);
    toast(`${result.added} added${result.skipped ? ` · ${result.skipped} duplicates skipped` : ""}`);
    setSelected(new Set());
    setLastImported(result.added);
  };

  const tabOptions = [
    { value: "civitai" as const, label: "Civitai", icon: "image" },
    { value: "lexica" as const, label: "Lexica", icon: "search" },
    { value: "file" as const, label: "Krea / JSON", icon: "upload" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded border border-accent-line bg-accent-soft px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-accent-text">
            <Icon name="download" className="h-3 w-3" /> Community sources
          </span>
          <h1 className="display mt-2.5 text-[26px] font-semibold leading-none text-ink sm:text-[30px]">Bring in gallery prompts</h1>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-ink-2">
            Import prompt text and generation metadata from official source APIs or local exports. Nothing is crawled in the background, and image files are not copied.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-2">
          <Icon name={showAdult ? "eye" : "shield"} className={cn("h-3.5 w-3.5", showAdult ? "text-warn" : "text-teal")} />
          <span className="text-[11px] font-medium text-ink-2">{showAdult ? "Adult visibility on" : "SFW view"}</span>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,390px)_1fr]">
        {/* Source controls */}
        <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="border-b border-line px-3 py-3">
            <Segmented<SourceTab> value={source} onChange={(next) => { setSource(next); setError(""); }} options={tabOptions} className="w-full [&>button]:flex-1" />
          </div>

          <div className="space-y-4 p-3.5">
            {source === "civitai" ? (
              <>
                <div className="rounded-lg border border-teal-line bg-teal-soft p-3">
                  <div className="flex items-start gap-2">
                    <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                    <p className="text-[11px] leading-relaxed text-ink-2">
                      Uses Civitai's official API only. Its current terms require valid credentials and rate-limit compliance. Your token stays in memory for this tab and is never written to local storage. Read the <a href="https://civitai.com/content/tos" target="_blank" rel="noreferrer" className="text-teal underline underline-offset-2">Terms</a> before importing.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Micro>Civitai API token</Micro>
                  <TextInput
                    type="password"
                    autoComplete="off"
                    value={civitaiToken}
                    onChange={(e) => setCivitaiToken(e.target.value)}
                    placeholder="Paste your own API token"
                  />
                  <a className="text-[10.5px] text-accent-text underline decoration-accent-line underline-offset-2" href="https://civitai.com/user/account" target="_blank" rel="noreferrer">
                    Manage API tokens at Civitai
                  </a>
                </div>

                <Rule />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Segmented<GalleryMode>
                    value={galleryMode}
                    onChange={(v) => { setGalleryMode(v); setError(""); }}
                    options={[
                      { value: "gallery", label: "Prompt gallery", icon: "image" },
                      { value: "loras", label: "Find LoRAs", icon: "layers" },
                    ]}
                  />
                  <Segmented<RatingScope>
                    value={scope}
                    onChange={(v) => { setScope(v); setAgeChecked(false); setError(""); }}
                    options={[
                      { value: "sfw", label: "SFW" },
                      { value: "adult", label: "18+" },
                      { value: "all", label: "All" },
                    ]}
                  />
                </div>

                {shouldAgeGate ? (
                  <label className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/5 p-2.5 text-[11px] leading-relaxed text-ink-2">
                    <input
                      type="checkbox"
                      checked={ageChecked}
                      onChange={(e) => checkAge(e.target.checked)}
                      className="mt-0.5 accent-[var(--pf-accent)]"
                    />
                    <span><b className="text-warn">18+:</b> I am an adult and explicitly want mature-rated prompt metadata. Content remains hidden in the library until adult visibility is enabled.</span>
                  </label>
                ) : null}

                {galleryMode === "gallery" ? (
                  <>
                    <div className="space-y-1.5">
                      <Micro>Browse by</Micro>
                      <Segmented<QueryType>
                        value={queryType}
                        onChange={setQueryType}
                        options={[
                          { value: "feed", label: "Feed" },
                          { value: "model", label: "Model ID" },
                          { value: "creator", label: "Creator" },
                          { value: "post", label: "Post ID" },
                          { value: "base", label: "Base model" },
                        ]}
                        className="w-full [&>button]:flex-1"
                      />
                    </div>
                    {queryType !== "feed" ? (
                      <div className="space-y-1.5">
                        <Micro>{queryType === "creator" ? "Creator username" : queryType === "base" ? "Civitai base model" : `${queryType} number`}</Micro>
                        <TextInput
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder={queryType === "creator" ? "creator name" : queryType === "base" ? "SDXL 1.0, Pony, Flux.1 D…" : "e.g. 123456"}
                          inputMode={queryType === "creator" || queryType === "base" ? "text" : "numeric"}
                        />
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Micro>Media</Micro>
                        <Segmented<"image" | "video">
                          value={media}
                          onChange={setMedia}
                          options={[{ value: "image", label: "Image" }, { value: "video", label: "Video" }]}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Micro>Sort</Micro>
                        <select
                          value={sort}
                          onChange={(e) => setSort(e.target.value as CivitaiSort)}
                          className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-[11.5px] text-ink-2 outline-none focus:border-accent-line"
                        >
                          {(["Most Reactions", "Most Comments", "Most Collected", "Newest", "Oldest", "Random"] as CivitaiSort[]).map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <Button variant="primary" className="w-full" disabled={busy} onClick={() => runCivitaiGallery(false)}>
                      <Icon name={busy ? "loader" : "search"} className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
                      {busy ? "Requesting…" : "Fetch up to 100 results"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Micro>Search LoRA name, creator, style, or trigger word</Micro>
                      <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. watercolor, cinematic, creator…" onKeyDown={(e) => e.key === "Enter" && runCivitaiModels()} />
                    </div>
                    <Button variant="primary" className="w-full" disabled={busy} onClick={runCivitaiModels}>
                      <Icon name={busy ? "loader" : "search"} className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
                      {busy ? "Searching…" : "Search Civitai LoRAs"}
                    </Button>
                  </>
                )}
              </>
            ) : null}

            {source === "lexica" ? (
              <>
                <div className="rounded-lg border border-line bg-surface-2 p-3">
                  <div className="flex items-start gap-2">
                    <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                    <p className="text-[11px] leading-relaxed text-ink-2">
                      Uses Lexica's documented search endpoint (50 results per search). Prompt metadata only; no preview image is copied. Review Lexica's attribution and non-commercial terms before reusing content.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Micro>Search phrase</Micro>
                  <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="cinematic night market, watercolor fox…" onKeyDown={(e) => e.key === "Enter" && runLexica()} />
                </div>
                <Segmented<RatingScope>
                  value={scope}
                  onChange={(v) => { setScope(v); setAgeChecked(false); }}
                  options={[{ value: "sfw", label: "SFW only" }, { value: "adult", label: "Include NSFW" }, { value: "all", label: "All" }]}
                  className="w-full [&>button]:flex-1"
                />
                {shouldAgeGate ? (
                  <label className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/5 p-2.5 text-[11px] leading-relaxed text-ink-2">
                    <input type="checkbox" checked={ageChecked} onChange={(e) => checkAge(e.target.checked)} className="mt-0.5 accent-[var(--pf-accent)]" />
                    <span><b className="text-warn">18+:</b> I am an adult and want mature-rated search results. The API's NSFW flag is binary, not a detailed rating.</span>
                  </label>
                ) : null}
                <Button variant="primary" className="w-full" disabled={busy} onClick={runLexica}>
                  <Icon name={busy ? "loader" : "search"} className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
                  {busy ? "Searching…" : "Search Lexica"}
                </Button>
              </>
            ) : null}

            {source === "file" ? (
              <>
                <div className="rounded-lg border border-teal-line bg-teal-soft p-3 text-[11px] leading-relaxed text-ink-2">
                  Import Civitai or Lexica API JSON, your own JSON export, or Krea's official Open Prompts CSV. Parsing happens in your browser; imports are capped at 500 rows per file.
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.csv,application/json,text/csv"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void loadFile(file);
                    e.currentTarget.value = "";
                  }}
                />
                <Button variant="primary" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
                  <Icon name="upload" className="h-3.5 w-3.5" /> Choose JSON or CSV
                </Button>
                {fileName ? <p className="mono truncate text-[10px] text-ink-3">{fileName} · {maxFileRows} prompt rows</p> : null}
                <Rule />
                <div className="space-y-1.5">
                  <Micro>Or paste JSON</Micro>
                  <TextArea value={rawText} onChange={(e) => setRawText(e.target.value)} rows={7} placeholder='{"items":[{"meta":{"prompt":"..."}}]}' className="mono text-[11px]" />
                </div>
                <Button className="w-full" disabled={!rawText.trim() || busy} onClick={parsePasted}>
                  <Icon name="check" className="h-3.5 w-3.5" /> Parse pasted data
                </Button>
                {scope !== "sfw" ? (
                  <label className="flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/5 p-2.5 text-[11px] leading-relaxed text-ink-2">
                    <input type="checkbox" checked={ageChecked} onChange={(e) => checkAge(e.target.checked)} className="mt-0.5 accent-[var(--pf-accent)]" />
                    <span><b className="text-warn">18+:</b> I am an adult and choose to import unrated or adult-marked prompt text.</span>
                  </label>
                ) : null}
                <Segmented<RatingScope> value={scope} onChange={(v) => { setScope(v); setAgeChecked(false); }} options={[{ value: "sfw", label: "SFW" }, { value: "adult", label: "18+" }, { value: "all", label: "All" }]} className="w-full [&>button]:flex-1" />
              </>
            ) : null}

            <Rule />
            <p className="text-[10.5px] leading-relaxed text-ink-3">
              Public gallery data can have creator-specific usage terms. This importer keeps attribution and links with each prompt. It does not mirror images, model weights, or scrape HTML pages.
            </p>
            {error ? (
              <div className="rounded-lg border border-danger/25 bg-danger/5 px-2.5 py-2 text-[11.5px] leading-relaxed text-danger">
                {error}
              </div>
            ) : null}
          </div>
        </section>

        {/* Results */}
        <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface-2/50 px-3 py-2.5">
            <Icon name={source === "civitai" ? "image" : source === "lexica" ? "search" : "upload"} className="h-3.5 w-3.5 text-accent" />
            <span className="text-[12px] font-semibold text-ink">Results</span>
            <span className="mono text-[10px] tabular-nums text-ink-3">{visibleRows.length}</span>
            <div className="ml-auto flex items-center gap-1.5">
              {visibleRows.length ? (
                <>
                  {lastImported > 0 ? (
                    <Button size="sm" variant="teal" onClick={onOpenLibrary}>
                      <Icon name="layers" className="h-3 w-3" /> View library
                    </Button>
                  ) : null}
                  <button
                    onClick={() => setSelected(selectedCount === visibleRows.length ? new Set() : new Set(visibleRows.map((r) => r.key)))}
                    className="text-[10.5px] font-medium text-ink-3 transition hover:text-ink"
                  >
                    {selectedCount === visibleRows.length ? "Deselect all" : "Select visible"}
                  </button>
                  <Rule vertical />
                  <Button variant="primary" size="sm" disabled={!selectedCount} onClick={addSelected}>
                    <Icon name="plus" className="h-3 w-3" /> Add {selectedCount}
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {galleryMode === "loras" && source === "civitai" && models.length ? (
            <div className="border-b border-line bg-teal-soft/30 p-3">
              <Micro>LoRA search results · select a model to browse its prompt gallery</Micro>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {models.map((m) => {
                  const version = m.modelVersions?.[0];
                  return (
                    <div key={m.id} className="rounded-lg border border-line bg-surface p-2.5">
                      <div className="flex items-start gap-2">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-teal-soft text-teal">
                          <Icon name="layers" className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11.5px] font-semibold text-ink">{m.name}</div>
                          <div className="text-[10px] text-ink-3">{m.creator?.username ?? "Civitai creator"} · {version?.baseModel ?? "base model not listed"}</div>
                        </div>
                        <Button size="xs" variant="teal" onClick={() => void browseLora(m.id)}>
                          Gallery
                        </Button>
                      </div>
                      {version?.trainedWords?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {version.trainedWords.slice(0, 5).map((w) => <Chip key={w} className="mono">{w}</Chip>)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {visibleRows.length ? (
            <div className="max-h-[calc(100dvh-18rem)] divide-y divide-line overflow-y-auto">
              {visibleRows.map(({ key, draft }) => {
                const resources = draft.resources ?? [];
                return (
                  <div key={key} className="group flex gap-2.5 p-3 transition-colors hover:bg-surface-2/55">
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggleRow(key)}
                      aria-label={`Select ${draft.title ?? "prompt"}`}
                      className="mt-1 h-3.5 w-3.5 shrink-0 accent-[var(--pf-accent)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="truncate text-[12px] font-semibold text-ink">{draft.title}</h3>
                        <SafetyBadge draft={draft} />
                        {draft.model ? <span className="mono rounded border border-line bg-surface-2 px-1 py-0.5 text-[9px] text-ink-3">{draft.model}</span> : null}
                      </div>
                      <div className="mt-1.5">
                        <PromptSnippet draft={draft} reveal={showAdult} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-3">
                        {draft.sourceAuthor ? <span>by {draft.sourceAuthor}</span> : null}
                        {draft.sourceId ? <span className="mono">#{draft.sourceId}</span> : null}
                        {draft.aspectRatio ? <span>{draft.aspectRatio}</span> : null}
                        {draft.seed ? <span className="mono">seed {draft.seed}</span> : null}
                        {resources.filter((r) => r.type.toLowerCase().includes("lora")).length ? (
                          <span className="inline-flex items-center gap-1 rounded bg-teal-soft px-1.5 py-0.5 text-teal">
                            <Icon name="layers" className="h-2.5 w-2.5" />
                            {resources.filter((r) => r.type.toLowerCase().includes("lora")).length} LoRA{resources.filter((r) => r.type.toLowerCase().includes("lora")).length > 1 ? "s" : ""}
                          </span>
                        ) : null}
                        {draft.sourceUrl ? (
                          <a href={draft.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-accent-text underline decoration-accent-line underline-offset-2">
                            Source <Icon name="arrowRight" className="h-2.5 w-2.5" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-[340px] place-items-center p-8 text-center">
              <div className="max-w-xs">
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-2 text-ink-3">
                  <Icon name={source === "civitai" ? "image" : source === "lexica" ? "search" : "upload"} className="h-5 w-5" />
                </span>
                <p className="mt-3 text-[12px] font-medium text-ink-2">No results loaded</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
                  Search a source or choose a local export. Only prompts with readable metadata can be imported.
                </p>
              </div>
            </div>
          )}

          {nextCursor && source === "civitai" && galleryMode === "gallery" ? (
            <div className="border-t border-line bg-surface-2/40 p-2.5 text-center">
              <Button size="sm" disabled={busy} onClick={() => void runCivitaiGallery(true)}>
                <Icon name="arrowRight" className="h-3 w-3" /> Load next 100 (manual)
              </Button>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-line px-3 py-2 text-[10px] text-ink-3">
            <span>Prompt text + metadata only · image URLs are linked, never copied</span>
            <a href="https://developer.civitai.com/site/reference/images" target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-2 hover:text-ink-2">API reference</a>
          </div>
        </section>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-2/50 px-3 py-2">
        <div className="flex items-center gap-2 text-[10.5px] text-ink-3">
          <Icon name="shield" className="h-3 w-3 text-teal" />
          <span>Manual, source-attributed imports only. PromptHero has no open bulk endpoint here, so the app does not crawl its pages.</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://github.com/krea-ai/open-prompts" target="_blank" rel="noreferrer" className="text-[10.5px] text-accent-text underline decoration-accent-line underline-offset-2">Krea CSV dataset</a>
          <Rule vertical />
          <a href="https://lexica.art/docs" target="_blank" rel="noreferrer" className="text-[10.5px] text-accent-text underline decoration-accent-line underline-offset-2">Lexica API</a>
          <Rule vertical />
          <a href="https://prompthero.com/faq" target="_blank" rel="noreferrer" className="text-[10.5px] text-accent-text underline decoration-accent-line underline-offset-2">PromptHero policy</a>
        </div>
      </div>
    </div>
  );
}