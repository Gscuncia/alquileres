import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ff385c",
        "primary-active": "#e00b41",
        "primary-disabled": "#ffd1da",
        "primary-error-text": "#c13515",
        "primary-error-text-hover": "#b32505",
        luxe: "#460479",
        plus: "#92174d",
        ink: "#222222",
        body: "#3f3f3f",
        muted: "#6a6a6a",
        "muted-soft": "#929292",
        hairline: "#dddddd",
        "hairline-soft": "#ebebeb",
        "border-strong": "#c1c1c1",
        canvas: "#ffffff",
        "surface-soft": "#f7f7f7",
        "surface-card": "#ffffff",
        "surface-strong": "#f2f2f2",
        "on-primary": "#ffffff",
        "on-dark": "#ffffff",
        "legal-link": "#428bff",
        "star-rating": "#222222",
        scrim: "#000000",
      },
      fontFamily: {
        sans: [
          "'Airbnb Cereal VF'",
          "Circular",
          "-apple-system",
          "system-ui",
          "Roboto",
          "'Helvetica Neue'",
          "sans-serif",
        ],
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "14px",
        lg: "20px",
        xl: "32px",
      },
      spacing: {
        xxs: "2px",
        xs: "4px",
        sm: "8px",
        md: "12px",
        base: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
        section: "64px",
      },
      boxShadow: {
        card: "rgba(0, 0, 0, 0.02) 0 0 0 1px, rgba(0, 0, 0, 0.04) 0 2px 6px 0, rgba(0, 0, 0, 0.1) 0 4px 8px 0",
      },
    },
  },
  plugins: [],
};

export default config;
