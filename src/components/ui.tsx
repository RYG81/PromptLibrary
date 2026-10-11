import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { useTheme, type Mode } from "../lib/theme";

/* ════════════════════════════════ ICONS ════════════════════════════════ */

const P: Record<string, React.ReactNode> = {
  sparkle: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.6 6.1.8-4.4 4.2 1.1 6.1L12 17.3 6.6 20.2l1.1-6.1-4.4-4.2 6.1-.8L12 3.5z" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2 2 0 0 0-2 2v7.5A2.5 2.5 0 0 0 6.5 15" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4z" />
      <path d="m14 6 4 4" />
    </>
  ),
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5" />
      <path d="m7 10 5-5 5 5" />
      <path d="M5 20h14" />
    </>
  ),
  x: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  layers: (
    <>
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </>
  ),
  tag: (
    <>
      <path d="M20.5 13.5 13 21a2 2 0 0 1-2.8 0l-7-7A2 2 0 0 1 2.6 12L3 4l8-.4a2 2 0 0 1 1.5.6l7.9 7.9a1 1 0 0 1 .1 1.4z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.2A1.6 1.6 0 0 0 7.5 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 13H3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 5 6.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10.5 3V3a2 2 0 1 1 4 0v.2A1.6 1.6 0 0 0 17 4.6l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 10.5h.2a2 2 0 1 1 0 4H21a1.6 1.6 0 0 0-1.6 1z" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3.5 6h.01" />
      <path d="M3.5 12h.01" />
      <path d="M3.5 18h.01" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="9.5" r="1.6" />
      <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </>
  ),
  video: (
    <>
      <rect x="2.5" y="5" width="13" height="14" rx="2.5" />
      <path d="m16.5 11 5-3.2v8.4l-5-3.2z" />
    </>
  ),
  wand: (
    <>
      <path d="M15 4 4 15l5 5L20 9z" />
      <path d="m14 5 5 5" />
      <path d="M18 2.5v2M21.5 6h-2M20 10.5l1.5-1.5" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v14H6.5A2.5 2.5 0 0 0 4 19.5V5.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19v4H6.5A2.5 2.5 0 0 1 4 19.5z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  flask: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v6L5 19a2 2 0 0 0 1.8 2.8h10.4A2 2 0 0 0 19 19l-5-10V3" />
      <path d="M7.5 14h9" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3.2" />
      <path d="M4 6v12c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V6" />
      <path d="M4 12c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2" />
    </>
  ),
  shuffle: (
    <>
      <path d="M16 4h5v5" />
      <path d="M21 4 3 20" />
      <path d="M16 20h5v-5" />
      <path d="m14 14 7 6" />
      <path d="m3 4 6 5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M9 21h6M12 17v4" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />,
  folder: (
    <>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2l2 2.5h7.8A2.5 2.5 0 0 1 21 10v7a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17V7.5z" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
      <circle cx="16" cy="8" r="2" />
      <circle cx="10" cy="16" r="2" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </>
  ),
  bolt: <path d="M13 3 5 13h5l-1 8 8-10h-5l1-8z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  loader: (
    <>
      <path d="M20 12a8 8 0 1 1-5.7-7.7" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  link: (
    <>
      <path d="M10 13.5 8.5 15a3.2 3.2 0 0 1-4.5-4.5l3-3A3.2 3.2 0 0 1 11.5 7" />
      <path d="m14 10.5 1.5-1.5a3.2 3.2 0 0 1 4.5 4.5l-3 3a3.2 3.2 0 0 1-4.5.5" />
      <path d="m9 15 6-6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.3" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
};

export type IconName = keyof typeof P;

export function Icon({
  name,
  className,
  strokeWidth = 1.7,
}: {
  name: IconName | string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden="true"
    >
      {P[name] ?? null}
    </svg>
  );
}

/* ════════════════════════════════ BUTTONS ════════════════════════════════ */

type Variant = "primary" | "ghost" | "outline" | "subtle" | "teal" | "danger";
type Size = "xs" | "sm" | "md" | "icon" | "iconSm";

const V: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-[color:var(--pf-accent-hover)] active:brightness-95",
  outline: "border border-line bg-surface text-ink-2 hover:border-line-2 hover:bg-surface-2 hover:text-ink",
  ghost: "text-ink-3 hover:bg-accent-soft hover:text-accent-text dark:hover:text-accent",
  subtle: "border border-line bg-surface-2 text-ink-2 hover:border-line-2 hover:text-ink",
  teal: "border border-teal-line bg-teal-soft text-teal hover:brightness-110",
  danger: "border border-danger/35 text-danger hover:bg-danger/10",
};

const S: Record<Size, string> = {
  xs: "h-7 gap-1 px-2 text-[11px] rounded-lg",
  sm: "h-8 gap-1.5 px-2.5 text-[12px] rounded-lg",
  md: "h-9 gap-2 px-3.5 text-[13px] rounded-xl",
  icon: "h-9 w-9 rounded-xl",
  iconSm: "h-7 w-7 rounded-lg",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-all duration-150 active:scale-[.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--pf-canvas)]",
        "disabled:pointer-events-none disabled:opacity-40",
        S[size],
        V[variant],
        className,
      )}
    />
  );
}

