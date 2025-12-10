import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useColorScheme, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Theme color palettes
export const lightTheme = {
  // Backgrounds
  background: "#ffffff",
  backgroundSecondary: "#fafafa",
  backgroundGlass: "rgba(255, 255, 255, 0.75)",
  backgroundGlassLight: "rgba(255, 255, 255, 0.5)",
  backgroundInput: "rgba(255, 255, 255, 0.8)",

  // Gradients
  gradientColors: ["#ffffff", "#faf5ff", "#fdf4ff", "#ffffff"] as const,

  // Text
  text: "#18181b",
  textSecondary: "#71717a",
  textMuted: "#a1a1aa",

  // Borders
  border: "#f4f4f5",
  borderDark: "#e4e4e7",
  borderGlass: "rgba(255, 255, 255, 0.6)",
  borderInput: "rgba(168, 85, 247, 0.15)",

  // Primary colors
  primary: "#a855f7",
  primaryLight: "#c084fc",

  // Status
  error: "#ef4444",
  success: "#22c55e",

  // Stars
  starColor: "#c084fc",

  // Shadows
  shadowColor: "#a855f7",

  // Orb glow
  orbGlowBorder: "rgba(255, 255, 255, 0.5)",
  orbGlowInner: "rgba(255, 255, 255, 0.3)",
};

export const darkTheme = {
  // Backgrounds - Deep purple tones
  background: "#0d0a1a",
  backgroundSecondary: "#16102a",
  backgroundGlass: "rgba(25, 18, 50, 0.85)",
  backgroundGlassLight: "rgba(40, 28, 70, 0.7)",
  backgroundInput: "rgba(30, 22, 55, 0.9)",

  // Gradients - Rich purple aurora effect
  gradientColors: [
    "#0d0a1a",
    "#1a0f2e",
    "#241538",
    "#1a0f2e",
    "#0d0a1a",
  ] as const,

  // Text
  text: "#f8f5ff",
  textSecondary: "#c4b5fd",
  textMuted: "#8b7fad",

  // Borders
  border: "#2d2250",
  borderDark: "#3d3065",
  borderGlass: "rgba(168, 85, 247, 0.4)",
  borderInput: "rgba(168, 85, 247, 0.35)",

  // Primary colors
  primary: "#a855f7",
  primaryLight: "#c084fc",

  // Status
  error: "#f87171",
  success: "#4ade80",

  // Stars - Brighter for dark mode
  starColor: "#d8b4fe",

  // Shadows
  shadowColor: "#1a0530",

  // Orb glow - More vibrant
  orbGlowBorder: "rgba(168, 85, 247, 0.6)",
  orbGlowInner: "rgba(196, 132, 252, 0.4)",
};

export type ThemeColors = typeof lightTheme;
export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = "@app_theme_mode";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [isLoading, setIsLoading] = useState(true);

  // Determine if dark mode based on mode setting and system preference
  const isDark = useMemo(() => {
    if (mode === "system") {
      return systemColorScheme === "dark";
    }
    return mode === "dark";
  }, [mode, systemColorScheme]);

  // Get the appropriate theme colors
  const theme = useMemo(() => {
    return isDark ? darkTheme : lightTheme;
  }, [isDark]);

  // Load saved theme preference on mount
  useEffect(() => {
    async function loadThemePreference() {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ["light", "dark", "system"].includes(savedMode)) {
          setModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.warn("Failed to load theme preference:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadThemePreference();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // Force re-render when system theme changes
      if (mode === "system") {
        setModeState("system");
      }
    });

    return () => subscription.remove();
  }, [mode]);

  // Set theme mode and persist to storage
  const setMode = useCallback(async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
      setModeState(newMode);
    } catch (error) {
      console.warn("Failed to save theme preference:", error);
    }
  }, []);

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(async () => {
    const newMode = isDark ? "light" : "dark";
    await setMode(newMode);
  }, [isDark, setMode]);

  const value: ThemeContextType = {
    theme,
    mode,
    isDark,
    setMode,
    toggleTheme,
  };

  // Don't render until we've loaded the saved preference
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
