// Theme system — dark and light themes inlined into the Record
// for easy iteration in applyTheme()

export type ThemeName = 'dark' | 'light'
export type Theme = {
  primary: string
  'primary-dim': string
  'primary-glow': string
  secondary: string
  'secondary-dim': string
  accent: string
  'accent-dim': string
  'bg-base': string
  'bg-surface': string
  'bg-elevated': string
  'bg-overlay': string
  'text-primary': string
  'text-secondary': string
  'text-muted': string
  border: string
  'border-light': string
  success: string
  warning: string
  error: string
  info: string
}

export const themes: Record<ThemeName, Theme> = {
  dark: {
    primary: '#0A84FF',
    'primary-dim': 'rgba(10, 132, 255, 0.2)',
    'primary-glow': 'rgba(10, 132, 255, 0.4)',
    secondary: '#00D4AA',
    'secondary-dim': 'rgba(0, 212, 170, 0.2)',
    accent: '#BF5AF2',
    'accent-dim': 'rgba(191, 90, 242, 0.2)',
    'bg-base': '#0D0D0F',
    'bg-surface': '#151518',
    'bg-elevated': '#1C1C21',
    'bg-overlay': '#232328',
    'text-primary': '#FFFFFF',
    'text-secondary': '#98989D',
    'text-muted': '#75757A',
    border: '#2C2C31',
    'border-light': '#3A3A40',
    success: '#30D158',
    warning: '#FFD60A',
    error: '#FF453A',
    info: '#64D2FF',
  },
  light: {
    primary: '#007AFF',
    'primary-dim': 'rgba(0, 122, 255, 0.15)',
    'primary-glow': 'rgba(0, 122, 255, 0.3)',
    secondary: '#00B48D',
    'secondary-dim': 'rgba(0, 180, 141, 0.15)',
    accent: '#AF52DE',
    'accent-dim': 'rgba(175, 82, 222, 0.15)',
    'bg-base': '#F5F5F7',
    'bg-surface': '#FFFFFF',
    'bg-elevated': '#FAFAFA',
    'bg-overlay': '#E8E8ED',
    'text-primary': '#1D1D1F',
    'text-secondary': '#6E6E73',
    'text-muted': '#AEAEB2',
    border: '#D2D2D7',
    'border-light': '#E5E5EA',
    success: '#34C759',
    warning: '#FF9F0A',
    error: '#FF3B30',
    info: '#007AFF',
  },
}

export function getTheme(name: ThemeName): Theme {
  return themes[name] || themes.dark
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
}