/** Icon-only button with a native tooltip — the workhorse of the new chrome. */
export function IconButton({
  icon,
  label,
  active,
  className,
  variant = "ghost",
  size = "icon",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName | string;
  label: string;
  active?: boolean;
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      {...props}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex select-none items-center justify-center transition-all duration-150 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pf-ring)]",
        S[size],
        active ? "bg-accent-soft text-accent" : V[variant],
        className,
      )}
    >
      <Icon name={icon} className={size === "iconSm" || size === "xs" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}

/* ════════════════════════════════ SEGMENTED ════════════════════════════════ */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label?: string; icon?: string; count?: number }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface-2/70 p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            title={o.label ?? o.value}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-medium transition-all duration-150",
              on
                ? "bg-surface text-ink shadow-soft"
                : "text-ink-3 hover:text-ink-2",
            )}
          >
            {o.icon ? <Icon name={o.icon} className="h-3.5 w-3.5" /> : null}
            {o.label ? <span>{o.label}</span> : null}
            {typeof o.count === "number" ? (
              <span
                className={cn(
                  "rounded px-1 text-[10px] tabular-nums",
                  on ? "bg-accent-soft text-accent" : "text-ink-3/70",
                )}
              >
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════ CHIP ════════════════════════════════ */

export function Chip({
  children,
  active,
  onClick,
  className,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-all duration-150",
        active
          ? "border-accent-line bg-accent-soft text-accent"
          : "border-line bg-surface/60 text-ink-3 hover:border-line-2 hover:text-ink-2",
        onClick && "active:scale-95",
        className,
      )}
    >
      {children}
    </Comp>
  );
}

/** Small removable filter pill. */
export function Pill({
  children,
  onRemove,
  tone = "accent",
}: {
  children: React.ReactNode;
  onRemove: () => void;
  tone?: "accent" | "warn" | "plain";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tone === "accent" && "border-accent-line bg-accent-soft text-accent",
        tone === "warn" && "border-warn/40 bg-warn/10 text-warn",
        tone === "plain" && "border-line bg-surface-2 text-ink-2",
      )}
    >
      {children}
      <button onClick={onRemove} className="opacity-60 transition hover:opacity-100" aria-label="Remove filter">
        <Icon name="x" className="h-3 w-3" />
      </button>
    </span>
  );
}

/* ════════════════════════════════ INPUTS ════════════════════════════════ */

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 outline-none transition-all duration-150 hover:border-line-2 focus:border-accent-line focus:ring-[3px] focus:ring-[color:var(--pf-accent-soft)]";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, "h-9 py-0", props.className)} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> },
) {
  return (
    <textarea
      {...props}
      className={cn(inputClass, "resize-y leading-relaxed", props.className)}
    />
  );
}

/** Compact select with an inline leading icon — replaces label+select rows. */
export function Select({
  icon,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { icon?: string }) {
  return (
    <div className="relative">
      {icon ? (
        <Icon name={icon} className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
      ) : null}
      <select
        {...props}
        className={cn(
          "h-9 w-full appearance-none rounded-xl border border-line bg-surface pr-7 text-[12.5px] font-medium text-ink-2 outline-none transition-all duration-150",
          icon ? "pl-8" : "pl-3",
          "hover:border-line-2 focus:border-accent-line focus:ring-[3px] focus:ring-[color:var(--pf-accent-soft)]",
          className,
        )}
      >
        {children}
      </select>
      <Icon
        name="chevron"
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
      />
    </div>
  );
}

/** Tiny uppercase micro-label — the only remaining "label" in the UI. */
export function Micro({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("mono text-[10px] font-medium uppercase tracking-[0.13em] text-ink-3", className)}>
      {children}
    </span>
  );
}

/** A settings cell: micro label above a control. Compact replacement for Field. */
export function Cell({
  label,
  icon,
  children,
  hint,
}: {
  label: string;
  icon?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="group block space-y-1.5">
      <span className="flex items-center gap-1.5">
        {icon ? <Icon name={icon} className="h-3 w-3 text-ink-3" /> : null}
        <Micro>{label}</Micro>
      </span>
      {children}
      {hint ? <span className="block text-[10.5px] leading-snug text-ink-3/80">{hint}</span> : null}
    </label>
  );
}

/** Legacy alias for Cell (supports the older `right` slot). */
export function Field({
  label,
  icon,
  children,
  hint,
  right,
}: {
  label: string;
  icon?: string;
  children: React.ReactNode;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <label className="group block space-y-1.5">
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          {icon ? <Icon name={icon} className="h-3 w-3 text-ink-3" /> : null}
          <Micro>{label}</Micro>
        </span>
        {right}
      </span>
      {children}
      {hint ? <span className="block text-[10.5px] leading-snug text-ink-3/80">{hint}</span> : null}
    </label>
  );
}

/* ════════════════════════════════ POPOVER ════════════════════════════════ */

