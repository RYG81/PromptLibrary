import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Mode = "light" | "dark" | "system";

const KEY = "promptlibrary.theme";

type Ctx = {
  mode: Mode;
  resolved: "light" | "dark";
  setMode: (m: Mode) => void;
  cycle: () => void;
};

const ThemeCtx = createContext<Ctx>({ mode: "dark", resolved: "dark", setMode: () => {}, cycle: () => {} });

function readMode(): Mode {
  try {
    // one-time rename migration
    const legacy = localStorage.getItem("promptforge.theme");
    if (legacy && localStorage.getItem(KEY) === null) localStorage.setItem(KEY, legacy);
    if (legacy) localStorage.removeItem("promptforge.theme");
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => (typeof window === "undefined" ? "dark" : readMode()));
  const [sysDark, setSysDark] = useState<boolean>(() => (typeof window === "undefined" ? true : systemDark()));

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" = mode === "system" ? (sysDark ? "dark" : "light") : mode;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
  }, [resolved, mode]);

  const setMode = useCallback((m: Mode) => setModeState(m), []);
  const cycle = useCallback(() => {
    setModeState((m) => (m === "light" ? "dark" : m === "dark" ? "system" : "light"));
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode, cycle }), [mode, resolved, setMode, cycle]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
