import { Button } from "../ui/button";

export default function ConfirmDeleteModal({ open, onClose, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-[280px] rounded-2xl bg-[#1c1c1e] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Content */}
        <div className="px-5 pt-5 pb-4 text-center">
          <h3 className="text-base font-semibold mb-2">
            Xóa bài viết?
          </h3>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Nếu xóa bài viết này, bạn sẽ <br />
            <span className="text-white font-medium">
              không thể khôi phục được nữa.
            </span>
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10" />

        {/* Actions */}
        <div className="flex text-sm">
          <button
            onClick={onClose}
            className="flex-1 py-3 hover:bg-white/5 transition font-medium"
          >
            Hủy
          </button>
          <div className="w-px bg-white/10" />
          <button
            onClick={onConfirm}
            className="flex-1 py-3 text-red-500 hover:bg-red-500/10 transition font-medium"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