export function Popover({
  trigger,
  children,
  align = "right",
  width = "w-72",
}: {
  trigger: (o: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open ? (
        <div
          className={cn(
            "absolute top-[calc(100%+8px)] z-50 rounded-2xl border border-line bg-elevated p-3 shadow-pop animate-[pop_.16s_ease-out]",
            align === "right" ? "right-0" : "left-0",
            width,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

/* ════════════════════════════════ MODAL ════════════════════════════════ */

export function Modal({
  open,
  onClose,
  children,
  title,
  subtitle,
  icon,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: string;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-3 sm:p-6">
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[3px] animate-[fade_.16s_ease-out]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 my-auto w-full overflow-hidden rounded-2xl border border-line bg-elevated shadow-pop animate-[pop_.2s_cubic-bezier(.22,1,.36,1)]",
          wide ? "max-w-5xl" : "max-w-lg",
        )}
      >
        {title ? (
          <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            {icon ? (
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon name={icon} className="h-4 w-4" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[14px] font-semibold tracking-tight text-ink">{title}</h2>
              {subtitle ? <p className="truncate text-[11.5px] text-ink-3">{subtitle}</p> : null}
            </div>
            <IconButton icon="x" label="Close" size="iconSm" onClick={onClose} />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════════════ TOASTS ════════════════════════════════ */

type Toast = { id: number; msg: string; tone: "ok" | "info" | "warn" };
const ToastCtx = createContext<(msg: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((msg: string, tone: Toast["tone"] = "ok") => {
    const id = ++seq.current;
    setItems((prev) => [...prev.slice(-3), { id, msg, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2400);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[12.5px] font-medium shadow-pop backdrop-blur-xl animate-[pop_.18s_ease-out]",
              t.tone === "ok" && "border-ok/25 bg-ok/12 text-ok",
              t.tone === "info" && "border-accent-line bg-accent-soft text-accent",
              t.tone === "warn" && "border-warn/30 bg-warn/12 text-warn",
            )}
          >
            <Icon name={t.tone === "warn" ? "bolt" : "check"} className="h-3.5 w-3.5" />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ════════════════════════════════ THEME SWITCH ════════════════════════════════ */

const ORDER: Mode[] = ["light", "dark", "system"];
const META: Record<Mode, { icon: string; label: string }> = {
  light: { icon: "sun", label: "Light" },
  dark: { icon: "moon", label: "Dark" },
  system: { icon: "monitor", label: "System" },
};

/* ════════════════════════════════ RULE ════════════════════════════════ */

/** Explicit border separator — vertical or horizontal. */
export function Rule({ vertical, className }: { vertical?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 bg-line",
        vertical ? "h-5 w-px" : "h-px w-full",
        className,
      )}
    />
  );
}

/* ════════════════════════════════ COPY BUTTON ════════════════════════════════ */

/** Copy button that morphs into a confirmation state — the core of the copy UX. */
export function CopyButton({
  text,
  label = "Copy",
  onCopied,
  variant = "primary",
  size = "sm",
  className,
}: {
  text: string;
  label?: string;
  onCopied?: (ok: boolean) => void;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    setState(ok ? "ok" : "fail");
    onCopied?.(ok);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1400);
  };

  const icon = state === "ok" ? "check" : state === "fail" ? "x" : "copy";
  const text_ = state === "ok" ? "Copied" : state === "fail" ? "Blocked" : label;

  return (
    <Button
      variant={state === "ok" ? "primary" : state === "fail" ? "danger" : variant}
      size={size}
      onClick={go}
      className={cn(state === "ok" && "ring-pulse", className)}
      title={text_}
    >
      <Icon name={icon} className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} />
      <span key={state} className="tick">
        {text_}
      </span>
    </Button>
  );
}

/** Icon-only copy affordance for dense rows. */
export function CopyIcon({
  text,
  label = "Copy",
  onCopied,
  size = "iconSm",
}: {
  text: string;
  label?: string;
  onCopied?: (ok: boolean) => void;
  size?: Size;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <IconButton
      icon={done ? "check" : "copy"}
      label={done ? "Copied" : label}
      size={size}
      active={done}
      className={done ? "text-ok" : ""}
      onClick={async () => {
        let ok = false;
        try {
          await navigator.clipboard.writeText(text);
          ok = true;
        } catch {
          ok = false;
        }
        setDone(ok);
        onCopied?.(ok);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(false), 1300);
      }}
    />
  );
}

export function ThemeSwitch() {
  const { mode, resolved, setMode } = useTheme();
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface-2/70 p-0.5"
      title={`Theme: ${META[mode].label}`}
    >
      {ORDER.map((m) => {
        const on = mode === m;
        return (
          <button
            key={m}
            onClick={() => setMode(m)}
            title={META[m].label}
            aria-label={META[m].label}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-[9px] transition-all duration-150",
              on ? "bg-surface text-accent shadow-soft" : "text-ink-3 hover:text-ink-2",
            )}
          >
            <Icon name={META[m].icon} className="h-3.5 w-3.5" />
          </button>
        );
      })}
      <span className="sr-only">Currently {resolved}</span>
    </div>
  );
}
