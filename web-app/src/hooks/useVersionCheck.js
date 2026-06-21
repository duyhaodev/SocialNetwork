import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Version được inject lúc build bởi Vite
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

export function useVersionCheck() {
  const toastShownRef = useRef(false);

  useEffect(() => {
    // Bỏ qua khi dev local
    if (CURRENT_VERSION === 'dev') return;

    const check = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now());
        if (!res.ok) return;

        const { version } = await res.json();

        if (version !== CURRENT_VERSION && !toastShownRef.current) {
          toastShownRef.current = true;

          toast.custom(
            (t) => (
              <div className="flex items-start gap-3 w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl px-4 py-3 shadow-2xl">
                {/* Icon */}
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">New version available</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Update now for a better experience.</p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-zinc-200 transition-colors"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => {
                      toast.dismiss(t);
                      toastShownRef.current = false;
                    }}
                    className="rounded-lg px-3 py-1 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </div>
            ),
            { duration: Infinity }
          );
        }
      } catch {
        // Bỏ qua lỗi network
      }
    };

    // Check lần đầu sau 1 phút
    const timeout = setTimeout(check, 60_000);
    // Sau đó check mỗi 5 phút
    const interval = setInterval(check, 5 * 60_000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);
}
