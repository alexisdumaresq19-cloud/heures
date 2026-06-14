# Qumica — Hero Section

A modern, high-performance hero section built with **React + Tailwind CSS** and
**lucide-react** icons. Fully self-contained: all keyframe animations (marquee,
gradient shift, light sweep) are injected via a scoped `<style>` tag, so no
`tailwind.config.js` changes are required.

## Features

- **Full-screen background video** with a minimal `bg-black/10` overlay.
- **Floating pill navbar** with glassmorphism (`bg-black/40 backdrop-blur-xl`) and
  a glassy `Generate` CTA.
- **Hero content** shifted into the upper half (`pt-44`): "Trusted by 500+ teams"
  social proof (3 stacked avatars, 5 orange stars, scaled to 105%), a bold
  headline with an italic serif "elevate", and a 2-line subheadline.
- **Two CTAs**: a primary animated gradient `Generate` button (4s gradient shift +
  3s light sweep + Sparkles icon) and a secondary white-glass `View Platform`
  button (Play icon).
- **Integration marquee**: continuous right-to-left scroll of Zapier, Make, n8n,
  UiPath, Tray.io, Workato.
- Fully responsive and respects `prefers-reduced-motion`.

## Install

```bash
npm install lucide-react
# Tailwind CSS must already be configured in your project.
```

## Usage

```jsx
import HeroSection from "./qumica-hero/HeroSection";

export default function App() {
  return <HeroSection />;
}
```

## Using it in Elementor

Elementor is PHP/HTML based, so to embed this React component on an Elementor
page you have two options:

1. **React island** — bundle the component (e.g. with Vite) and mount it into a
   `<div id="qumica-hero"></div>` placed inside an Elementor **HTML widget**:

   ```js
   import { createRoot } from "react-dom/client";
   import HeroSection from "./HeroSection";
   createRoot(document.getElementById("qumica-hero")).render(<HeroSection />);
   ```

2. **Plain HTML/CSS port** — if you don't want a React build step, ask and I can
   convert this component into a single self-contained HTML + Tailwind (CDN) +
   vanilla-JS snippet you can paste directly into an Elementor HTML widget.
