import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Play, Trash2, ChevronUp, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { markStoryViewed, deleteStory } from "../../store/storySlice";
import { selectUser } from "../../store/userSlice";
import storyApi from "../../api/storyApi";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { toast } from "sonner";

const TICK = 100;
const DEFAULT_DURATION = 5000;   // 5s không có nhạc
const MUSIC_DURATION = 15000;    // 15s có nhạc

export default function StoryViewer({ groups, startIndex, onClose }) {
    const dispatch = useDispatch();
    const currentUser = useSelector(selectUser);

    const [groupIndex, setGroupIndex] = useState(startIndex);
    const [storyIndex, setStoryIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(false);
    const [viewers, setViewers] = useState([]);
    const [showViewers, setShowViewers] = useState(false);

    const audioRef = useRef(null);
    const intervalRef = useRef(null);

    const currentGroup = groups[groupIndex];
    const currentStory = currentGroup?.stories[storyIndex];
    const isOwner = currentStory?.userId === currentUser?.userId;

    // Lock scroll và xử lý phím Esc khi viewer mở
    useEffect(() => {
        // Dừng cuộn trang
        document.body.style.overflow = "hidden";

        // Nhấn Esc để đóng
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (!currentStory) return;
        setProgress(0);
        setPaused(false);
        setShowViewers(false);
        dispatch(markStoryViewed(currentStory.id));

        if (isOwner) {
            storyApi.getViewers(currentStory.id)
                .then((res) => setViewers(res?.result || []))
                .catch(() => setViewers([]));
        }

        if (audioRef.current && currentStory.musicPreviewUrl) {
            audioRef.current.currentTime = (currentStory.musicStartMs || 0) / 1000;
            if (!muted) audioRef.current.play().catch(() => {});
        }
    }, [groupIndex, storyIndex]);

    // Sync pause/play với audio
    useEffect(() => {
        if (!audioRef.current) return;
        if (paused) audioRef.current.pause();
        else audioRef.current.play().catch(() => {});
    }, [paused]);

    // Sync mute với audio
    useEffect(() => {
        if (!audioRef.current) return;
        audioRef.current.muted = muted;
    }, [muted]);

    useEffect(() => {
        clearInterval(intervalRef.current);
        if (paused) return;
        const duration = currentStory?.musicPreviewUrl ? MUSIC_DURATION : DEFAULT_DURATION;
        intervalRef.current = setInterval(() => {
            setProgress((prev) => {
                const next = prev + (TICK / duration) * 100;
                if (next >= 100) { clearInterval(intervalRef.current); goNext(); return 0; }
                return next;
            });
        }, TICK);
        return () => clearInterval(intervalRef.current);
    }, [paused, groupIndex, storyIndex]);

    const goNext = () => {
        if (storyIndex < currentGroup.stories.length - 1) setStoryIndex((i) => i + 1);
        else if (groupIndex < groups.length - 1) { setGroupIndex((i) => i + 1); setStoryIndex(0); }
        else onClose();
    };

    const goPrev = () => {
        if (storyIndex > 0) setStoryIndex((i) => i - 1);
        else if (groupIndex > 0) { setGroupIndex((i) => i - 1); setStoryIndex(0); }
    };

    const handleDelete = async () => {
        const result = await dispatch(deleteStory(currentStory.id));
        if (result.meta.requestStatus === "fulfilled") {
            toast.success("Đã xóa story");
            goNext();
        }
    };

    if (!currentStory) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
            {/* Nút đóng */}
            <button onClick={onClose} className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                <X className="w-5 h-5" />
            </button>

            {/* Prev group */}
            {groupIndex > 0 && (
                <button
                    onClick={() => { setGroupIndex((i) => i - 1); setStoryIndex(0); }}
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            )}

            {/* Next group */}
            {groupIndex < groups.length - 1 && (
                <button
                    onClick={() => { setGroupIndex((i) => i + 1); setStoryIndex(0); }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white z-10 transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            )}

            {/* Khung story */}
            <div className="relative w-[360px] h-[640px] rounded-2xl overflow-hidden bg-[#1e1e1e] select-none">

                {/* Progress bars */}
                <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
                    {currentGroup.stories.map((_, i) => (
                        <div key={i} className="flex-1 h-0.5 bg-white/25 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full"
                                style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%" }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-7 left-0 right-0 px-3 flex items-center gap-2 z-10">
                    <Avatar className="w-8 h-8 ring-1 ring-white/50">
                        <AvatarImage src={currentGroup.avatarUrl} />
                        <AvatarFallback className="text-xs">{currentGroup.fullName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold leading-tight">{currentGroup.fullName}</p>
                        <p className="text-white/60 text-xs">
                            {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true, locale: vi })}
                        </p>
                        {currentStory.musicTitle && (
                            <p className="text-white/70 text-xs truncate">♪ {currentStory.musicTitle} · {currentStory.musicArtist}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setMuted((m) => !m)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setPaused((p) => !p)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                        </button>
                        {isOwner && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-[#1e1e1e] border-[#2a2a2a]">
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 cursor-pointer hover:bg-[#2a2a2a] focus:bg-[#2a2a2a]">
                                        <Trash2 className="w-4 h-4 mr-2" /> Xóa story
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Nội dung */}
                <div
                    className="w-full h-full"
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        if (e.clientX < rect.left + rect.width / 2) goPrev();
                        else goNext();
                    }}
                >
                    {currentStory.mediaType === "IMAGE" && currentStory.mediaUrl && (
                        <img src={currentStory.mediaUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                    )}
                    {currentStory.mediaType === "TEXT" && (
                        <div className="w-full h-full flex items-center justify-center p-10" style={{ background: currentStory.backgroundColor || "#1a1a2e" }}>
                            <p className="text-white text-2xl font-bold text-center break-words leading-relaxed">{currentStory.textContent}</p>
                        </div>
                    )}

                    {/* Music pill đã bị ẩn */}
                </div>

                {/* Audio */}
                {currentStory.musicPreviewUrl && (
                    <audio
                        ref={audioRef}
                        key={currentStory.id}
                        src={currentStory.musicPreviewUrl}
                        muted={muted}
                        loop
                        onLoadedMetadata={(e) => {
                            e.target.currentTime = (currentStory.musicStartMs || 0) / 1000;
                            if (!muted && !paused) e.target.play().catch(() => {});
                        }}
                    />
                )}

                {/* Viewers panel (chỉ owner) */}
                {isOwner && (
                    <div className="absolute bottom-0 left-0 right-0 z-10">
                        <button
                            className="w-full flex flex-col items-center py-3 hover:bg-white/5 transition-colors"
                            onClick={() => setShowViewers((v) => !v)}
                        >
                            <ChevronUp className={`w-4 h-4 text-white/60 transition-transform ${showViewers ? "rotate-180" : ""}`} />
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex -space-x-1.5">
                                    {viewers.slice(0, 4).map((v) => (
                                        <Avatar key={v.viewerId} className="w-5 h-5 ring-1 ring-black">
                                            <AvatarImage src={v.avatarUrl} />
                                            <AvatarFallback className="text-[8px]">{v.fullName?.[0]}</AvatarFallback>
                                        </Avatar>
                                    ))}
                                </div>
                                <span className="text-white/80 text-xs">{viewers.length} người xem</span>
                            </div>
                        </button>

                        {showViewers && (
                            <div className="bg-[#1e1e1e]/95 border-t border-white/10 max-h-52 overflow-y-auto px-4 py-2 space-y-3">
                                {viewers.map((v) => (
                                    <div key={v.viewerId} className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={v.avatarUrl} />
                                            <AvatarFallback className="text-xs">{v.fullName?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-white text-sm font-medium">{v.fullName}</p>
                                            <p className="text-white/40 text-xs">@{v.username}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
