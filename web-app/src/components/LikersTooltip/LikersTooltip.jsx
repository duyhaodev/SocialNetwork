import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import likeApi from "@/api/likeApi";
import { LikersDialog } from "./LikersDialog";

const TOOLTIP_HEIGHT_ESTIMATE = 220;

export function LikersTooltip({ postId, isLiked, likes, children, disabled, onClick }) {
  const [visible, setVisible] = useState(false);
  const [placement, setPlacement] = useState("top");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const triggerRef = useRef(null);
  const hoverTimer = useRef(null);
  const hideTimer = useRef(null);
  const staleRef = useRef(false);

  useEffect(() => {
    staleRef.current = true;
  }, [isLiked]);

  const fetchLikers = useCallback(async () => {
    if (data !== null && !staleRef.current || loading) return;
    staleRef.current = false;
    setLoading(true);
    try {
      const res = await likeApi.getPostLikers(postId);
      setData(res);
    } catch {
      setData({ likers: [], othersCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [postId, data, loading]);

  const showTooltip = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    const place = spaceAbove < TOOLTIP_HEIGHT_ESTIMATE && spaceBelow > spaceAbove
      ? "bottom" : "top";

    setPlacement(place);
    setPos({
      top: place === "top" ? rect.top + window.scrollY : rect.bottom + window.scrollY,
      left: rect.left + window.scrollX + rect.width / 2,
    });
    setVisible(true);
    fetchLikers();
  };

  const handleMouseEnter = () => {
    if (!likes || likes <= 0) return;
    clearTimeout(hideTimer.current);
    hoverTimer.current = setTimeout(showTooltip, 600);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 150);
  };

  const handleTooltipClick = (e) => {
    e.stopPropagation();
    setVisible(false);
    clearTimeout(hoverTimer.current);
    clearTimeout(hideTimer.current);
    setDialogOpen(true);
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          className="p-2 h-auto group flex items-center rounded-md hover:bg-accent transition-colors"
          onClick={onClick}
          disabled={disabled}
          aria-label="Like"
          type="button"
        >
          {children}
        </button>

        {visible &&
          createPortal(
            <div
              style={{
                position: "absolute",
                top: pos.top,
                left: pos.left,
                transform: placement === "top"
                  ? "translate(-50%, calc(-100% - 8px))"
                  : "translate(-50%, 8px)",
                zIndex: 9999,
                cursor: "pointer",
              }}
              className="min-w-[140px] max-w-[200px] rounded-xl border border-border bg-[#1e1e1e] shadow-xl py-2 px-3"
              onMouseEnter={() => clearTimeout(hideTimer.current)}
              onMouseLeave={handleMouseLeave}
              onClick={handleTooltipClick}
            >
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#1e1e1e] border-border
                  ${placement === "top" ? "-bottom-1.5 border-r border-b" : "-top-1.5 border-l border-t"}`}
              />

              {loading && (
                <p className="text-xs text-muted-foreground">Đang tải...</p>
              )}

              {!loading && data && (
                <>
                  {data.likers?.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Chưa có ai</p>
                  ) : (
                    <>
                      {data.likers.map((u, i) => (
                        <p key={i} className="text-xs leading-5 truncate">
                          {u.fullName || u.username}
                        </p>
                      ))}
                      {data.othersCount > 0 && (
                        <p className="text-xs leading-5">
                          và {data.othersCount} người khác...
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>,
            document.body
          )}
      </div>

      <LikersDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        postId={postId}
        totalLikes={likes}
      />
    </>
  );
}
