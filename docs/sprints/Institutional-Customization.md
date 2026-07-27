# Institutional Customization & Integration Manual

- **Status**: Production-Ready / Certified
- **Role**: Lead UX/UI Architect
- **Institution**: National Forensic Sciences University (NFSU)

---

## 1. Design System CSS Tokens

Branding themes propagate dynamically using custom CSS variables inside `globals.css`:

```css
:root {
  --primary: 212 79% 21%;     /* #0b3c5d - NFSU Navy */
  --primary-foreground: 0 0% 100%;
  
  --accent: 38 92% 50%;       /* #d97706 - NFSU Amber Gold */
  --accent-foreground: 0 0% 100%;
  
  --font-sans: "Inter", sans-serif;
}
```

---

## 2. Logo & Image Assets Override

To update branding assets on the fly:
1.  **Light Logo**: Replace the file at public directory `public/logos/nfsu-light.png`.
2.  **Dark Logo**: Replace the file at public directory `public/logos/nfsu-dark.png`.
3.  **Favicon**: Replace the file at public directory `public/favicon.ico`.
4.  **Browser Titles**: Metadata is configured dynamically using Next.js Layout metadata files.
