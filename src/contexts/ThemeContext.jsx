// contexts/ThemeContext.jsx
import { createContext, useContext, useEffect, useMemo, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ConfigProvider, theme as antTheme } from "antd";
import { supabase } from "../lib/supabase";
import { useOrganization } from './OrganizationContext';

const ThemeContext = createContext();

const FALLBACK_PRIMARY = '#0D47A1';
const FALLBACK_ACCENT = '#FF1070';
const FALLBACK_FONT_HEADING = 'Righteous';
const FALLBACK_FONT_BODY = 'Montserrat';

function getLightTint(hex) {
  if (hex.length === 9) return hex;
  return hex + "20";
}

export function ThemeProvider({ children }) {
  const { org } = useOrganization();
  const [darkMode, setDarkMode] = useState(false);

  const {
    data: theme,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["theme", org?.id],
    queryFn: async () => {
      if (!org?.id) return null;
      const { data, error } = await supabase
        .from("themes")
        .select("*")
        .eq("org_id", org.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!org?.id,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  // ─── Apply CSS variables ──────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const primary = theme?.primary_color || FALLBACK_PRIMARY;
    const accent = theme?.accent_color || FALLBACK_ACCENT;
    const primaryLight = theme?.primary_light_color || primary;
    const primaryDark = theme?.primary_dark_color || primary;
    const accentLight = theme?.accent_light_color || accent;
    const accentDark = theme?.accent_dark_color || accent;
    const fontHeading = theme?.font_heading || FALLBACK_FONT_HEADING;
    const fontBody = theme?.font_body || FALLBACK_FONT_BODY;

    root.style.setProperty("--primary-color", primary);
    root.style.setProperty("--primary-light-color", primaryLight);
    root.style.setProperty("--primary-dark-color", primaryDark);
    root.style.setProperty("--accent-color", accent);
    root.style.setProperty("--accent-light-color", accentLight);
    root.style.setProperty("--accent-dark-color", accentDark);
    root.style.setProperty("--primary-bg", getLightTint(primary));
    root.style.setProperty("--accent-bg", getLightTint(accent));
    root.style.setProperty("--font-heading", fontHeading);
    root.style.setProperty("--font-body", fontBody);
  }, [theme]);

  // ─── Ant Design theme (dark/light) ────────────────────
  const antdTheme = useMemo(() => {
    const primary = theme?.primary_color || FALLBACK_PRIMARY;
    const font = theme?.font_body || FALLBACK_FONT_BODY;
    const algorithm = darkMode ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm;
    return {
      algorithm,
      token: {
        colorPrimary: primary,
        colorLink: theme?.accent_color || FALLBACK_ACCENT,
        fontFamily: font,
        borderRadius: 8,
      },
      components: {
        Layout: {
          headerBg: darkMode ? '#1f1f1f' : '#ffffff',
          siderBg: darkMode ? '#141414' : '#ffffff',
          bodyBg: darkMode ? '#141414' : '#f5f5f5',
        },
        Card: {
          colorBgContainer: darkMode ? '#1f1f1f' : '#ffffff',
        },
        Table: {
          colorBgContainer: darkMode ? '#1f1f1f' : '#ffffff',
        },
      },
    };
  }, [theme, darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  const contextValue = useMemo(() => ({
    theme,
    isLoading,
    error,
    refetchTheme: refetch,
    darkMode,
    toggleDarkMode,
  }), [theme, isLoading, error, refetch, darkMode, toggleDarkMode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}