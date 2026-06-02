import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useSelector } from 'react-redux';

export const useWebRTC = (callData, callStatus, onPeerDisconnect) => {
    const socket = useSocket();
    const { profile } = useSelector(state => state.user);
    
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    
    const peerConnection = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const originalVideoTrack = useRef(null); // Lưu lại camera khi share màn hình
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    
    // STUN + TURN servers để đảm bảo kết nối hoạt động trong mọi điều kiện mạng
    const rtcConfig = {
        iceServers: [
            // STUN của Google — kết nối trực tiếp khi cùng mạng
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // STUN của Metered
            { urls: 'stun:stun.relay.metered.ca:80' },
            // TURN của Metered — relay khi không kết nối trực tiếp được (khác mạng, tường lửa)
            {
                urls: 'turn:global.relay.metered.ca:80',
                username: '58dd567257c348ff3cef8670',
                credential: 'JYid+Q93W2TVLWaZ',
            },
            {
                urls: 'turn:global.relay.metered.ca:80?transport=tcp',
                username: '58dd567257c348ff3cef8670',
                credential: 'JYid+Q93W2TVLWaZ',
            },
            {
                urls: 'turn:global.relay.metered.ca:443',
                username: '58dd567257c348ff3cef8670',
                credential: 'JYid+Q93W2TVLWaZ',
            },
            {
                urls: 'turns:global.relay.metered.ca:443?transport=tcp',
                username: '58dd567257c348ff3cef8670',
                credential: 'JYid+Q93W2TVLWaZ',
            },
        ]
    };
    
    const isCaller = profile?.id === callData?.callerId || profile?.userId === callData?.callerId;
    const otherUserId = isCaller ? callData?.calleeId : callData?.callerId;

    // Khởi tạo Media (Camera/Mic) và RTCPeerConnection
    const startMediaAndPeerConnection = useCallback(async () => {
        if (peerConnection.current) return; // Tránh khởi tạo 2 lần (Bug mất hình)

        let stream = null;
        try {
            // 1. Xin quyền truy cập thiết bị
            stream = await navigator.mediaDevices.getUserMedia({
                video: callData?.type === 'VIDEO',
                audio: true
            });
            setLocalStream(stream);
        } catch (err) {
            console.warn("Camera/Mic đang bị chiếm bởi ứng dụng khác hoặc không có thiết bị:", err);
            // Cứ tiếp tục tạo PeerConnection để ÍT NHẤT VẪN NHẬN ĐƯỢC VIDEO của người kia
        }

        try {
            // 2. Tạo kết nối WebRTC
            peerConnection.current = new RTCPeerConnection(rtcConfig);
            
            // 3. Đưa các stream nội bộ vào kết nối để truyền đi (nếu xin quyền thành công)
            if (stream) {
                originalVideoTrack.current = stream.getVideoTracks()[0];
                stream.getTracks().forEach(track => {
                    peerConnection.current.addTrack(track, stream);
                });
            }

            // 4. Bắt sự kiện khi nhận được stream từ người kia
            peerConnection.current.ontrack = (event) => {
                const [remoteTrackStream] = event.streams;
                setRemoteStream(remoteTrackStream);
            };

            // 5. Tìm đường (ICE) và gửi cho người kia qua Socket
            peerConnection.current.onicecandidate = (event) => {
                if (event.candidate && socket) {
                    socket.emit('webrtc_ice_candidate', {
                        toUserId: otherUserId,
                        candidate: event.candidate
                    });
                }
            };

            // 6. Theo dõi trạng thái kết nối
            peerConnection.current.oniceconnectionstatechange = () => {
                const state = peerConnection.current.iceConnectionState;
                if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                    console.log("WebRTC: Peer disconnected", state);
                    if (onPeerDisconnect) onPeerDisconnect();
                }
            };
            
        } catch (error) {
            console.error("Lỗi khi khởi tạo RTCPeerConnection:", error);
        }
    }, [callData, otherUserId, socket, onPeerDisconnect]);

    // Tự động gắn stream vào thẻ video khi thẻ video được render
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, callStatus]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream, callStatus]);

    // Bắt đầu luồng gửi Offer khi trạng thái chuyển sang IN_PROGRESS (và nếu là người gọi)
    useEffect(() => {
        if (callStatus === 'IN_PROGRESS' && callData) {
            startMediaAndPeerConnection().then(() => {
                if (isCaller && peerConnection.current) {
                    // Người gọi tạo Offer
                    peerConnection.current.createOffer()
                        .then(offer => peerConnection.current.setLocalDescription(offer))
                        .then(() => {
                            if(socket) {
                                socket.emit('webrtc_offer', {
                                    toUserId: otherUserId,
                                    offer: peerConnection.current.localDescription
                                });
                            }
                        });
                }
            });
        }
    }, [callStatus, isCaller, callData, startMediaAndPeerConnection, socket, otherUserId]);

    // Lắng nghe các gói tin WebRTC từ đối phương
    useEffect(() => {
        if (!socket) return;

        const handleOffer = async (data) => {
            if (data.fromUserId !== otherUserId) return;
            
            if (!peerConnection.current) await startMediaAndPeerConnection();
            
            // Nhận Offer -> Lưu -> Tạo Answer gửi lại
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            
            socket.emit('webrtc_answer', {
                toUserId: data.fromUserId,
                answer: peerConnection.current.localDescription
            });
        };

        const handleAnswer = async (data) => {
            if (data.fromUserId !== otherUserId) return;
            
            // Nhận Answer -> Kết thúc quá trình thương lượng SDP
            if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        };

        const handleIceCandidate = async (data) => {
            if (data.fromUserId !== otherUserId) return;
            
            // Nhận địa chỉ IP (ICE Candidate) của đối phương -> thêm vào connection
            if (peerConnection.current) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                    console.error('Error adding received ice candidate', e);
                }
            }
        };

        socket.on('webrtc_offer', handleOffer);
        socket.on('webrtc_answer', handleAnswer);
        socket.on('webrtc_ice_candidate', handleIceCandidate);

        const handlePeerDisconnected = (data) => {
            if (data.userId === otherUserId) {
                console.log("Socket: Peer disconnected", data.userId);
                if (onPeerDisconnect) onPeerDisconnect();
            }
        };
        socket.on('peer_disconnected', handlePeerDisconnected);

        return () => {
            socket.off('webrtc_offer', handleOffer);
            socket.off('webrtc_answer', handleAnswer);
            socket.off('webrtc_ice_candidate', handleIceCandidate);
            socket.off('peer_disconnected', handlePeerDisconnected);
        };
    }, [socket, otherUserId, startMediaAndPeerConnection, onPeerDisconnect]);

    // Dọn dẹp tài nguyên khi cúp máy
    useEffect(() => {
        if (callStatus === 'IDLE' || callStatus === 'COMPLETED' || callStatus === 'REJECTED' || callStatus === 'MISSED') {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
            }
            if (peerConnection.current) {
                peerConnection.current.close();
                peerConnection.current = null;
            }
            setRemoteStream(null);
        }
    }, [callStatus]); // Removed localStream from dependency array to avoid infinite loop of stopping tracks

    // Hàm điều khiển Mic/Cam
    const toggleMuteHook = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    };

    const toggleVideoHook = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    };

    const stopScreenShareHook = useCallback(async () => {
        if (!peerConnection.current || !originalVideoTrack.current) return;
        const videoSender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
            await videoSender.replaceTrack(originalVideoTrack.current);
            if (localStream) {
                const newLocalStream = new MediaStream([originalVideoTrack.current, ...localStream.getAudioTracks()]);
                setLocalStream(newLocalStream);
            }
            setIsScreenSharing(false);
        }
    }, [localStream]);

    const toggleScreenShareHook = async () => {
        if (!peerConnection.current) return;

        try {
            if (!isScreenSharing) {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];

                const videoSender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
                if (videoSender) {
                    await videoSender.replaceTrack(screenTrack);
                    
                    if (localStream) {
                        const newLocalStream = new MediaStream([screenTrack, ...localStream.getAudioTracks()]);
                        setLocalStream(newLocalStream);
                    }
                    setIsScreenSharing(true);

                    // Khi user bấm "Stop sharing" trên trình duyệt
                    screenTrack.onended = () => {
                        stopScreenShareHook();
                    };
                }
            } else {
                stopScreenShareHook();
            }
        } catch (error) {
            console.warn("User cancelled screen share or error:", error);
        }
    };

    return {
        localVideoRef,
        remoteVideoRef,
        toggleMuteHook,
        toggleVideoHook,
        toggleScreenShareHook,
        isScreenSharing,
        localStream,
        remoteStream
    };
};
