"use client";

import * as React from "react";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { useServerInsertedHTML } from "next/navigation";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import lightTheme, { darkTheme } from "./theme";

type Props = {
  children: React.ReactNode;
};

// 간단한 다크/라이트 스위처 (localStorage 보존)
function useColorScheme() {
  const [mode, setMode] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const saved = (typeof window !== "undefined" &&
      localStorage.getItem("color-scheme")) as "light" | "dark" | null;
    if (saved) setMode(saved);
  }, []);

  const toggle = React.useCallback(() => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      if (typeof window !== "undefined")
        localStorage.setItem("color-scheme", next);
      return next;
    });
  }, []);

  return { mode, toggle };
}

// Emotion cache (MUI 공식 가이드 패턴)
function useMuiCache() {
  const cache = React.useMemo(() => {
    const c = createCache({ key: "mui", prepend: true });
    c.compat = true;
    return c;
  }, []);

  useServerInsertedHTML(() => (
    <style
      data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(" ")}`}
      dangerouslySetInnerHTML={{
        __html: Object.values(cache.inserted).join(" "),
      }}
    />
  ));

  return cache;
}

export const ColorSchemeContext = React.createContext<{
  mode: "light" | "dark";
  toggle: () => void;
}>({
  mode: "light",
  toggle: () => {},
});

export default function ThemeRegistry({ children }: Props) {
  const cache = useMuiCache();
  const { mode, toggle } = useColorScheme();
  const theme = React.useMemo(
    () => createTheme(mode === "light" ? lightTheme : darkTheme),
    [mode]
  );

  return (
    <CacheProvider value={cache}>
      <ColorSchemeContext.Provider value={{ mode, toggle }}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorSchemeContext.Provider>
    </CacheProvider>
  );
}
