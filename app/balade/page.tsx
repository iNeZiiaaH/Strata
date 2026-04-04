"use client";

import { useEffect, useState, useRef, lazy, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { haversineDistance, formatDistance, bearing, bearingLabel } from "@/lib/geo";

const BaladeMap = lazy(() => import("@/components/BaladeMap"));

type Etape = {
  numero: number;
  titre: string;
  description: string;
  detail: string;
  direction: string;
  lat: number;
  lng: number;
};

type BaladeResult = {
  titre: string;
  intro: string;
  duree: string;
  distance: string;
  etapes: Etape[];
  anecdote_finale: string;
};

type Theme = "historique" | "architecture" | "secrets" | "artistique";

const THEMES: { id: Theme; label: string; icon: string; desc: string }[] = [
  { id: "historique", label: "Historique", icon: "🏛️", desc: "Mémoire & patrimoine" },
  { id: "architecture", label: "Architecture", icon: "🧱", desc: "Bâti & formes urbaines" },
  { id: "secrets", label: "Secrets", icon: "🗝️", desc: "Lieux insolites & cachés" },
  { id: "artistique", label: "Artistique", icon: "🎭", desc: "Art & culture" },
];

const ARRIVE_THRESHOLD = 40;

export default function BaladePage() {
  const router = useRouter();
  const [locationState, setLocationState] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BaladeResult | null>(null);
  const [activeEtape, setActiveEtape] = useState(0);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"setup" | "balade">("setup");
  const [distanceToNext, setDistanceToNext] = useState<number | null>(null);
  const [bearingToNext, setBearingToNext] = useState<number | null>(null);
  const [arrived, setArrived] = useState(false);
  const [theme, setTheme] = useState<Theme>("historique");
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadingMessages = [
    "Je cherche les lieux sur OpenStreetMap…",
    "Je lis les strates du quartier…",
    "Je construis ton parcours…",
    "J'écoute la mémoire des rues…",
  ];
  const [loadingMsg, setLoadingMsg] = useState(loadingMessages[0]);

  useEffect(() => {
    if (loading) {
      let i = 0;
      timerRef.current = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingMsg(loadingMessages[i]);
      }, 2200);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const updateNav = useCallback(
    (pos: { lat: number; lng: number }, etapes: Etape[], idx: number) => {
      const dest = etapes[idx];
      const dist = haversineDistance(pos, { lat: dest.lat, lng: dest.lng });
      const bear = bearing(pos, { lat: dest.lat, lng: dest.lng });
      setDistanceToNext(dist);
      setBearingToNext(bear);
      setArrived(dist <= ARRIVE_THRESHOLD);
    },
    []
  );

  const startGpsWatch = useCallback(
    (etapes: Etape[], idx: number) => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserPosition(p);
          setGpsAccuracy(pos.coords.accuracy);
          updateNav(p, etapes, idx);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    },
    [updateNav]
  );

  useEffect(() => {
    if (phase === "balade" && result) {
      setArrived(false);
      startGpsWatch(result.etapes, activeEtape);
      if (userPosition) updateNav(userPosition, result.etapes, activeEtape);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEtape, phase]);

  const requestLocation = () => {
    setLocationState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigin(p);
        setUserPosition(p);
        setLocationState("granted");
      },
      () => setLocationState("denied"),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const generateBalade = async () => {
    if (!origin) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/balade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: origin, rayon: 800, theme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setResult(data);
      setActiveEtape(0);
      setPhase("balade");
      startGpsWatch(data.etapes, 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const goToEtape = (i: number) => { setActiveEtape(i); setArrived(false); };
  const nextEtape = () => { if (result && activeEtape < result.etapes.length - 1) goToEtape(activeEtape + 1); };
  const isLast = result ? activeEtape === result.etapes.length - 1 : false;

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 font-sans-strata flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => { router.push("/"); if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); }}
          className="p-2 rounded-lg transition-colors hover:opacity-70"
          style={{ color: "var(--text-muted)" }}>
          ←
        </button>
        <span className="text-sm font-medium" style={{ color: "var(--ochre)" }}>Mode Balade</span>
        <div className="flex-1" />
        {phase === "balade" && result && (
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              {result.duree} min · {result.distance}m
            </span>
            <button onClick={() => { setPhase("setup"); setResult(null); setDistanceToNext(null); }}
              className="text-xs" style={{ color: "var(--ochre-dim)" }}>
              Nouvelle
            </button>
          </div>
        )}
      </header>

      {/* ── SETUP ── */}
      {phase === "setup" && (
        <div className="flex-1 flex flex-col px-5 pt-8 pb-6 overflow-y-auto">
          <h2 className="text-2xl mb-2" style={{ color: "var(--text)" }}>
            Tu marches,<br />
            <span style={{ color: "var(--ochre-light)" }}>je raconte.</span>
          </h2>
          <p className="text-sm leading-relaxed font-sans-strata mb-6" style={{ color: "var(--text-muted)" }}>
            Strata trouve de vrais lieux autour de toi via OpenStreetMap, puis te raconte leur histoire en marchant.
          </p>

          {/* Theme selector */}
          <p className="text-xs font-sans-strata font-medium tracking-wider uppercase mb-3" style={{ color: "var(--ochre)" }}>
            Thème de la balade
          </p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className="flex items-start gap-2 p-3 rounded-xl text-left transition-all"
                style={{
                  background: theme === t.id ? "rgba(196,150,90,0.12)" : "var(--bg-elevated)",
                  border: `1px solid ${theme === t.id ? "var(--ochre-dim)" : "var(--border)"}`,
                }}>
                <span className="text-base leading-none mt-0.5">{t.icon}</span>
                <div>
                  <p className="text-xs font-medium font-sans-strata" style={{ color: theme === t.id ? "var(--ochre)" : "var(--text)" }}>
                    {t.label}
                  </p>
                  <p className="text-xs font-sans-strata" style={{ color: "var(--text-dim)" }}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Location */}
          <div className="p-4 rounded-xl mb-4"
            style={{ background: "var(--bg-elevated)", border: `1px solid ${locationState === "granted" ? "rgba(107,142,107,0.4)" : "var(--border)"}` }}>
            <div className="flex items-center gap-3 mb-2">
              <LocationIcon granted={locationState === "granted"} />
              <span className="text-sm font-medium font-sans-strata" style={{ color: "var(--text)" }}>Localisation</span>
              {locationState === "granted" && (
                <span className="text-xs font-sans-strata ml-auto" style={{ color: "#6b8e6b" }}>✓ Obtenue</span>
              )}
            </div>
            {locationState === "idle" && (
              <button onClick={requestLocation} className="text-sm font-sans-strata" style={{ color: "var(--ochre)" }}>
                Autoriser la localisation →
              </button>
            )}
            {locationState === "requesting" && (
              <p className="text-xs font-sans-strata" style={{ color: "var(--text-muted)" }}>En attente…</p>
            )}
            {locationState === "denied" && (
              <p className="text-xs font-sans-strata" style={{ color: "#a0522d" }}>
                Permission refusée. Active la localisation dans les paramètres du navigateur.
              </p>
            )}
            {locationState === "granted" && origin && (
              <p className="text-xs font-sans-strata" style={{ color: "var(--text-dim)" }}>
                {origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg mb-4 text-sm font-sans-strata"
              style={{ background: "rgba(160,82,45,0.1)", border: "1px solid rgba(160,82,45,0.3)", color: "#c4724a" }}>
              {error}
            </div>
          )}

          <button onClick={generateBalade}
            disabled={locationState !== "granted" || loading}
            className="w-full py-4 rounded-xl text-sm font-medium font-sans-strata transition-all"
            style={{
              background: locationState === "granted" && !loading ? "var(--ochre)" : "var(--bg-elevated)",
              color: locationState === "granted" && !loading ? "var(--bg)" : "var(--text-dim)",
              border: "1px solid var(--border)",
              cursor: locationState === "granted" && !loading ? "pointer" : "not-allowed",
            }}>
            {loading ? loadingMsg : `Générer la balade ${THEMES.find(t => t.id === theme)?.icon ?? ""}`}
          </button>

          {loading && (
            <div className="mt-5 flex flex-col gap-3">
              {[0.9, 0.75, 0.85, 0.7, 0.8].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full shimmer flex-shrink-0" style={{ animationDelay: `${i * 0.15}s` }} />
                  <div className="h-3 rounded shimmer" style={{ width: `${w * 100}%`, animationDelay: `${i * 0.2}s` }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BALADE ── */}
      {phase === "balade" && result && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Map */}
          <div className="mx-4 mt-4 rounded-xl overflow-hidden flex-shrink-0"
            style={{ height: "240px", border: "1px solid var(--border)" }}>
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--bg-elevated)" }}>
                <span className="text-xs font-sans-strata" style={{ color: "var(--text-dim)" }}>Chargement de la carte…</span>
              </div>
            }>
              {origin && (
                <BaladeMap
                  origin={origin}
                  etapes={result.etapes}
                  activeEtape={activeEtape}
                  userPosition={userPosition}
                  onSelectEtape={goToEtape}
                />
              )}
            </Suspense>
          </div>

          {/* GPS nav bar */}
          <div className="mx-4 mt-2 rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            {arrived ? (
              <>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#6b8e6b" }} />
                <span className="text-sm font-sans-strata flex-1" style={{ color: "#8bba8b" }}>Vous y êtes !</span>
                {!isLast && (
                  <button onClick={nextEtape} className="px-3 py-1.5 rounded-lg text-xs font-medium font-sans-strata"
                    style={{ background: "var(--ochre)", color: "var(--bg)" }}>
                    Étape suivante →
                  </button>
                )}
              </>
            ) : distanceToNext !== null ? (
              <>
                <CompassIcon bearing={bearingToNext ?? 0} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-sans-strata" style={{ color: "var(--text)" }}>
                    {formatDistance(distanceToNext)}
                    {bearingToNext !== null && (
                      <span className="ml-2 text-xs" style={{ color: "var(--text-dim)" }}>
                        {bearingLabel(bearingToNext)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs font-sans-strata truncate" style={{ color: "var(--text-dim)" }}>
                    vers — {result.etapes[activeEtape].titre}
                  </p>
                </div>
                {gpsAccuracy !== null && (
                  <span className="text-xs font-sans-strata flex-shrink-0" style={{ color: "var(--text-dim)" }}>
                    ±{Math.round(gpsAccuracy)}m
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: "var(--ochre)" }} />
                <span className="text-xs font-sans-strata" style={{ color: "var(--text-muted)" }}>GPS en attente…</span>
              </>
            )}
          </div>

          {/* Étapes */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
            <div className="mb-3">
              <h2 className="text-base font-medium" style={{ color: "var(--text)" }}>{result.titre}</h2>
              <p className="text-xs font-sans-strata" style={{ color: "var(--text-muted)" }}>{result.intro}</p>
            </div>

            {result.etapes.map((etape, i) => {
              const isActive = activeEtape === i;
              const isPassed = i < activeEtape;
              return (
                <button key={etape.numero} onClick={() => goToEtape(i)}
                  className="w-full text-left p-4 rounded-xl mb-3 transition-all"
                  style={{
                    background: isActive ? "var(--bg-elevated)" : "transparent",
                    border: `1px solid ${isActive ? "var(--ochre-dim)" : "var(--border)"}`,
                    opacity: isPassed ? 0.5 : 1,
                  }}>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-medium font-sans-strata"
                      style={{
                        background: isPassed ? "var(--border)" : isActive ? "var(--ochre)" : "var(--bg-elevated)",
                        color: isPassed ? "var(--text-dim)" : isActive ? "var(--bg)" : "var(--text-dim)",
                        border: `1px solid ${isActive ? "var(--ochre)" : "var(--border)"}`,
                      }}>
                      {isPassed ? "✓" : etape.numero}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-sans-strata mb-0.5"
                        style={{ color: isActive ? "var(--text)" : "var(--text-muted)" }}>
                        {etape.titre}
                      </p>

                      {!isActive && !isPassed && userPosition && (
                        <p className="text-xs font-sans-strata" style={{ color: "var(--text-dim)" }}>
                          {formatDistance(haversineDistance(userPosition, { lat: etape.lat, lng: etape.lng }))} depuis ta position
                        </p>
                      )}

                      {isActive && (
                        <div className="animate-strata-reveal mt-2">
                          <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text)", fontFamily: "Georgia, serif" }}>
                            {etape.description}
                          </p>
                          <div className="p-3 rounded-lg mb-3"
                            style={{ background: "rgba(196,150,90,0.08)", border: "1px solid rgba(196,150,90,0.15)" }}>
                            <p className="text-xs font-sans-strata" style={{ color: "var(--ochre)" }}>👁 À observer</p>
                            <p className="text-xs mt-1 font-sans-strata" style={{ color: "var(--sand)" }}>{etape.detail}</p>
                          </div>
                          {!isLast && (
                            <div className="p-3 rounded-lg" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                              <p className="text-xs font-sans-strata" style={{ color: "var(--text-dim)" }}>
                                <span style={{ color: "var(--ochre-dim)" }}>→</span> {etape.direction}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="p-4 rounded-xl"
              style={{ background: "rgba(196,150,90,0.06)", border: "1px solid rgba(196,150,90,0.15)" }}>
              <p className="text-xs font-sans-strata font-medium mb-2" style={{ color: "var(--ochre)" }}>
                Ce quartier, en résumé…
              </p>
              <p className="text-sm leading-relaxed italic" style={{ color: "var(--sand)", fontFamily: "Georgia, serif" }}>
                {result.anecdote_finale}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationIcon({ granted }: { granted: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={granted ? "#6b8e6b" : "var(--ochre)"} strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CompassIcon({ bearing: deg }: { bearing: number }) {
  return (
    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
      <svg width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill="var(--bg-card)" stroke="var(--border-light)" strokeWidth="1" />
        <g transform={`rotate(${deg}, 14, 14)`}>
          <polygon points="14,4 16,14 14,12 12,14" fill="var(--ochre)" />
          <polygon points="14,24 16,14 14,16 12,14" fill="var(--text-dim)" />
        </g>
      </svg>
    </div>
  );
}
