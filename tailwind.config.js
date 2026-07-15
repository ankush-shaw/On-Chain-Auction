/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'headline-xl':  ['48px', { lineHeight: '56px',  letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg':  ['32px', { lineHeight: '40px',  letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-md':  ['24px', { lineHeight: '32px',  fontWeight: '600' }],
        'headline-sm':  ['20px', { lineHeight: '28px',  fontWeight: '600' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'body-lg':  ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-md':  ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-sm':  ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      colors: {
        // ── Stitch Design System Palette ────────────────────────────────────────
        primary:               '#051227',   // deep navy
        'primary-container':   '#1b273d',   // navy card surface
        'on-primary':          '#ffffff',
        'on-primary-container':'#828ea9',
        'primary-fixed':       '#d7e2ff',
        'primary-fixed-dim':   '#bac7e3',
        'on-primary-fixed':    '#0f1b31',
        'on-primary-fixed-variant': '#3b475e',
        'inverse-primary':     '#bac7e3',

        secondary:                 '#835400',
        'secondary-container':     '#fcab28',   // gold accent
        'on-secondary':            '#ffffff',
        'on-secondary-container':  '#694300',
        'secondary-fixed':         '#ffddb5',
        'secondary-fixed-dim':     '#ffb957',
        'on-secondary-fixed':      '#2a1800',
        'on-secondary-fixed-variant': '#643f00',

        tertiary:                 '#00112f',
        'tertiary-container':     '#002556',
        'on-tertiary':            '#ffffff',
        'on-tertiary-container':  '#5a8de8',
        'tertiary-fixed':         '#d8e2ff',
        'tertiary-fixed-dim':     '#acc7ff',
        'on-tertiary-fixed':      '#001a40',
        'on-tertiary-fixed-variant': '#004492',

        // ── Surfaces ─────────────────────────────────────────────────────────────
        background:                 '#f7f9fc',
        'on-background':            '#191c1e',
        surface:                    '#f7f9fc',
        'on-surface':               '#191c1e',
        'surface-variant':          '#e0e3e6',
        'on-surface-variant':       '#45474d',
        'surface-bright':           '#f7f9fc',
        'surface-dim':              '#d8dadd',
        'surface-container-lowest': '#ffffff',
        'surface-container-low':    '#f2f4f7',
        'surface-container':        '#eceef1',
        'surface-container-high':   '#e6e8eb',
        'surface-container-highest':'#e0e3e6',
        'inverse-surface':          '#2d3133',
        'inverse-on-surface':       '#eff1f4',
        'surface-tint':             '#535e77',

        // ── Utility ──────────────────────────────────────────────────────────────
        outline:          '#75777e',
        'outline-variant':'#c5c6cd',
        error:            '#ba1a1a',
        'on-error':       '#ffffff',
        'error-container':'#ffdad6',
        'on-error-container': '#93000a',

        // ── Brand-specific ────────────────────────────────────────────────────────
        'auction-live':     '#E91E63',   // hot pink – live badge
        'auction-upcoming': '#3B71CA',   // blue – upcoming
        'gold-service':     '#E9D758',   // gold premium
        'success-green':    '#2E7D32',   // settled/success

        // ── Legacy aliases kept so old components don't break until refactored ────
        cream: {
          50:  '#ffffff',
          100: '#f7f9fc',
          200: '#eceef1',
          300: '#c5c6cd',
          400: '#75777e',
        },
      },
      maxWidth: {
        'container-max': '1280px',
      },
      spacing: {
        'gutter':          '1.5rem',
        'margin-mobile':   '1rem',
        'stack-sm':        '0.5rem',
        'stack-md':        '1rem',
        'stack-lg':        '2rem',
        'section-padding': '5rem',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        sm:   '0.125rem',
        md:   '0.375rem',
        lg:   '0.5rem',
        xl:   '0.75rem',
        '2xl':'1rem',
        full: '9999px',
      },
      boxShadow: {
        'card-hover': '0px 4px 20px rgba(5, 18, 39, 0.12)',
        'auction':    '0 2px 8px rgba(5, 18, 39, 0.08)',
      },
    },
  },
  plugins: [],
};
