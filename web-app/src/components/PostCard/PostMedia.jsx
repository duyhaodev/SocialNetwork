import { useState, useMemo, useEffect, useRef } from "react";

// ── Hybrid: nền mờ Threads (dot + shimmer) + label Mẫu A (lock pulse + pill) ──
function SensitiveOverlay({ onReveal }) {
  return (
    <div
      className="sensitive-overlay absolute inset-0 z-10 rounded-2xl overflow-hidden cursor-pointer select-none"
      onClick={(e) => {
        e.stopPropagation();
        onReveal();
      }}
    >
      <style>{`
        /* --- NỀN: Threads style --- */
        .sensitive-overlay .blur-base {
          position: absolute;
          inset: 0;
          backdrop-filter: blur(18px) saturate(0.6);
          -webkit-backdrop-filter: blur(18px) saturate(0.6);
          background: rgba(0,0,0,0.35);
        }

        .sensitive-overlay .dot-layer {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px);
          background-size: 6px 6px;
          animation: dotMove 3s linear infinite;
          opacity: 0.5;
        }

        @keyframes dotMove {
          0%   { background-position: 0 0; }
          100% { background-position: 0 24px; }
        }

        .sensitive-overlay .shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            105deg,
            transparent 35%,
            rgba(255,255,255,0.07) 50%,
            transparent 65%
          );
          background-size: 200% 100%;
          animation: shimmerMove 5s ease-in-out infinite;
        }

        @keyframes shimmerMove {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* --- LABEL: Mẫu A style --- */
        .sensitive-overlay .label {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #fff;
        }

        .sensitive-overlay .icon-ring {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: lockPulse 2.8s ease-in-out infinite;
        }

        @keyframes lockPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.15); }
          50%       { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
        }

        .sensitive-overlay .pill {
          font-size: 11px;
          opacity: 0.6;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 999px;
          padding: 3px 14px;
          letter-spacing: 0.02em;
        }
      `}</style>

      {/* Threads background */}
      <div className="blur-base" />
      <div className="dot-layer" />
      <div className="shimmer" />

      {/* Mẫu A label */}
      <div className="label">
        <div className="icon-ring">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", opacity: 0.92 }}>
          Sensitive content
        </span>
        <span className="pill">Tap to view</span>
      </div>
    </div>
  );
}

export function PostMedia({ mediaList, mediaCount, onMediaClick, isSensitiveContent }) {
  // Mỗi ảnh track riêng — user có thể reveal từng cái
  const [revealed, setRevealed] = useState({});
  const revealOne = (idx) => setRevealed((prev) => ({ ...prev, [idx]: true }));

  const multiSize = useMemo(() => {
    if (mediaCount <= 1) return null;
    if (mediaCount === 2) return { width: 250, height: 300 };
    return { width: 180, height: 250 };
  }, [mediaCount]);

  const mediaScrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    const handleUp = () => {
      const el = mediaScrollRef.current;
      if (!isDraggingRef.current || !el) return;
      isDraggingRef.current = false;
      el.classList.remove("cursor-grabbing");
    };

    window.addEventListener("mouseup", handleUp);
    window.addEventListener("mouseleave", handleUp);

    return () => {
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("mouseleave", handleUp);
    };
  }, []);

  const handleMediaMouseDown = (e) => {
    if (!mediaScrollRef.current) return;
    if (e.button !== 0) return;

    const el = mediaScrollRef.current;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    el.classList.add("cursor-grabbing");

    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMediaMouseMove = (e) => {
    const el = mediaScrollRef.current;
    if (!isDraggingRef.current || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    el.scrollLeft = scrollLeftRef.current - walk;
  };

  const containerRef = useRef(null);
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const videos = root.querySelectorAll("video[data-autoplay]");
    if (!videos.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        });
      },
      { threshold: [0, 0.7, 1] }
    );

    videos.forEach((el) => {
      el.muted = true;
      el.playsInline = true;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [mediaCount]);

  if (mediaCount === 0) return null;

  const sensitive = Boolean(isSensitiveContent);

  return (
    <div ref={containerRef} className="mt-3 flex justify-center w-full">
      {mediaCount === 1 ? (
        (() => {
          const m = mediaList[0];
          const url = m.mediaUrl;
          const isVideo = m.mediaType === "video";
          const isRevealed = revealed[0];

          if (isVideo) {
            return (
              <div className="relative">
                <video
                  src={url}
                  loop
                  data-autoplay
                  className="rounded-2xl border border-border/30 object-contain shadow-md cursor-pointer"
                  style={{
                    maxWidth: "min(680px, 100%)",
                    maxHeight: "420px",
                    width: "auto",
                    height: "auto",
                    backgroundColor: "#000",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMediaClick?.(0);
                  }}
                />
                {sensitive && !isRevealed && (
                  <SensitiveOverlay onReveal={() => revealOne(0)} />
                )}
              </div>
            );
          }

          return (
            <div
              className="relative overflow-hidden rounded-2xl border border-border/30 shadow-md cursor-pointer"
              style={{
                maxWidth: "min(680px, 100%)",
                maxHeight: "420px",
              }}
            >
              <img
                src={url}
                alt="Post media"
                className="object-contain transition-transform duration-500 hover:scale-[1.03]"
                style={{
                  maxWidth: "100%",
                  maxHeight: "420px",
                  width: "auto",
                  height: "auto",
                }}
                loading="lazy"
                onClick={(e) => {
                  e.stopPropagation();
                  if (sensitive && !isRevealed) return; // block click khi chưa reveal
                  onMediaClick?.(0);
                }}
              />
              {sensitive && !isRevealed && (
                <SensitiveOverlay onReveal={() => revealOne(0)} />
              )}
            </div>
          );
        })()
      ) : (
        <div className="w-full flex justify-center">
          <div className="relative w-full max-w-[680px]">
            <div
              ref={mediaScrollRef}
              onMouseDown={handleMediaMouseDown}
              onMouseMove={handleMediaMouseMove}
              onDragStart={(e) => e.preventDefault()}
              className="post-media-scroll overflow-x-auto cursor-grab py-1 flex gap-3 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex gap-3 w-max mx-auto px-2">
                {mediaList.map((m, idx) => {
                  const url = /^https?:\/\//i.test(m.mediaUrl)
                    ? m.mediaUrl
                    : `${import.meta.env.VITE_BACKEND_URL || ""}${m.mediaUrl}`;
                  const isVideo = m.mediaType === "video";
                  const isRevealed = revealed[idx];

                  return (
                    <div
                      key={m.id ?? idx}
                      className="relative flex-shrink-0 rounded-2xl overflow-hidden border border-border/30 bg-black shadow-md cursor-pointer group"
                      style={{
                        width: multiSize?.width ?? 240,
                        height: multiSize?.height ?? 340,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (hasDraggedRef.current) return;
                        if (sensitive && !isRevealed) return; // block click khi chưa reveal
                        onMediaClick?.(idx);
                      }}
                    >
                      {isVideo ? (
                        <video
                          src={url}
                          loop
                          data-autoplay
                          className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <img
                          src={url}
                          alt={`Post media multiple ${idx}`}
                          className="w-full h-full object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}
                      {sensitive && !isRevealed && (
                        <SensitiveOverlay onReveal={() => revealOne(idx)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
