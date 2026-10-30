import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        muted: 'var(--muted)',
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          press: 'var(--brand-press)',
          subtle: 'var(--brand-subtle)',
        },
        sev: {
          low: 'var(--sev-low)',
          medium: 'var(--sev-medium)',
          high: 'var(--sev-high)',
          extreme: 'var(--sev-extreme)',
          'extreme-subtle': 'var(--sev-extreme-subtle)',
        },
        reg: {
          unlikely: 'var(--reg-unlikely)',
          check: 'var(--reg-check)',
          likely: 'var(--reg-likely)',
        },
        conf: {
          suspected: 'var(--conf-suspected)',
          likely: 'var(--conf-likely)',
          witness: 'var(--conf-witness)',
          confirmed: 'var(--conf-confirmed)',
        },
        stage: {
          bg: 'var(--stage-bg)',
          grid: 'var(--stage-grid)',
          ink: 'var(--stage-ink)',
          muted: 'var(--stage-muted)',
          route: 'var(--stage-route)',
          impact: 'var(--stage-impact)',
        },
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
      },
      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
        hero: 'var(--dur-hero)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
    },
  },
  plugins: [],
};

export default config;
