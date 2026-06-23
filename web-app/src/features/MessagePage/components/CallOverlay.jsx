import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, User, MonitorUp } from 'lucide-react';
import { messageApi } from '../../../api/messageApi';
import { endCallAction, setCallInProgress } from '../../../store/callSlice';
import { useWebRTC } from '../../../hooks/useWebRTC';
import { getAccessToken } from '../../../api/localStorageService';
import callingSrc from '../../../assets/sounds/calling.mp3';
import ringtoneSrc from '../../../assets/sounds/ringtone.mp3';

export const CallOverlay = () => {
    const { callStatus, callData } = useSelector((state) => state.call);
    const { profile } = useSelector((state) => state.user);
    const dispatch = useDispatch();

    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [timer, setTimer] = useState(0);

    // Sound refs
    const callingAudioRef = useRef(null);
    const ringtoneAudioRef = useRef(null);

    // Play calling sound (người gọi nghe) khi CALLING
    useEffect(() => {
        if (callStatus === 'CALLING') {
            const audio = new Audio(callingSrc);
            audio.loop = true;
            audio.volume = 0.7;
            audio.play().catch(() => {});
            callingAudioRef.current = audio;
        } else {
            if (callingAudioRef.current) {
                callingAudioRef.current.pause();
                callingAudioRef.current = null;
            }
        }
        return () => {
            if (callingAudioRef.current) {
                callingAudioRef.current.pause();
                callingAudioRef.current = null;
            }
        };
    }, [callStatus]);

    // Play ringtone (người nhận nghe) khi INCOMING
    useEffect(() => {
        if (callStatus === 'INCOMING') {
            const audio = new Audio(ringtoneSrc);
            audio.loop = true;
            audio.volume = 0.8;
            audio.play().catch(() => {});
            ringtoneAudioRef.current = audio;
        } else {
            if (ringtoneAudioRef.current) {
                ringtoneAudioRef.current.pause();
                ringtoneAudioRef.current = null;
            }
        }
        return () => {
            if (ringtoneAudioRef.current) {
                ringtoneAudioRef.current.pause();
                ringtoneAudioRef.current = null;
            }
        };
    }, [callStatus]);

    const handleAccept = async () => {
        try {
            const res = await messageApi.acceptCall(callData.id);
            const updatedData = res.data?.result || res.result || res.data || callData;
            dispatch(setCallInProgress(updatedData));
        } catch (error) {
            console.error("Failed to accept call:", error);
        }
    };

    const handleReject = async () => {
        try {
            await messageApi.rejectCall(callData.id);
            dispatch(endCallAction(callData));
        } catch (error) {
            console.error("Failed to reject call:", error);
        }
    };

    const handleCancel = useCallback(async () => {
        // Thử gọi API hủy cuộc gọi, nếu fail thì thử lại 1 lần
        try {
            await messageApi.cancelCall(callData.id);
        } catch (error) {
            console.warn("Hủy cuộc gọi lần 1 thất bại, thử lại...", error);
            try {
                await messageApi.cancelCall(callData.id);
            } catch (retryError) {
                // Cả 2 lần đều fail, server sẽ tự dọn session sau timeout
                console.error("Hủy cuộc gọi thất bại sau 2 lần:", retryError);
            }
        }
        // Dù API thành công hay fail, vẫn tắt UI
        dispatch(endCallAction(callData));
    }, [callData, dispatch]);

    const handleEndCall = useCallback(async () => {
        try {
            await messageApi.endCall(callData.id);
            dispatch(endCallAction(callData));
        } catch (error) {
            console.error("Failed to end call:", error);
        }
    }, [callData, dispatch]);

    const handlePeerDisconnectLocal = useCallback(async () => {
        if (callStatus === 'IN_PROGRESS' && callData?.id) {
            try {
                await messageApi.endCall(callData.id); // Báo server đóng session
            } catch (error) {
                console.error("Kết thúc cuộc gọi thất bại khi peer mất kết nối:", error);
            }
        }
        // Dù API thành công hay fail, vẫn tắt UI
        dispatch(endCallAction());
    }, [callStatus, callData, dispatch]);

    const {
        localVideoRef,
        remoteVideoRef,
        toggleMuteHook,
        toggleVideoHook,
        toggleScreenShareHook,
        isScreenSharing,
        localStream,
        remoteStream
    } = useWebRTC(callData, callStatus, handlePeerDisconnectLocal);

    // Xử lý trước khi đóng tab (BeforeUnload)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (callData?.id) {
                const token = getAccessToken();
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8888';

                let url = null;
                if (callStatus === 'CALLING') {
                    url = `${baseUrl}/chat/calls/cancel/${callData.id}`;
                } else if (callStatus === 'IN_PROGRESS') {
                    url = `${baseUrl}/chat/calls/end/${callData.id}`;
                } else if (callStatus === 'INCOMING') {
                    // Callee đóng tab khi chuông đang reo → tự động từ chối
                    url = `${baseUrl}/chat/calls/reject/${callData.id}`;
                }

                if (url) {
                    // Sử dụng fetch với keepalive thay vì sendBeacon để hỗ trợ Header Authorization
                    fetch(url, { method: 'POST', keepalive: true, headers });
                }
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [callStatus, callData]);

    // Timer logic for IN_PROGRESS
    useEffect(() => {
        let interval;
        if (callStatus === 'IN_PROGRESS') {
            interval = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [callStatus]);

    // Ringing Timeout (60 giây)
    useEffect(() => {
        let timeout;
        if (callStatus === 'CALLING') {
            timeout = setTimeout(() => {
                console.log("Call timed out after 60s");
                handleCancel();
            }, 60000);
        }
        return () => clearTimeout(timeout);
    }, [callStatus, handleCancel]);

    if (callStatus === 'IDLE' || !callData) return null;

    const toggleMute = () => {
        setIsMuted(!isMuted);
        toggleMuteHook();
    };
    const toggleVideo = () => {
        setIsVideoOff(!isVideoOff);
        toggleVideoHook();
    };

    // Format timer mm:ss
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Determine display name/avatar
    const isCaller = profile?.id === callData.callerId || profile?.userId === callData.callerId;
    const otherUserId = isCaller ? callData.calleeId : callData.callerId;
    const callType = callData.type === 'VIDEO' ? 'Video' : 'Audio';

    // - Nếu là người GỌI: dùng otherUserName/otherUserAvatar (set từ ChatWindow)
    // - Nếu là người NHẬN: dùng callerName/callerAvatar (gửi từ backend)
    const otherUserName = isCaller
        ? (callData.otherUserName || `User ${otherUserId}`)
        : (callData.callerName || `User ${otherUserId}`);
    const otherUserAvatar = isCaller
        ? callData.otherUserAvatar
        : callData.callerAvatar;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center text-white backdrop-blur-md ${callStatus === 'INCOMING' || callStatus === 'CALLING' ? 'bg-black/95' : 'bg-gray-900/95'}`}>

            {/* View: INCOMING */}
            {callStatus === 'INCOMING' && (
                <div className="flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-300">
                    <div className="relative w-32 h-32 rounded-full flex items-center justify-center">
                        {/* Ripple effect */}
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                        <div className="relative w-full h-full bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-blue-500 z-10">
                            {otherUserAvatar ? (
                                <img src={otherUserAvatar} alt={otherUserName} className="w-full h-full object-cover" />
                            ) : (
                                <User size={64} className="text-gray-400" />
                            )}
                        </div>
                    </div>
                    <div className="text-center z-10">
                        <h2 className="text-3xl font-bold mb-2">Cuộc gọi đến từ {otherUserName}</h2>
                        <p className="text-gray-300 text-lg">Cuộc gọi {callType} đến...</p>
                    </div>
                    <div className="flex space-x-8 mt-8 z-10">
                        <button
                            onClick={handleReject}
                            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all hover:scale-110 shadow-lg shadow-red-500/30"
                        >
                            <PhoneOff size={28} />
                        </button>
                        <button
                            onClick={handleAccept}
                            className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-all hover:scale-110 shadow-lg shadow-green-500/30 animate-bounce"
                        >
                            {callData.type === 'VIDEO' ? <Video size={28} /> : <Phone size={28} />}
                        </button>
                    </div>
                </div>
            )}

            {/* View: CALLING (Outgoing) */}
            {callStatus === 'CALLING' && (
                <div className="flex flex-col items-center space-y-8 animate-in fade-in zoom-in duration-300">
                    <div className="w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-gray-600">
                        {otherUserAvatar ? (
                            <img src={otherUserAvatar} alt={otherUserName} className="w-full h-full object-cover" />
                        ) : (
                            <User size={64} className="text-gray-400" />
                        )}
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl font-bold mb-2">Đang gọi {otherUserName}...</h2>
                        <p className="text-gray-400 text-lg animate-pulse">Đang đổ chuông...</p>
                    </div>
                    <div className="mt-8">
                        <button
                            onClick={handleCancel}
                            className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all hover:scale-110 shadow-lg shadow-red-500/30"
                        >
                            <PhoneOff size={28} />
                        </button>
                    </div>
                </div>
            )}

            {/* View: IN_PROGRESS */}
            {callStatus === 'IN_PROGRESS' && (
                <div className="w-full h-full flex flex-col items-center justify-center relative animate-in fade-in duration-500">

                    {/* Video Area (Placeholder for WebRTC) */}
                    {callData.type === 'VIDEO' ? (
                        <div className="w-full h-full bg-black relative">
                            {/* Timer Overlay cho Video Call */}
                            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 px-6 py-2 rounded-full z-40 border border-gray-700/50 backdrop-blur-md shadow-2xl flex items-center space-x-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <p className="text-xl font-mono text-white font-medium">{formatTime(timer)}</p>
                            </div>

                            {/* Remote Video Container */}
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-black">
                                {remoteStream ? (
                                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <Video size={64} className="mb-4 opacity-50" />
                                        <span className="text-xl animate-pulse">Connecting...</span>
                                    </>
                                )}
                            </div>

                            {/* Local Video PIP */}
                            <div className="absolute bottom-24 right-8 w-48 h-64 bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-700 z-20">
                                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            </div>
                        </div>
                    ) : (
                        /* Audio Area */
                        <div className="flex flex-col items-center">
                            {/* Ẩn thẻ audio đi vì chỉ cần phát tiếng */}
                            <audio ref={remoteVideoRef} autoPlay />

                            <div className="w-40 h-40 bg-gray-800 rounded-full flex items-center justify-center mb-8 border border-gray-700 shadow-xl relative overflow-hidden">
                                {/* Ripple effect cho âm thanh */}
                                {remoteStream && <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>}
                                {otherUserAvatar ? (
                                    <img src={otherUserAvatar} alt={otherUserName} className="w-full h-full object-cover z-10" />
                                ) : (
                                    <User size={80} className="text-gray-500 z-10" />
                                )}
                            </div>
                            <h2 className="text-3xl font-bold mb-3">{otherUserName}</h2>
                            <div className="bg-gray-800 px-6 py-2 rounded-full border border-gray-700">
                                <p className="text-2xl font-mono text-blue-400">{formatTime(timer)}</p>
                            </div>
                        </div>
                    )}

                    {/* Controls Toolbar */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-6 bg-black/90 p-4 rounded-3xl backdrop-blur-md border border-gray-700/50 shadow-2xl z-30">
                        <button
                            onClick={toggleMute}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 hover:bg-gray-600'}`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>

                        {callData.type === 'VIDEO' && (
                            <>
                                <button
                                    onClick={toggleVideo}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
                                >
                                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                                </button>

                                <button
                                    onClick={toggleScreenShareHook}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isScreenSharing ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                                    title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
                                >
                                    <MonitorUp size={24} />
                                </button>
                            </>
                        )}

                        <div className="w-px h-10 bg-gray-700 mx-2"></div> {/* Divider */}

                        <button
                            onClick={handleEndCall}
                            className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all hover:scale-110 shadow-lg shadow-red-500/30"
                            title="End Call"
                        >
                            <PhoneOff size={24} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallOverlay;
