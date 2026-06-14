import React from "react";
import { Sparkles, Play, Star } from "lucide-react";

/**
 * Qumica — Hero Section
 * --------------------------------------------------------------------------
 * A modern, high-performance hero section built with React + Tailwind CSS.
 *
 * Requirements:
 *   - Tailwind CSS configured in your project.
 *   - lucide-react installed:  npm i lucide-react
 *
 * All custom keyframe animations (marquee, gradient shift, light sweep) are
 * injected via a scoped <style> tag below, so the component is fully
 * self-contained and works without editing your tailwind.config.js.
 */

const BACKGROUND_VIDEO =
  "https://cdn.sceneai.art/Hero Section Video/247f75dd-335a-4aaa-ba65-47df2f7b24b9.mp4";

const AVATARS = [
  "https://i.pravatar.cc/96?img=12",
  "https://i.pravatar.cc/96?img=32",
  "https://i.pravatar.cc/96?img=48",
];

const INTEGRATIONS = ["Zapier", "Make", "n8n", "UiPath", "Tray.io", "Workato"];

export default function HeroSection() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Scoped keyframe animations */}
      <style>{`
        @keyframes qumica-gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes qumica-light-sweep {
          0%   { transform: translateX(-150%) skewX(-20deg); }
          100% { transform: translateX(250%) skewX(-20deg); }
        }
        @keyframes qumica-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .qumica-gradient-anim {
          animation: qumica-gradient-shift 4s ease infinite;
        }
        .qumica-sweep::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 40%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.45),
            transparent
          );
          animation: qumica-light-sweep 3s ease-in-out infinite;
          pointer-events: none;
        }
        .qumica-marquee-track {
          animation: qumica-marquee 28s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .qumica-gradient-anim,
          .qumica-sweep::after,
          .qumica-marquee-track {
            animation: none !important;
          }
        }
      `}</style>

      {/* 1. Background video */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={BACKGROUND_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />

      {/* Minimal overlay for readability */}
      <div className="absolute inset-0 bg-black/10" />

      {/* 2. Navigation bar */}
      <header className="absolute inset-x-0 top-6 z-20 flex justify-center px-4">
        <nav className="flex w-full max-w-3xl items-center justify-between gap-4 rounded-full border border-white/10 bg-black/40 px-4 py-2.5 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Qumica</span>
          </div>

          <ul className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            <li className="cursor-pointer transition hover:text-white">Platform</li>
            <li className="cursor-pointer transition hover:text-white">Solutions</li>
            <li className="cursor-pointer transition hover:text-white">Pricing</li>
            <li className="cursor-pointer transition hover:text-white">Docs</li>
          </ul>

          <button className="rounded-full border border-white/40 bg-white/15 px-5 py-2 text-sm font-medium text-white shadow-sm backdrop-blur-2xl transition hover:bg-white/25">
            Generate
          </button>
        </nav>
      </header>

      {/* 3. Hero content (shifted upwards) */}
      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 pt-44 text-center">
        {/* Social proof — scaled to 105% */}
        <div className="mb-8 flex scale-[1.05] items-center gap-3">
          <div className="flex -space-x-3">
            {AVATARS.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="h-9 w-9 rounded-full border-2 border-black/60 object-cover"
              />
            ))}
          </div>
          <div className="flex flex-col items-start">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-orange-500 text-orange-500"
                />
              ))}
            </div>
            <span className="text-sm text-white/80">Trusted by 500+ teams</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="max-w-4xl text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Ready to{" "}
          <span className="font-serif italic font-medium">elevate</span> your
          digital infrastructure?
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-2xl text-base text-white/75 sm:text-lg">
          We build high-performance solutions to modernize operations and drive
          growth across your entire organization.
        </p>

        {/* 4. Call-to-action buttons */}
        <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
          {/* Primary — gradient + shimmer */}
          <button className="qumica-sweep group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-orange-500 via-purple-600 to-orange-500 bg-[length:200%_200%] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 qumica-gradient-anim transition active:scale-95">
            <Sparkles className="h-4 w-4" />
            Generate
          </button>

          {/* Secondary — white glass */}
          <button className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/20 active:scale-95">
            <Play className="h-4 w-4" />
            View Platform
          </button>
        </div>
      </div>

      {/* 5. Integration marquee footer */}
      <div className="absolute inset-x-0 bottom-10 z-10 flex flex-col items-center">
        <span className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white/50">
          Integrating with leading automation
        </span>

        <div className="relative w-full max-w-5xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
          <div className="qumica-marquee-track flex w-max items-center gap-16 whitespace-nowrap">
            {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <span
                key={i}
                className="text-lg font-semibold text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
