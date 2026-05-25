import { useState, useRef } from "react";
import { X, Search, Play, Pause, Music } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { searchMusic, selectMusicResults, selectMusicLoading, clearMusicResults } from "../../store/storySlice";

export default function MusicPicker({ onSelect, onClose }) {
    const dispatch = useDispatch();
    const results = useSelector(selectMusicResults);
    const loading = useSelector(selectMusicLoading);

    const [query, setQuery] = useState("");
    const [playingUrl, setPlayingUrl] = useState(null);
    const audioRef = useRef(null);

    const handleSearch = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        dispatch(searchMusic(query.trim()));
    };

    const handlePlay = (previewUrl) => {
        if (!previewUrl) return;
        if (playingUrl === previewUrl) {
            audioRef.current?.pause();
            setPlayingUrl(null);
        } else {
            if (audioRef.current) {
                audioRef.current.src = previewUrl;
                audioRef.current.play().catch(() => {});
            }
            setPlayingUrl(previewUrl);
        }
    };

    // Click vào track → confirm luôn, không qua waveform
    const handleSelectTrack = (track) => {
        audioRef.current?.pause();
        dispatch(clearMusicResults());
        onSelect(track);
    };

    return (
        <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#1e1e1e] border-l border-[#2a2a2a] flex flex-col z-20">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-primary" />
                    <span className="text-white text-sm font-semibold">Thêm nhạc</span>
                </div>
                <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="px-3 py-2">
                <div className="flex items-center gap-2 bg-[#2a2a2a] rounded-lg px-3 py-2">
                    <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm bài hát..."
                        className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                        autoFocus
                    />
                </div>
            </form>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
                {loading && (
                    <div className="flex items-center justify-center py-10">
                        <span className="text-white/30 text-sm">Đang tìm...</span>
                    </div>
                )}
                {!loading && results.length === 0 && query && (
                    <div className="flex items-center justify-center py-10">
                        <span className="text-white/30 text-sm">Không có kết quả</span>
                    </div>
                )}
                {!loading && results.length === 0 && !query && (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <Music className="w-8 h-8 text-white/20" />
                        <span className="text-white/30 text-sm">Tìm kiếm bài hát</span>
                    </div>
                )}
                {results.map((track, i) => (
                    <div
                        key={i}
                        onClick={() => handleSelectTrack(track)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer group transition-colors"
                    >
                        <img src={track.albumArt} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{track.title}</p>
                            <p className="text-white/40 text-xs truncate">{track.artist}</p>
                        </div>
                        {/* Nút preview nhỏ */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePlay(track.previewUrl); }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 opacity-0 group-hover:opacity-100 transition-all ${
                                track.previewUrl
                                    ? "bg-white/10 hover:bg-white/20 cursor-pointer"
                                    : "bg-white/5 cursor-not-allowed"
                            }`}
                            disabled={!track.previewUrl}
                        >
                            {playingUrl === track.previewUrl ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                ))}
            </div>

            <audio ref={audioRef} onEnded={() => setPlayingUrl(null)} />
        </div>
    );
}
