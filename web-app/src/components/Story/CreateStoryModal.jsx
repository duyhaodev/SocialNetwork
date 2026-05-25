import { useRef } from "react";
import { X, ImageIcon, Type } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectUser } from "../../store/userSlice";
import { toast } from "sonner";

export default function CreateStoryModal({ onClose }) {
    const currentUser = useSelector(selectUser);
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Chỉ cho phép ảnh
        if (!file.type.startsWith("image/")) {
            toast.error("Chỉ hỗ trợ ảnh. Vui lòng chọn file ảnh.");
            return;
        }

        onClose();
        navigate("/story/create/image", { state: { file } });
    };

    const handleTextClick = () => {
        onClose();
        navigate("/story/create/text");
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-[#000] border border-[#1a1a1a] rounded-2xl w-[420px] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
                    <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                            <AvatarImage src={currentUser?.avatarUrl} />
                            <AvatarFallback>{currentUser?.fullName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-white font-semibold">Tạo tin</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Chọn loại */}
                <div className="flex gap-4 p-6">
                    {/* Ảnh */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex flex-col items-end justify-end pb-6 rounded-2xl overflow-hidden h-52 relative group"
                        style={{ background: "linear-gradient(135deg, #4facfe 0%, #764ba2 100%)" }}
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <span className="relative w-full text-center text-white font-semibold text-sm px-3">
                            Tạo tin dạng ảnh
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </button>

                    {/* Văn bản */}
                    <button
                        onClick={handleTextClick}
                        className="flex-1 flex flex-col items-end justify-end pb-6 rounded-2xl overflow-hidden h-52 relative group"
                        style={{ background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" }}
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
                                <Type className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <span className="relative w-full text-center text-white font-semibold text-sm px-3">
                            Tạo tin dạng văn bản
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
