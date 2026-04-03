"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Strate = {
  type: "histoire" | "architecture" | "avant" | "anecdote" | "connexion";
  label: string;
  contenu: string;
};

type AnalysisResult = {
  titre: string;
  intro: string;
  strates: Strate[];
  conseil_local: string;
  question: string;
};

const STRATE_COLORS: Record<string, string> = {
  histoire: "#c4965a",
  architecture: "#8b7355",
  avant: "#a0522d",
  anecdote: "#6b8e6b",
  connexion: "#6b7a8b",
};

export default function ScannerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"idle" | "camera" | "preview" | "analyzing" | "result">("idle");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [imageData, setImageData] = useState<string>("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string>("");
  const [activeStrate, setActiveStrate] = useState<number>(0);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Attach stream to video element once it's in the DOM
  useEffect(() => {
    if (mode === "camera" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [mode]);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setMode("camera"); // render video element first, then useEffect attaches the stream
    } catch {
      setError("Impossible d'accéder à la caméra. Utilise l'import d'image.");
    }
  };

  const compressImage = (source: HTMLCanvasElement | HTMLImageElement, maxPx = 1024): string => {
    const canvas = document.createElement("canvas");
    const w = source instanceof HTMLCanvasElement ? source.width : source.naturalWidth;
    const h = source instanceof HTMLCanvasElement ? source.height : source.naturalHeight;
    const ratio = Math.min(maxPx / w, maxPx / h, 1);
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    canvas.getContext("2d")?.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = compressImage(canvas);
    setPreviewUrl(dataUrl);
    setImageData(dataUrl);
    stopCamera();
    setMode("preview");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const compressed = compressImage(img);
        setPreviewUrl(compressed);
        setImageData(compressed);
        setMode("preview");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const analyze = async () => {
    setMode("analyzing");
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setResult(data);
      setActiveStrate(0);
      setMode("result");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      setMode("preview");
    }
  };

  const reset = () => {
    setMode("idle");
    setPreviewUrl("");
    setImageData("");
    setResult(null);
    setError("");
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header
        className="flex items-center gap-3 px-4 py-4 font-sans-strata"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <button
          onClick={() => { stopCamera(); router.push("/"); }}
          className="p-2 rounded-lg transition-colors hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          ←
        </button>
        <span className="text-sm font-medium" style={{ color: "var(--ochre)" }}>
          Scanner
        </span>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Camera view */}
        {mode === "camera" && (
          <div className="relative flex-1 flex flex-col">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full flex-1 object-cover"
              style={{ maxHeight: "calc(100dvh - 140px)" }}
            />

            {/* Scan overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute inset-8 rounded-2xl"
                style={{ border: "1px solid rgba(196,150,90,0.4)" }}
              />
              <div
                className="absolute animate-scan-line left-8 right-8 h-[1px]"
                style={{ background: "rgba(196,150,90,0.6)", boxShadow: "0 0 8px rgba(196,150,90,0.8)" }}
              />
              {/* Corner marks */}
              {[
                "top-8 left-8 border-t-2 border-l-2",
                "top-8 right-8 border-t-2 border-r-2",
                "bottom-8 left-8 border-b-2 border-l-2",
                "bottom-8 right-8 border-b-2 border-r-2",
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-6 h-6 rounded-sm ${cls}`}
                  style={{ borderColor: "var(--ochre)" }}
                />
              ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center"
              style={{ background: "linear-gradient(transparent, rgba(10,9,6,0.9))" }}
            >
              <button
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-transform active:scale-95"
                style={{
                  background: "var(--ochre)",
                  boxShadow: "0 0 0 4px rgba(196,150,90,0.3)",
                }}
              >
                <div className="w-10 h-10 rounded-full" style={{ background: "var(--bg)" }} />
              </button>
            </div>
          </div>
        )}

        {/* Canvas (hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Idle state */}
        {mode === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)" }}
            >
              <CameraIcon size={32} color="var(--ochre)" />
            </div>

            <h2
              className="text-xl text-center"
              style={{ color: "var(--text)" }}
            >
              Qu'est-ce que tu vois ?
            </h2>
            <p
              className="text-sm text-center leading-relaxed max-w-xs font-sans-strata"
              style={{ color: "var(--text-muted)" }}
            >
              Prends une photo d'un bâtiment, d'une rue, d'une façade ou d'une plaque. Strata lit les strates.
            </p>

            {error && (
              <p className="text-sm text-center font-sans-strata" style={{ color: "#a0522d" }}>
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
              <button
                onClick={startCamera}
                className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-sm font-medium font-sans-strata transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "var(--ochre)", color: "var(--bg)" }}
              >
                <CameraIcon size={16} color="var(--bg)" />
                Utiliser la caméra
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-sm font-medium font-sans-strata transition-all hover:opacity-80 active:scale-[0.98]"
                style={{
                  background: "transparent",
                  color: "var(--text)",
                  border: "1px solid var(--border-light)",
                }}
              >
                <UploadIcon />
                Importer une photo
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Preview state */}
        {mode === "preview" && previewUrl && (
          <div className="flex-1 flex flex-col">
            <div className="relative flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Aperçu"
                className="w-full h-full object-cover"
                style={{ maxHeight: "55vh" }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(transparent 60%, var(--bg) 100%)",
                }}
              />
            </div>

            <div className="p-6 flex flex-col gap-3">
              {error && (
                <div
                  className="p-3 rounded-lg text-sm font-sans-strata"
                  style={{ background: "rgba(160,82,45,0.15)", border: "1px solid rgba(160,82,45,0.3)", color: "#c4724a" }}
                >
                  {error}
                </div>
              )}
              <button
                onClick={analyze}
                className="flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-medium font-sans-strata transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "var(--ochre)", color: "var(--bg)" }}
              >
                <LayersIcon />
                Lire les strates
              </button>
              <button
                onClick={reset}
                className="py-3 rounded-xl text-sm font-sans-strata"
                style={{ color: "var(--text-muted)" }}
              >
                Reprendre une photo
              </button>
            </div>
          </div>
        )}

        {/* Analyzing state */}
        {mode === "analyzing" && (
          <div className="flex-1 flex flex-col">
            {previewUrl && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Analyse en cours"
                  className="w-full object-cover"
                  style={{ maxHeight: "45vh", filter: "brightness(0.5)" }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <AnalyzingSpinner />
                  <p className="text-sm font-sans-strata" style={{ color: "var(--ochre-light)" }}>
                    Je lis les strates…
                  </p>
                </div>
              </div>
            )}
            <div className="p-6 flex flex-col gap-3">
              {["histoire", "architecture", "avant", "anecdote", "connexion"].map((type, i) => (
                <div
                  key={type}
                  className="h-12 rounded-lg shimmer"
                  style={{ opacity: 1 - i * 0.12, animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Result state */}
        {mode === "result" && result && (
          <div className="flex-1 overflow-y-auto">
            {/* Image header */}
            {previewUrl && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Lieu analysé"
                  className="w-full object-cover"
                  style={{ maxHeight: "40vh" }}
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(transparent 40%, var(--bg) 100%)" }}
                />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-xl mb-1" style={{ color: "var(--text)" }}>
                    {result.titre}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--sand)" }}>
                    {result.intro}
                  </p>
                </div>
              </div>
            )}

            {/* Strates nav */}
            <div
              className="flex gap-2 px-4 py-3 overflow-x-auto"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              {result.strates.map((s, i) => (
                <button
                  key={s.type}
                  onClick={() => setActiveStrate(i)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-medium font-sans-strata transition-all"
                  style={{
                    background: activeStrate === i ? STRATE_COLORS[s.type] : "var(--bg-elevated)",
                    color: activeStrate === i ? "var(--bg)" : "var(--text-muted)",
                    border: `1px solid ${activeStrate === i ? STRATE_COLORS[s.type] : "var(--border)"}`,
                  }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: activeStrate === i ? "var(--bg)" : STRATE_COLORS[s.type] }}
                  />
                  {s.label}
                </button>
              ))}
            </div>

            {/* Active strate */}
            <div className="p-5">
              {result.strates[activeStrate] && (
                <div
                  key={activeStrate}
                  className="animate-strata-reveal p-4 rounded-xl"
                  style={{
                    background: "var(--bg-elevated)",
                    borderLeft: `3px solid ${STRATE_COLORS[result.strates[activeStrate].type]}`,
                  }}
                >
                  <p
                    className="text-xs font-sans-strata font-medium tracking-wider uppercase mb-3"
                    style={{ color: STRATE_COLORS[result.strates[activeStrate].type] }}
                  >
                    {result.strates[activeStrate].label}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text)", fontFamily: "Georgia, serif" }}>
                    {result.strates[activeStrate].contenu}
                  </p>
                </div>
              )}

              {/* Conseil local */}
              <div
                className="mt-4 p-4 rounded-xl"
                style={{
                  background: "rgba(196,150,90,0.08)",
                  border: "1px solid rgba(196,150,90,0.2)",
                }}
              >
                <p className="text-xs font-sans-strata font-medium mb-2" style={{ color: "var(--ochre)" }}>
                  💡 Le conseil local
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--sand)" }}>
                  {result.conseil_local}
                </p>
              </div>

              {/* Question */}
              <div
                className="mt-4 p-4 rounded-xl"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                <p className="text-xs font-sans-strata font-medium mb-2" style={{ color: "var(--text-dim)" }}>
                  Et si tu creusais…
                </p>
                <p className="text-sm leading-relaxed italic" style={{ color: "var(--text-muted)" }}>
                  {result.question}
                </p>
              </div>

              {/* Nav arrows */}
              <div className="flex justify-between mt-4 gap-3">
                <button
                  onClick={() => setActiveStrate(Math.max(0, activeStrate - 1))}
                  disabled={activeStrate === 0}
                  className="flex-1 py-2.5 rounded-lg text-sm font-sans-strata transition-opacity"
                  style={{
                    background: "var(--bg-elevated)",
                    color: activeStrate === 0 ? "var(--text-dim)" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                    opacity: activeStrate === 0 ? 0.4 : 1,
                  }}
                >
                  ← Précédent
                </button>
                <button
                  onClick={() => setActiveStrate(Math.min(result.strates.length - 1, activeStrate + 1))}
                  disabled={activeStrate === result.strates.length - 1}
                  className="flex-1 py-2.5 rounded-lg text-sm font-sans-strata transition-opacity"
                  style={{
                    background: activeStrate === result.strates.length - 1 ? "var(--bg-elevated)" : "var(--ochre)",
                    color: activeStrate === result.strates.length - 1 ? "var(--text-dim)" : "var(--bg)",
                    border: "1px solid var(--border)",
                    opacity: activeStrate === result.strates.length - 1 ? 0.4 : 1,
                  }}
                >
                  Suivant →
                </button>
              </div>

              <button
                onClick={reset}
                className="w-full mt-3 py-3 rounded-xl text-sm font-sans-strata"
                style={{ color: "var(--text-muted)" }}
              >
                Scanner un autre lieu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CameraIcon({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function AnalyzingSpinner() {
  return (
    <div className="relative w-12 h-12">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 rounded-full animate-pulse-ring"
          style={{
            border: "1px solid var(--ochre)",
            opacity: 0.6 - i * 0.15,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
      <div
        className="absolute inset-3 rounded-full"
        style={{ background: "var(--ochre)", opacity: 0.8 }}
      />
    </div>
  );
}
