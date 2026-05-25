import { useState, useRef } from "react";
import { Music, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createStory, selectStoriesCreating } from "../../store/storySlice";
import { selectUser } from "../../store/userSlice";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import MusicPicker from "./MusicPicker";
import MusicWaveform from "./MusicWaveform";
import { toast } from "sonner";

const BACKGROUNDS = [
    "linear-gradient(135deg, #1877f2, #0a5dc2)",
    "linear-gradient(135deg, #f093fb, #f5576c)",
    "linear-gradient(135deg, #4facfe, #00f2fe)",
    "linear-gradient(135deg, #43e97b, #38f9d7)",
    "linear-gradient(135deg, #fa709a, #fee140)",
    "linear-gradient(135deg, #a18cd1, #fbc2eb)",
    "linear-gradient(135deg, #667eea, #764ba2)",
    "linear-gradient(135deg, #ff9a9e, #fecfef)",
    "#1a1a2e",
    "#000000",
    "linear-gradient(135deg, #f7971e, #ffd200)",
    "linear-gradient(135deg, #56ab2f, #a8e063)",
];

export default function StoryTextEditor({ onClose, onBack }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentUser = useSelector(selectUser);
    const creating = useSelector(selectStoriesCreating);

    const [text, setText] = useState("");
    const [background, setBackground] = useState(BACKGROUNDS[0]);
    const [scope, setScope] = useState("PUBLIC");
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    const [selectedMusic, setSelectedMusic] = useState(null);
    const [showWaveform, setShowWaveform] = useState(false);
    const [musicPos, setMusicPos] = useState({ x: 50, y: 80 });
    const [musicSelected, setMusicSelected] = useState(false);
    const [showMusicPill] = useState(false); // không hiện pill trong canvas
    const isDraggingMusic = useRef(false);
    const dragStartMusic = useRef({});

    const handleSubmit = async () => {
        if (!text.trim()) { toast.error("Vui lòng nhập nội dung"); return; }
        const result = await dispatch(createStory({
            mediaType: "TEXT",
            textContent: text.trim(),
            backgroundColor: background,
            scope,
            musicTitle: selectedMusic?.title || null,
            musicArtist: selectedMusic?.artist || null,
            musicAlbumArt: selectedMusic?.albumArt || null,
            musicPreviewUrl: selectedMusic?.previewUrl || null,
            musicStartMs: selectedMusic?.musicStartMs || 0,
        }));
        if (result.meta.requestStatus === "fulfilled") {
            toast.success("Đã đăng tin");
            navigate("/feed");
        } else toast.error("Đăng tin thất bại");
    };

    return (
        <div className="fixed inset-0 z-50 flex" style={{ backgroundColor: "#000" }}>
            {/* Sidebar */}
            <div className="w-72 bg-[#111] border-r border-[#1a1a1a] flex flex-col flex-shrink-0">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-[#2a2a2a]">
                    <div className="flex items-center gap-2 flex-1">
                        <Avatar className="w-7 h-7">
                            <AvatarImage src={currentUser?.avatarUrl} />
                            <AvatarFallback className="text-xs">{currentUser?.fullName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm font-medium">{currentUser?.fullName}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                    {/* Màu nền */}
                    <div>
                        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">Màu nền</p>
                        <div className="grid grid-cols-6 gap-2">
                            {BACKGROUNDS.map((bg, i) => (
                                <button
                                    key={i}
                                    onClick={() => setBackground(bg)}
                                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${background === bg ? "ring-2 ring-white ring-offset-1 ring-offset-[#1e1e1e] scale-110" : ""}`}
                                    style={{ background: bg }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Nhạc */}
                    <div>
                        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Nhạc</p>
                        <button
                            onClick={() => setShowMusicPicker(true)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] transition-colors text-left"
                        >
                            <Music className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm text-white/70 truncate">
                                {selectedMusic ? `${selectedMusic.title} · ${selectedMusic.artist}` : "Thêm nhạc"}
                            </span>
                        </button>

                        {/* Toggle hiện/ẩn pill nhạc — đã ẩn */}
                    </div>

                    {/* Quyền riêng tư */}
                    <div>
                        <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-2">Quyền riêng tư</p>
                        <Select value={scope} onValueChange={setScope}>
                            <SelectTrigger className="bg-[#1a1a1a] border-[#2a2a2a] text-white h-10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
                                <SelectItem value="PUBLIC">Công khai</SelectItem>
                                <SelectItem value="FOLLOWERS">Người theo dõi</SelectItem>
                                <SelectItem value="ONLY_ME">Chỉ mình tôi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="px-4 py-4 border-t border-[#2a2a2a] flex gap-2">
                    <button onClick={onBack} className="flex-1 py-2.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium transition-colors">
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={creating || !text.trim()}
                        className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-40 transition-colors"
                    >
                        {creating ? "Đang đăng..." : "Đăng tin"}
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-black">
                <p className="text-white/30 text-xs uppercase tracking-wider">Xem trước</p>

                {/* Canvas */}
                <div className="flex items-start gap-3">
                    <div
                        className="relative w-[320px] h-[568px] rounded-2xl overflow-hidden flex items-center justify-center border border-white/10"
                        style={{ background }}
                        onClick={() => { setMusicSelected(false); setShowWaveform(false); }}
                        onMouseMove={(e) => {
                            if (!dragStartMusic.current.x) return;
                            const dx = e.clientX - dragStartMusic.current.x;
                            const dy = e.clientY - dragStartMusic.current.y;
                            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDraggingMusic.current = true;
                            if (!isDraggingMusic.current) return;
                            setMusicPos({
                                x: Math.min(85, Math.max(15, dragStartMusic.current.px + (dx / 320) * 100)),
                                y: Math.min(95, Math.max(5, dragStartMusic.current.py + (dy / 568) * 100)),
                            });
                        }}
                        onMouseUp={() => { setTimeout(() => { isDraggingMusic.current = false; dragStartMusic.current = {}; }, 10); }}
                        onMouseLeave={() => { setTimeout(() => { isDraggingMusic.current = false; dragStartMusic.current = {}; }, 10); }}
                    >
                        <div className="w-full h-full flex items-center justify-center px-8">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Nhập nội dung..."
                                maxLength={200}
                                className="w-full bg-transparent text-white text-xl font-bold text-center resize-none outline-none placeholder:text-white/30 leading-relaxed"
                                style={{
                                    scrollbarWidth: "none",
                                    msOverflowStyle: "none",
                                    overflow: "hidden",
                                    height: "auto",
                                    minHeight: "2rem",
                                }}
                                rows={1}
                                onInput={(e) => {
                                    // Auto resize height theo nội dung
                                    e.target.style.height = "auto";
                                    e.target.style.height = e.target.scrollHeight + "px";
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                </div>

                {/* Info nhạc — click để hiện/ẩn waveform */}
                {selectedMusic && !showWaveform && !showMusicPicker && (
                    <div
                        className="w-[320px] flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 cursor-pointer hover:bg-[#222] transition-colors"
                        onClick={() => setShowWaveform(true)}
                    >
                        <img src={selectedMusic.albumArt} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate">{selectedMusic.title}</p>
                            <p className="text-white/50 text-xs truncate">{selectedMusic.artist}</p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedMusic(null); setShowWaveform(false); }}
                            className="text-primary text-xs hover:underline shrink-0"
                        >
                            Gỡ
                        </button>
                    </div>
                )}

                {/* Waveform dưới canvas — hiện khi click vào pill */}
                {showWaveform && selectedMusic?.previewUrl && (
                    <div className="w-[320px]">
                        <MusicWaveform
                            music={selectedMusic}
                            onConfirm={(m) => { setSelectedMusic(m); setShowWaveform(false); setMusicSelected(false); }}
                            onCancel={() => { setSelectedMusic(null); setShowWaveform(false); setMusicSelected(false); }}
                        />
                    </div>
                )}
            </div>

            {showMusicPicker && (
                <MusicPicker onSelect={(m) => {
                    setSelectedMusic(m);
                    setShowMusicPicker(false);
                    setShowWaveform(true); // hiện waveform để chọn đoạn
                }} onClose={() => setShowMusicPicker(false)} />
            )}

            {/* Audio preview nhạc đã chọn */}
            {selectedMusic?.previewUrl && !showWaveform && (
                <audio
                    key={selectedMusic.previewUrl + (selectedMusic.musicStartMs || 0)}
                    src={selectedMusic.previewUrl}
                    autoPlay
                    loop
                    style={{ display: "none" }}
                    onLoadedMetadata={(e) => {
                        e.target.currentTime = (selectedMusic.musicStartMs || 0) / 1000;
                    }}
                />
            )}
        </div>
    );
}
