"use client";

import { useState } from "react";
import { setApiKey } from "@/lib/store";

interface Props {
  onSave: (key: string) => void;
}

export default function ApiKeyModal({ onSave }: Props) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed.length < 10) {
      setError("Clé trop courte, vérifie que tu as tout copié");
      return;
    }
    setApiKey(trimmed);
    onSave(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(10,9,6,0.95)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-light)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <KeyIcon />
          <h2
            className="text-base font-medium font-sans-strata"
            style={{ color: "var(--text)" }}
          >
            Clé API OpenAI
          </h2>
        </div>

        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
          Strata utilise Groq + Llama 4 pour lire la ville — 100% gratuit, sans carte bancaire. Ta clé reste dans ton navigateur, jamais stockée ailleurs.
        </p>

        <div className="relative mb-4">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            placeholder="gsk_..."
            className="w-full px-4 py-3 rounded-lg text-sm font-sans-strata outline-none transition-all"
            style={{
              background: "var(--bg-card)",
              border: `1px solid ${error ? "#a0522d" : "var(--border-light)"}`,
              color: "var(--text)",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = error ? "#a0522d" : "var(--ochre-dim)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = error ? "#a0522d" : "var(--border-light)")
            }
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 font-sans-strata text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            {show ? "Masquer" : "Voir"}
          </button>
        </div>

        {error && (
          <p className="text-xs mb-3 font-sans-strata" style={{ color: "#a0522d" }}>
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-lg text-sm font-medium font-sans-strata transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--ochre)", color: "var(--bg)" }}
        >
          Continuer
        </button>

        <p className="text-xs text-center mt-3" style={{ color: "var(--text-dim)" }}>
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
            style={{ color: "var(--ochre-dim)" }}
          >
            Obtenir une clé Groq gratuite →
          </a>
        </p>
      </div>
    </div>
  );
}

function KeyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ochre)"
      strokeWidth="2"
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
