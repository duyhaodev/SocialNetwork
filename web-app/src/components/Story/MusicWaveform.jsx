import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Pause, Play, Check } from "lucide-react";

const WINDOW_SEC = 15; // story phát 15s

export default function MusicWaveform({ music, onConfirm, onCancel }) {
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [duration, setDuration] = useState(30);
    const [startTime, setStartTime] = useState(0);
    const startTimeRef = useRef(0); // ref để dùng trong event handler tránh stale closure

    // Drag sliding window
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartTime = useRef(0);

    useEffect(() => {
        if (!containerRef.current || !music?.previewUrl) return;

        const ws = WaveSurfer.create({
            container: containerRef.current,
            waveColor: "rgba(255,255,255,0.3)",
            progressColor: "rgba(255,255,255,0.85)",
            cursorColor: "transparent",
            height: 44,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            normalize: true,
            interact: false,
        });

        ws.load(music.previewUrl);

        ws.on("ready", () => {
            setIsReady(true);
            setDuration(ws.getDuration());
            ws.play();
            setIsPlaying(true);
        });

        ws.on("audioprocess", () => {
            const t = ws.getCurrentTime();
            // Loop trong window — dùng ref để tránh stale closure
            if (t >= startTimeRef.current + WINDOW_SEC) {
                ws.seekTo(startTimeRef.current / ws.getDuration());
            }
        });

        ws.on("finish", () => {
            ws.seekTo(startTimeRef.current / (ws.getDuration() || 30));
            ws.play();
        });

        wavesurferRef.current = ws;
        return () => { ws.destroy(); wavesurferRef.current = null; };
    }, [music?.previewUrl]);

    // Seek khi startTime thay đổi
    useEffect(() => {
        const ws = wavesurferRef.current;
        if (!ws || !isReady || duration === 0) return;
        ws.seekTo(startTimeRef.current / duration);
        if (!isPlaying) { ws.play(); setIsPlaying(true); }
    }, [startTime]);

    const togglePlay = () => {
        const ws = wavesurferRef.current;
        if (!ws || !isReady) return;
        if (isPlaying) { ws.pause(); setIsPlaying(false); }
        else { ws.play(); setIsPlaying(true); }
    };

    const handleConfirm = () => {
        wavesurferRef.current?.pause();
        onConfirm({ ...music, musicStartMs: Math.floor(startTimeRef.current * 1000) });
    };

    // Drag handlers cho sliding window
    const handleMouseDown = (e) => {
        isDragging.current = true;
        dragStartX.current = e.clientX;
        dragStartTime.current = startTime;
    };
    const handleMouseMove = (e) => {
        if (!isDragging.current || !isReady) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const dx = e.clientX - dragStartX.current;
        const dtSec = (dx / rect.width) * duration;
        const newStart = Math.max(0, Math.min(duration - WINDOW_SEC, dragStartTime.current + dtSec));
        startTimeRef.current = newStart;
        setStartTime(newStart);
    };
    const handleMouseUp = () => { isDragging.current = false; };

    const formatTime = (s) => `0:${Math.floor(s % 60).toString().padStart(2, "0")}`;

    return (
        <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 space-y-2">
            <p className="text-white/30 text-xs text-center">
                Kéo khung trắng để chọn đoạn {WINDOW_SEC}s sẽ phát
            </p>

            {/* Waveform WaveSurfer + sliding window overlay */}
            <div
                className="relative cursor-grab active:cursor-grabbing select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* WaveSurfer render vào đây */}
                <div ref={containerRef} className="w-full rounded" />

                {/* Sliding window overlay */}
                {isReady && duration > 0 && (
                    <div
                        className="absolute top-0 bottom-0 border-2 border-white/70 rounded pointer-events-none"
                        style={{
                            left: `${(startTime / duration) * 100}%`,
                            width: `${(WINDOW_SEC / duration) * 100}%`,
                            backgroundColor: "rgba(255,255,255,0.1)",
                        }}
                    />
                )}

                {!isReady && (
                    <div className="h-11 flex items-center justify-center">
                        <span className="text-white/30 text-xs">Đang tải...</span>
                    </div>
                )}
            </div>

            {/* Thời gian */}
            {isReady && (
                <div className="flex justify-between text-white/30 text-xs px-0.5">
                    <span>{formatTime(startTime)}</span>
                    <span>→ {formatTime(Math.min(startTime + WINDOW_SEC, duration))}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-2">
                <button
                    onClick={togglePlay}
                    disabled={!isReady}
                    className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white shrink-0 disabled:opacity-30 transition-colors"
                >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>

                <div className="flex-1 text-center min-w-0">
                    <p className="text-white/40 text-xs truncate">
                        {music?.title} · {music?.artist}
                    </p>
                </div>

                <button
                    onClick={handleConfirm}
                    disabled={!isReady}
                    className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-black shrink-0 disabled:opacity-30 hover:bg-white/90 transition-colors"
                >
                    <Check className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
