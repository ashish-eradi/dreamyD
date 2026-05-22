/** @type {import('tailwindcss').Config} */
module.exports = {
  // Enable dark mode via class strategy
  darkMode: 'class',

  // Content paths — covers all JS/JSX/TS/TSX files inside app/ and src/
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './navigation/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        // ── Core background / surface ──────────────────────────────────────
        background: '#0D0D1A',   // deep navy-black
        card: '#1A1A2E',         // dark purple-navy
        surface: '#16213E',      // slightly lighter surface

        // ── Brand colours ─────────────────────────────────────────────────
        primary: {
          DEFAULT: '#7B5EA7',    // soft purple
          light: '#9B7EC8',
          dark: '#5B3E87',
        },
        accent: {
          DEFAULT: '#C084FC',    // lavender
          light: '#D8A4FF',
          dark: '#A855F7',
        },
        gold: {
          DEFAULT: '#F59E0B',    // amber — premium indicator
          light: '#FBD34D',
          dark: '#D97706',
        },

        // ── Text ─────────────────────────────────────────────────────────
        'text-primary': '#F1F0FF',
        'text-muted': '#8B8BAE',
        'text-disabled': '#4B4B6B',

        // ── Semantic / status ─────────────────────────────────────────────
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',

        // ── Dream emotion palette ─────────────────────────────────────────
        emotion: {
          joy: '#F59E0B',
          fear: '#EF4444',
          peace: '#10B981',
          sadness: '#3B82F6',
          confusion: '#8B5CF6',
        },

        // ── UI chrome ────────────────────────────────────────────────────
        border: '#2A2A4A',
        divider: '#1E1E38',
        overlay: 'rgba(13, 13, 26, 0.85)',
      },

      // ── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        sans: ['System', 'ui-sans-serif'],
        serif: ['Georgia', 'ui-serif'],
        mono: ['Courier New', 'ui-monospace'],
      },

      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
      },

      // ── Spacing extras ────────────────────────────────────────────────────
      spacing: {
        18: '72px',
        22: '88px',
        26: '104px',
        30: '120px',
        34: '136px',
        38: '152px',
        42: '168px',
        46: '184px',
        50: '200px',
        72: '288px',
        84: '336px',
        96: '384px',
      },

      // ── Border radius ─────────────────────────────────────────────────────
      borderRadius: {
        '4xl': '32px',
        '5xl': '40px',
      },

      // ── Box shadows (soft glow) ───────────────────────────────────────────
      boxShadow: {
        'glow-purple': '0 0 20px rgba(123, 94, 167, 0.4)',
        'glow-accent': '0 0 20px rgba(192, 132, 252, 0.4)',
        'glow-gold': '0 0 20px rgba(245, 158, 11, 0.4)',
        card: '0 4px 24px rgba(0, 0, 0, 0.6)',
      },

      // ── Opacity ───────────────────────────────────────────────────────────
      opacity: {
        15: '0.15',
        35: '0.35',
        65: '0.65',
        85: '0.85',
      },

      // ── Animation ────────────────────────────────────────────────────────
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 4s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },

      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },

  plugins: [],
};
