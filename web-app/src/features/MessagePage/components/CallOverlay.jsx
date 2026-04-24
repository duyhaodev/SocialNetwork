import { useState, useEffect, useRef } from "react";
import { Phone, Video, X, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";
import { useSocket } from "../../../context/SocketContext";
import { messageApi } from "../../../api/messageApi";
import { toast } from "sonner";

export function CallOverlay() {
  const socket = useSocket();
  const [callData, setCallData] = useState(null); // { id, callerId, calleeId, type, status, ... }
  const [isIncoming, setIsIncoming] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Configuration for WebRTC
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    if (!socket) return;

    // Listen for incoming call
    socket.on("incoming_call", (data) => {
      setCallData(data);
      setIsIncoming(true);
      // Play ringtone (optional)
    });

    socket.on("call_accepted", async (data) => {
      setIsCalling(false);
      setIsInCall(true);
      await startWebRTC(true, data.type === 'VIDEO');
    });

    socket.on("call_rejected", () => {
      toast.error("Cuộc gọi bị từ chối");
      cleanupCall();
    });

    socket.on("call_cancelled", () => {
      toast.info("Cuộc gọi đã bị hủy");
      cleanupCall();
    });

    socket.on("call_ended", () => {
      toast.info("Cuộc gọi đã kết thúc");
      cleanupCall();
    });

    // WebRTC Signaling Listeners
    socket.on("webrtc_offer", async (data) => {
      if (!pcRef.current) await startWebRTC(false, callData?.type === 'VIDEO');
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      
      socket.emit("webrtc_answer", {
        toUserId: data.fromUserId,
        answer: answer
      });
    });

    socket.on("webrtc_answer", async (data) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    socket.on("webrtc_ice_candidate", async (data) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    });

    socket.on("peer_disconnected", (data) => {
        if (callData && (data.userId === callData.callerId || data.userId === callData.calleeId)) {
            toast.warning("Đối phương đã ngắt kết nối");
            cleanupCall();
        }
    });

    return () => {
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("call_rejected");
      socket.off("call_cancelled");
      socket.off("call_ended");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
      socket.off("peer_disconnected");
    };
  }, [socket, callData]);

  const startWebRTC = async (isCaller, isVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(iceServers);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const targetUserId = isCaller ? callData.calleeId : callData.callerId;
          socket.emit("webrtc_ice_candidate", {
            toUserId: targetUserId,
            candidate: event.candidate,
          });
        }
      };

      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("webrtc_offer", {
          toUserId: callData.calleeId,
          offer: offer,
        });
      }
    } catch (err) {
      console.error("WebRTC Error:", err);
      toast.error("Không thể truy cập camera/micro");
    }
  };

  const handleAccept = async () => {
    try {
      await messageApi.acceptCall(callData.id);
      setIsIncoming(false);
      setIsInCall(true);
      await startWebRTC(false, callData.type === 'VIDEO');
    } catch (err) {
      toast.error("Lỗi khi chấp nhận cuộc gọi");
    }
  };

  const handleReject = async () => {
    try {
      await messageApi.rejectCall(callData.id);
      cleanupCall();
    } catch (err) {
      cleanupCall();
    }
  };

  const handleCancel = async () => {
    try {
      await messageApi.cancelCall(callData.id);
      cleanupCall();
    } catch (err) {
      cleanupCall();
    }
  };

  const handleEndCall = async () => {
    try {
      await messageApi.endCall(callData.id);
      cleanupCall();
    } catch (err) {
      cleanupCall();
    }
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setCallData(null);
    setIsIncoming(false);
    setIsCalling(false);
    setIsInCall(false);
    setLocalStream(null);
    setRemoteStream(null);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && localStream.getVideoTracks().length > 0) {
      localStream.getVideoTracks()[0].enabled = !isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  // Logic to trigger a call (will be exposed or listened via a custom event if needed)
  // For now, let's expose it via a window event or just handle it in the parent
  useEffect(() => {
    const handleInitiateCall = (e) => {
        const { calleeId, conversationId, type } = e.detail;
        setIsCalling(true);
        messageApi.initiateCall({ calleeId, conversationId, type })
            .then(res => {
                const data = res.data?.result || res;
                setCallData(data);
                if (data.status === 'MISSED') {
                    toast.error("Người dùng hiện không online");
                    cleanupCall();
                }
            })
            .catch(() => {
                toast.error("Lỗi khi khởi tạo cuộc gọi");
                cleanupCall();
            });
    };

    window.addEventListener("initiate_call", handleInitiateCall);
    return () => window.removeEventListener("initiate_call", handleInitiateCall);
  }, []);

  if (!callData && !isIncoming && !isCalling && !isInCall) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] w-full max-w-md rounded-2xl overflow-hidden border border-[#333] shadow-2xl flex flex-col">
        
        {/* Incoming Call View */}
        {isIncoming && (
          <div className="p-8 flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center text-3xl font-bold">
                {callData?.callerId?.charAt(0).toUpperCase()}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-1">Cuộc gọi đến</h3>
              <p className="text-gray-400">Đang gọi cho bạn...</p>
            </div>
            <div className="flex gap-12 mt-4">
              <button onClick={handleReject} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
                <PhoneOff className="w-8 h-8" />
              </button>
              <button onClick={handleAccept} className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors">
                {callData.type === 'VIDEO' ? <VideoIcon className="w-8 h-8" /> : <Phone className="w-8 h-8" />}
              </button>
            </div>
          </div>
        )}

        {/* Outgoing Call View */}
        {isCalling && (
          <div className="p-8 flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center text-3xl font-bold">
                {callData?.calleeId?.charAt(0).toUpperCase()}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold mb-1">Đang gọi</h3>
              <p className="text-gray-400">Đang chờ đối phương trả lời...</p>
            </div>
            <div className="mt-4">
              <button onClick={handleCancel} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
                <PhoneOff className="w-8 h-8" />
              </button>
            </div>
          </div>
        )}

        {/* Active Call View */}
        {isInCall && (
          <div className="relative flex-1 min-h-[400px] bg-black">
            {/* Remote Video (Main) */}
            {callData.type === 'VIDEO' ? (
               <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
               />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center text-3xl font-bold">
                        ?
                    </div>
                    <p className="text-gray-400">Đang gọi thoại...</p>
                </div>
            )}

            {/* Local Video (Picture-in-Picture) */}
            {callData.type === 'VIDEO' && (
                <div className="absolute top-4 right-4 w-32 aspect-video bg-gray-800 rounded-lg overflow-hidden border border-white/20 shadow-lg">
                    <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
              <button 
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500' : 'bg-gray-700/80 hover:bg-gray-600'}`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              {callData.type === 'VIDEO' && (
                <button 
                    onClick={toggleVideo}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500' : 'bg-gray-700/80 hover:bg-gray-600'}`}
                >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
                </button>
              )}

              <button 
                onClick={handleEndCall}
                className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
