import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "app-theme";

const apply = (t: Theme) => {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(t);
  document.body.classList.remove("light", "dark");
  document.body.classList.add(t);
  root.style.colorScheme = t;
};

const initial = (): Theme => {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    apply(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}
