// API Configuration
// Use your machine's local IP for Android device testing
// Use 'http://localhost:3000/api' for iOS simulator or web
export const API_URL = 'http://134.122.96.197:3000/api';

// App Colors
export const COLORS = {
  primary: '#a855f7',
  primaryLight: '#c084fc',
  background: '#ffffff',
  backgroundSecondary: '#fafafa',
  text: '#18181b',
  textSecondary: '#71717a',
  textMuted: '#a1a1aa',
  border: '#f4f4f5',
  borderDark: '#e4e4e7',
  error: '#ef4444',
  success: '#22c55e',
} as const;

// Emotional Friction Levels
export const EMOTIONAL_FRICTION = ['Low', 'Medium', 'High'] as const;

// Energy Scale
export const ENERGY_MIN = 1;
export const ENERGY_MAX = 10;

