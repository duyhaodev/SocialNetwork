import React, { useState, useEffect, useMemo } from "react";
import { Music2 } from "lucide-react";

// Sử dụng React.memo để ngăn chặn việc re-render không cần thiết từ component cha
const SpotifySection = React.memo(({ value, onChange }) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [debouncedUrl, setDebouncedUrl] = useState(value || "");

  // Debounce link để tránh load iframe liên tục khi đang gõ
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUrl(inputValue);
      if (inputValue !== value) {
        onChange(inputValue);
      }
    }, 600); // Tăng lên 600ms cho chắc ăn

    return () => clearTimeout(handler);
  }, [inputValue]);

  // Sync ngược lại nếu value từ cha thay đổi (ví dụ khi mới mở Dialog)
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value || "");
      setDebouncedUrl(value || "");
    }
  }, [value]);

  // Dùng useMemo để tính toán URL, tránh tính toán lại mỗi lần render
  const embedUrl = useMemo(() => {
    if (!debouncedUrl) return null;
    const match = debouncedUrl.match(/track\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return `https://open.spotify.com/embed/track/${match[1]}?utm_source=generator&theme=0`;
    }
    return null;
  }, [debouncedUrl]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col">
        <label className="text-sm font-medium text-zinc-400">Nhạc yêu thích</label>
        <p className="text-[11px] text-zinc-500">Dán link bài hát từ Spotify để làm đẹp profile</p>
      </div>

      <input 
        placeholder="https://open.spotify.com/track/..." 
        value={inputValue} 
        onChange={(e) => setInputValue(e.target.value)} 
        className="w-full bg-zinc-900 border border-zinc-800 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all" 
      />

      <div className="relative min-h-[80px] w-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/30">
        {embedUrl ? (
          <iframe 
            key={embedUrl} // Cực kỳ quan trọng: Iframe chỉ load lại khi ID bài hát thay đổi
            src={embedUrl} 
            width="100%" 
            height="80" 
            frameBorder="0" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
            className="rounded-xl"
            title="Spotify Preview"
          ></iframe>
        ) : (
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
              <Music2 size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Chưa có bài hát nào</p>
              <p className="text-[10px] text-zinc-600">Dán link Spotify để thêm nhạc nền</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Chỉ re-render nếu value (link) thay đổi
  return prevProps.value === nextProps.value;
});

export default SpotifySection;