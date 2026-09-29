export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const RADII = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const TYPOGRAPHY = {
  display: 30,
  title: 24,
  section: 18,
  cardTitle: 16,
  body: 14,
  secondary: 13,
  caption: 12,
  micro: 11,
} as const;

export const LAYOUT = {
  screenPadding: 20,
  contentMaxWidth: 760,
  buttonHeight: 52,
  compactButtonHeight: 44,
  iconButtonSize: 44,
  tabBarHeight: 72,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  floating: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;