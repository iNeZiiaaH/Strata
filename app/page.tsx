"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LAYERS = [
  { label: "Histoire", color: "#c4965a", desc: "40 ans de mémoire dans les murs" },
  { label: "Architecture", color: "#8b7355", desc: "Les détails que personne ne regarde" },
  { label: "Avant", color: "#a0522d", desc: "Ce qui existait ici avant" },
  { label: "Anecdote", color: "#6b8e6b", desc: "Ce que le voisin te dirait" },
  { label: "Connexion", color: "#6b7a8b", desc: "Les fils invisibles entre les lieux" },
];

export default function Home() {
  const router = useRouter();
  const [visible, setVisible] = useState<number[]>([]);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHeroVisible(true), 100);
    LAYERS.forEach((_, i) => {
      const t = setTimeout(() => setVisible((v) => [...v, i]), 400 + i * 180);
      return t;
    });
    return () => clearTimeout(t1);
  }, []);

  return (
    <main className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-5 font-sans-strata"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <StrataLogo />
          <span
            className="text-sm font-medium tracking-[0.2em] uppercase"
            style={{ color: "var(--ochre)" }}
          >
            Strata
          </span>
        </div>
        <span
          className="text-xs tracking-widest uppercase"
          style={{ color: "var(--text-dim)" }}
        >
          Beta
        </span>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-6 pt-16 pb-12 max-w-2xl mx-auto w-full">
        <div
          className="transition-all duration-1000"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(20px)",
          }}
        >
          <p
            className="text-xs tracking-[0.3em] uppercase mb-6 font-sans-strata"
            style={{ color: "var(--ochre)" }}
          >
            Lis la ville comme un local
          </p>

          <h1
            className="text-4xl leading-tight mb-6"
            style={{ color: "var(--text)" }}
          >
            Tu vois des façades.
            <br />
            <span style={{ color: "var(--ochre-light)" }}>
              Un local lit les strates.
            </span>
          </h1>

          <p
            className="text-base leading-relaxed mb-10"
            style={{ color: "var(--text-muted)", fontFamily: "Georgia, serif" }}
          >
            Pointe ton téléphone sur un bâtiment, une rue, une devanture —
            Strata te raconte ce qu'il y a vraiment là. L'histoire, les détails
            cachés, l'anecdote que le voisin du quartier t'aurait dite.
          </p>

          {/* Strata layers visualisation */}
          <div className="mb-12">
            {LAYERS.map((layer, i) => (
              <div
                key={layer.label}
                className="flex items-center gap-3 mb-2 transition-all duration-500"
                style={{
                  opacity: visible.includes(i) ? 1 : 0,
                  transform: visible.includes(i) ? "translateX(0)" : "translateX(-12px)",
                }}
              >
                <div
                  className="w-8 h-[2px] rounded-full"
                  style={{ background: layer.color }}
                />
                <span
                  className="text-xs font-sans-strata font-medium tracking-wider uppercase"
                  style={{ color: layer.color, minWidth: "90px" }}
                >
                  {layer.label}
                </span>
                <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                  {layer.desc}
                </span>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push("/scanner")}
              className="flex items-center justify-center gap-3 px-6 py-4 rounded-lg text-sm font-medium font-sans-strata transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "var(--ochre)",
                color: "var(--bg)",
              }}
            >
              <ScanIcon />
              Scanner un lieu
            </button>
            <button
              onClick={() => router.push("/balade")}
              className="flex items-center justify-center gap-3 px-6 py-4 rounded-lg text-sm font-medium font-sans-strata transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--border-light)",
              }}
            >
              <WalkIcon />
              Mode Balade
            </button>
          </div>
        </div>
      </section>

      {/* Bottom note */}
      <footer className="px-6 py-6 text-center">
        <p className="text-xs font-sans-strata" style={{ color: "var(--text-dim)" }}>
          Alimenté par Llama 4 via Groq · 100% gratuit, sans carte bancaire
        </p>
      </footer>
    </main>
  );
}

function StrataLogo() {
  return (
    <div className="w-6 h-6 flex flex-col gap-[2px] justify-center">
      {[
        "var(--ochre)",
        "var(--ochre-dim)",
        "#a0522d",
        "var(--text-dim)",
      ].map((color, i) => (
        <div
          key={i}
          className="rounded-full"
          style={{
            height: "2px",
            width: `${100 - i * 16}%`,
            background: color,
          }}
        />
      ))}
    </div>
  );
}

function ScanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function WalkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="5" r="1" />
      <path d="m9 20 3-6 3 6" />
      <path d="m6 8 6 2 6-2" />
      <path d="m12 10-2 5" />
    </svg>
  );
}
