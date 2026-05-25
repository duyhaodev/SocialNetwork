import { useEffect, useRef, useState } from "react";
import { Music, Type, RotateCw, Minus, Plus, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createStory, selectStoriesCreating } from "../../store/storySlice";
import { selectUser } from "../../store/userSlice";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import MusicPicker from "./MusicPicker";
import MusicWaveform from "./MusicWaveform";
import mediaApi from "../../api/mediaApi";
import { toast } from "sonner";

export default function StoryImageEditor({ file, onBack }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentUser = useSelector(selectUser);
    const creating = useSelector(selectStoriesCreating);

    // ── Ảnh ──────────────────────────────────────────────────
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDraggingImg = useRef(false);
    const dragStartImg = useRef({ x: 0, y: 0 });
    const initialScaleSet = useRef(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const canvasRef = useRef(null);

    // ── Text overlay ──────────────────────────────────────────
    // textPos: vị trí % so với canvas (0-100)
    const [overlayText, setOverlayText] = useState("");
    const [textPos, setTextPos] = useState({ x: 50, y: 50 });
    const [textSize, setTextSize] = useState(20);
    const [textWidth, setTextWidth] = useState(200); // chiều rộng khung text (px) // font size px
    const [editingText, setEditingText] = useState(false);
    const isDraggingText = useRef(false);
    const dragStartText = useRef({ x: 0, y: 0 });
    const isResizingText = useRef(false);
    const resizeStart = useRef({ x: 0, size: 20 });
    const textRef = useRef(null);

    // ── Nhạc / scope ─────────────────────────────────────────
    const [showMusicPicker, setShowMusicPicker] = useState(false);
    const [selectedMusic, setSelectedMusic] = useState(null);
    const [showWaveform, setShowWaveform] = useState(false);
    const [musicSelected, setMusicSelected] = useState(false);
    const [musicPos, setMusicPos] = useState({ x: 50, y: 80 });
    const [showMusicPill, setShowMusicPill] = useState(true); // ẩn/hiện pill
    const isDraggingMusic = useRef(false);
    const [isDraggingMusicState, setIsDraggingMusicState] = useState(false);
    const dragStartMusic = useRef({ x: 0, y: 0 });
    const [scope, setScope] = useState("PUBLIC");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // Wheel zoom ảnh
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const onWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.02 : 0.02;
            setScale((s) => parseFloat(Math.min(3, Math.max(0.05, s + delta)).toFixed(3)));
        };
        canvas.addEventListener("wheel", onWheel, { passive: false });
        return () => canvas.removeEventListener("wheel", onWheel);
    }, []);

    // Vẽ canvas (chỉ ảnh, không vẽ text)
    useEffect(() => {
        if (!previewUrl || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.src = previewUrl;
        img.onload = () => {
            if (!initialScaleSet.current) {
                initialScaleSet.current = true;
                const fitScale = Math.min(320 / img.width, 568 / img.height);
                setScale(fitScale);
                return;
            }
            const dpr = window.devicePixelRatio || 1;
            canvas.width = 320 * dpr;
            canvas.height = 568 * dpr;
            canvas.style.width = "320px";
            canvas.style.height = "568px";
            ctx.scale(dpr, dpr);

            // Background blur
            ctx.save();
            ctx.filter = "blur(30px) brightness(0.8)";
            const bgScale = Math.max(320 / img.width, 568 / img.height) * 1.2;
            ctx.drawImage(img, 160 - (img.width * bgScale) / 2, 284 - (img.height * bgScale) / 2, img.width * bgScale, img.height * bgScale);
            ctx.filter = "none";
            ctx.restore();

            // Ảnh chính
            ctx.save();
            ctx.translate(160 + position.x, 284 + position.y);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(scale, scale);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        };
    }, [previewUrl, scale, rotation, position]);

    // ── Drag ảnh ─────────────────────────────────────────────
    const handleImgMouseDown = (e) => {
        if (isDraggingText.current) return;
        isDraggingImg.current = true;
        dragStartImg.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };
    const handleImgMouseMove = (e) => {
        if (!isDraggingImg.current) return;
        setPosition({ x: e.clientX - dragStartImg.current.x, y: e.clientY - dragStartImg.current.y });
    };
    const handleImgMouseUp = () => { isDraggingImg.current = false; };

    // ── Drag text ─────────────────────────────────────────────
    const handleTextMouseDown = (e) => {
        e.stopPropagation();
        if (editingText) return;
        isDraggingText.current = true;
        dragStartText.current = { x: e.clientX, y: e.clientY, px: textPos.x, py: textPos.y };
    };
    const handleTextMouseMove = (e) => {
        if (isResizingText.current) {
            const dx = (e.clientX - resizeStart.current.x) * resizeStart.current.signX;
            const dy = (e.clientY - resizeStart.current.y) * resizeStart.current.signY;
            // Kéo ngang → width, kéo dọc → font size
            const newWidth = Math.min(300, Math.max(60, resizeStart.current.width + dx * 2));
            const newSize = Math.min(60, Math.max(8, resizeStart.current.size + dy * 0.3));
            setTextWidth(parseFloat(newWidth.toFixed(1)));
            setTextSize(parseFloat(newSize.toFixed(1)));
            return;
        }
        if (!isDraggingText.current) return;
        const dx = ((e.clientX - dragStartText.current.x) / 320) * 100;
        const dy = ((e.clientY - dragStartText.current.y) / 568) * 100;
        setTextPos({
            x: Math.min(90, Math.max(10, dragStartText.current.px + dx)),
            y: Math.min(95, Math.max(5, dragStartText.current.py + dy)),
        });
    };
    const handleTextMouseUp = () => {
        isDraggingText.current = false;
        isResizingText.current = false;
    };

    // ── Resize text (kéo chấm góc dưới phải) ─────────────────
    const handleResizeMouseDown = (e) => {
        e.stopPropagation();
        isResizingText.current = true;
        resizeStart.current = { x: e.clientX, size: textSize };
    };

    // ── Submit ────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!previewUrl || isSubmitting) return;
        setIsSubmitting(true);

        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = 1080;
        exportCanvas.height = 1920;
        const exportCtx = exportCanvas.getContext("2d");

        const img = new Image();
        img.src = previewUrl;
        img.onload = async () => {
            const ratio = 1080 / 320;

            // Background blur
            exportCtx.save();
            exportCtx.filter = "blur(80px) brightness(0.6)";
            const bgScale = Math.max(1080 / img.width, 1920 / img.height) * 1.2;
            exportCtx.drawImage(img, 540 - (img.width * bgScale) / 2, 960 - (img.height * bgScale) / 2, img.width * bgScale, img.height * bgScale);
            exportCtx.filter = "none";
            exportCtx.restore();

            // Ảnh chính
            exportCtx.save();
            exportCtx.translate((160 + position.x) * ratio, (284 + position.y) * ratio);
            exportCtx.rotate((rotation * Math.PI) / 180);
            exportCtx.scale(scale * ratio, scale * ratio);
            exportCtx.drawImage(img, -img.width / 2, -img.height / 2);
            exportCtx.restore();

            // Text overlay — vẽ vào canvas export theo vị trí %
            if (overlayText.trim()) {
                const tx = (textPos.x / 100) * 1080;
                const ty = (textPos.y / 100) * 1920;
                const exportFontSize = textSize * (1080 / 320);
                exportCtx.font = `bold ${exportFontSize}px sans-serif`;
                exportCtx.fillStyle = "white";
                exportCtx.textAlign = "center";
                exportCtx.shadowColor = "rgba(0,0,0,0.8)";
                exportCtx.shadowBlur = 12;
                exportCtx.fillText(overlayText, tx, ty);
            }

            // Music pill — vẽ vào canvas export theo vị trí % (chỉ khi hiện)
            if (selectedMusic && showMusicPill) {
                const mx = (musicPos.x / 100) * 1080;
                const my = (musicPos.y / 100) * 1920;
                const pillW = 320;
                const pillH = 80;
                const r = 20;

                // Nền pill
                exportCtx.save();
                exportCtx.globalAlpha = 0.6;
                exportCtx.fillStyle = "#000";
                exportCtx.beginPath();
                exportCtx.roundRect(mx - pillW / 2, my - pillH / 2, pillW, pillH, r);
                exportCtx.fill();
                exportCtx.globalAlpha = 1;

                // Album art
                if (selectedMusic.albumArt) {
                    const artImg = new Image();
                    artImg.crossOrigin = "anonymous";
                    artImg.src = selectedMusic.albumArt + "?t=" + Date.now(); // bypass cache
                    await new Promise((res) => { artImg.onload = res; artImg.onerror = res; });
                    exportCtx.save();
                    exportCtx.beginPath();
                    exportCtx.roundRect(mx - pillW / 2 + 12, my - pillH / 2 + 10, 60, 60, 8);
                    exportCtx.clip();
                    exportCtx.drawImage(artImg, mx - pillW / 2 + 12, my - pillH / 2 + 10, 60, 60);
                    exportCtx.restore();
                }

                // Text
                exportCtx.fillStyle = "white";
                exportCtx.font = "bold 28px sans-serif";
                exportCtx.textAlign = "left";
                exportCtx.fillText(selectedMusic.title, mx - pillW / 2 + 84, my - 8);
                exportCtx.fillStyle = "rgba(255,255,255,0.7)";
                exportCtx.font = "22px sans-serif";
                exportCtx.fillText(`♪ ${selectedMusic.artist}`, mx - pillW / 2 + 84, my + 22);
                exportCtx.restore();
            }

            exportCanvas.toBlob(async (blob) => {
                if (!blob) { toast.error("Lỗi xử lý ảnh"); setIsSubmitting(false); return; }
                try {
                    const formData = new FormData();
                    formData.append("files", new File([blob], "story.jpg", { type: "image/jpeg" }));
                    const uploadRes = await mediaApi.upload(formData);
                    const uploaded = Array.isArray(uploadRes) ? uploadRes : (uploadRes?.result || []);
                    const mediaId = uploaded[0]?.id;
                    if (!mediaId) throw new Error("Upload thất bại");

                    const result = await dispatch(createStory({
                        mediaType: "IMAGE", mediaId, scope,
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
                } catch (err) {
                    toast.error(err.message || "Đăng tin thất bại");
                    setIsSubmitting(false);
                }
            }, "image/jpeg", 0.95);
        };
    };

    return (
        <div className="fixed inset-0 z-50 flex" style={{ backgroundColor: "#000" }}>
            {/* Sidebar */}
            <div className="w-72 bg-[#111] border-r border-[#1a1a1a] flex flex-col flex-shrink-0">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-[#2a2a2a]">
                    <Avatar className="w-7 h-7">
                        <AvatarImage src={currentUser?.avatarUrl} />
                        <AvatarFallback className="text-xs">{currentUser?.fullName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-white text-sm font-medium">{currentUser?.fullName}</span>
                </div>

                <div className="flex-1 px-4 py-4 space-y-2">
                    {/* Thêm văn bản */}
                    <button
                        onClick={() => {
                            setEditingText(true);
                            setTimeout(() => textRef.current?.focus(), 50);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                            overlayText ? "bg-primary/20 text-primary" : "hover:bg-[#2a2a2a] text-white/70"
                        }`}
                    >
                        <Type className="w-4 h-4 shrink-0" />
                        <span className="text-sm truncate">
                            {overlayText ? overlayText : "Thêm văn bản"}
                        </span>
                        {overlayText && (
                            <button onClick={(e) => { e.stopPropagation(); setOverlayText(""); }} className="ml-auto">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </button>

                    {/* Thêm nhạc */}
                    <button
                        onClick={() => setShowMusicPicker(true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2a2a2a] transition-colors text-left"
                    >
                        <Music className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm text-white/70 truncate">
                            {selectedMusic ? `${selectedMusic.title} · ${selectedMusic.artist}` : "Thêm nhạc"}
                        </span>
                    </button>

                    {/* Toggle hiện/ẩn pill nhạc */}
                    {selectedMusic && (
                        <button
                            onClick={() => setShowMusicPill((v) => !v)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2a2a2a] transition-colors text-left"
                        >
                            <span className="text-sm text-white/50">
                                {showMusicPill ? "👁 Ẩn khung nhạc" : "👁 Hiện khung nhạc"}
                            </span>
                        </button>
                    )}

                    {/* Quyền riêng tư */}
                    <div className="pt-2">
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
                        disabled={creating || isSubmitting}
                        className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-40 transition-colors"
                    >
                        {(creating || isSubmitting) ? "Đang đăng..." : "Đăng tin"}
                    </button>
                </div>
            </div>

            {/* Preview */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black">
                <p className="text-white/30 text-xs uppercase tracking-wider">Xem trước</p>

                <div
                    className="relative w-[320px] h-[568px] border border-white/10 select-none"
                    style={{ backgroundColor: "#1c1c1e", borderRadius: "16px" }}
                    onMouseMove={(e) => {
                        handleImgMouseMove(e);
                        handleTextMouseMove(e);
                        if (dragStartMusic.current.x !== undefined) {
                            const dx = e.clientX - dragStartMusic.current.x;
                            const dy = e.clientY - dragStartMusic.current.y;
                            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDraggingMusic.current = true;
                            if (isDraggingMusic.current) {
                                setMusicPos({
                                    x: Math.min(85, Math.max(15, dragStartMusic.current.px + (dx / 320) * 100)),
                                    y: Math.min(95, Math.max(5, dragStartMusic.current.py + (dy / 568) * 100)),
                                });
                            }
                        }
                    }}
                    onMouseUp={() => { handleImgMouseUp(); handleTextMouseUp(); setTimeout(() => { isDraggingMusic.current = false; dragStartMusic.current = {}; }, 10); }}
                    onMouseLeave={() => { handleImgMouseUp(); handleTextMouseUp(); setTimeout(() => { isDraggingMusic.current = false; dragStartMusic.current = {}; }, 10); }}
                    onClick={() => { setMusicSelected(false); setShowWaveform(false); }}
                >
                    {/* Canvas ảnh */}
                    <canvas
                        ref={canvasRef}
                        width={320}
                        height={568}
                        className="absolute inset-0 w-full h-full cursor-move"
                        style={{ borderRadius: "16px", overflow: "hidden", pointerEvents: isDraggingMusicState ? "none" : "auto" }}
                        onMouseDown={handleImgMouseDown}
                    />

                    {/* Text overlay HTML — kéo thả được */}
                    {overlayText && !editingText && (
                        <div
                            className="absolute"
                            style={{
                                left: `${textPos.x}%`,
                                top: `${textPos.y}%`,
                                transform: "translate(-50%, -50%)",
                                zIndex: 10,
                            }}
                        >
                            {/* Khung viền chấm — kéo để di chuyển */}
                            <div
                                className="relative border border-dashed border-white/70 rounded px-3 py-1.5 cursor-move"
                                onMouseDown={handleTextMouseDown}
                                onDoubleClick={() => setEditingText(true)}
                            >
                                {/* Nút X góc trên trái */}
                                <button
                                    className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black z-20"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); setOverlayText(""); }}
                                >
                                    <X className="w-3 h-3" />
                                </button>

                                {/* 4 chấm góc — kéo để resize */}
                                {[
                                    { pos: "-top-1.5 -left-1.5", signX: -1, signY: -1 },
                                    { pos: "-top-1.5 -right-1.5", signX: 1, signY: -1 },
                                    { pos: "-bottom-1.5 -left-1.5", signX: -1, signY: 1 },
                                    { pos: "-bottom-1.5 -right-1.5", signX: 1, signY: 1 },
                                ].map((corner, i) => (
                                    <div
                                        key={i}
                                        className={`absolute ${corner.pos} w-3 h-3 rounded-sm bg-white cursor-nwse-resize z-20`}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            isResizingText.current = true;
                                            resizeStart.current = {
                                                x: e.clientX,
                                                y: e.clientY,
                                                size: textSize,
                                                width: textWidth,
                                                signX: corner.signX,
                                                signY: corner.signY,
                                            };
                                        }}
                                    />
                                ))}

                                <p
                                    className="text-white font-bold text-center select-none"
                                    style={{
                                        fontSize: `${textSize}px`,
                                        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                                        width: `${textWidth}px`,
                                        overflowWrap: "break-word",
                                    }}
                                >
                                    {overlayText}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Input nhập text */}
                    {editingText && (
                        <div
                            className="absolute inset-0 flex items-center justify-center z-20"
                            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                        >
                            <div className="w-full px-6">
                                <textarea
                                    ref={textRef}
                                    autoFocus
                                    value={overlayText}
                                    onChange={(e) => setOverlayText(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setEditingText(false); } }}
                                    placeholder="Nhập văn bản..."
                                    maxLength={100}
                                    rows={3}
                                    className="w-full bg-transparent text-white text-xl font-bold text-center outline-none placeholder:text-white/40 border-b border-white/40 pb-1 resize-none"
                                    style={{ scrollbarWidth: "none" }}
                                />
                                <p className="text-white/40 text-xs text-center mt-2">Enter để xong · Shift+Enter xuống hàng</p>
                            </div>
                        </div>
                    )}

                    {/* Music pill đã bị ẩn */}
                </div>

                {/* Controls zoom/xoay */}
                <div className="flex items-center gap-3 bg-[#111] border border-[#1a1a1a] rounded-xl px-4 py-2">
                    <button onClick={() => setScale((s) => Math.max(0.05, parseFloat((s - 0.05).toFixed(3))))} className="text-white/50 hover:text-white transition-colors">
                        <Minus className="w-4 h-4" />
                    </button>
                    <input type="range" min={0.05} max={3} step={0.005} value={scale}
                        onChange={(e) => setScale(parseFloat(e.target.value))}
                        className="w-40 accent-primary"
                    />
                    <button onClick={() => setScale((s) => Math.min(3, parseFloat((s + 0.05).toFixed(3))))} className="text-white/50 hover:text-white transition-colors">
                        <Plus className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-[#2a2a2a]" />
                    <button onClick={() => setRotation((r) => (r + 90) % 360)} className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-xs">
                        <RotateCw className="w-3.5 h-3.5" />
                        Xoay
                    </button>
                </div>

                {/* Waveform chọn đoạn nhạc */}
                {showWaveform && selectedMusic?.previewUrl && (
                    <div className="w-[320px]">
                        <MusicWaveform
                            music={selectedMusic}
                            onConfirm={(m) => { setSelectedMusic(m); setShowWaveform(false); setMusicSelected(false); }}
                            onCancel={() => { setSelectedMusic(null); setShowWaveform(false); setMusicSelected(false); }}
                        />
                    </div>
                )}

                {/* Info nhạc đã chọn — click để hiện/ẩn waveform */}
                {selectedMusic && !showWaveform && (
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
                            onClick={(e) => { e.stopPropagation(); setSelectedMusic(null); setMusicSelected(false); }}
                            className="text-primary text-xs hover:underline shrink-0"
                        >
                            Gỡ
                        </button>
                    </div>
                )}
            </div>

            {showMusicPicker && (
                <MusicPicker
                    onSelect={(m) => {
                        setSelectedMusic(m);
                        setShowMusicPicker(false);
                        setShowWaveform(true);
                    }}
                    onClose={() => setShowMusicPicker(false)}
                />
            )}

            {/* Audio preview khi đã confirm đoạn nhạc */}
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
