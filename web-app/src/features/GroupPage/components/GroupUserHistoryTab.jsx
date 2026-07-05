import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import postApi from "@/api/postApi";
import { PostCard } from "@/components/PostCard/PostCard";
import { History, ShieldAlert } from "lucide-react";
import { formatTimeAgo } from "@/utils/dateUtils";

export function GroupUserHistoryTab({ groupId, onProfileClick, onPostClick }) {
  const [historyPosts, setHistoryPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await postApi.getUserGroupPostHistory(groupId);
      if (res.code === 1000) {
        setHistoryPosts(res.result || []);
      }
    } catch (error) {
      toast.error("Lỗi khi tải lịch sử bài viết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [groupId]);

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  if (historyPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/20">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <History className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold mb-2">Chưa có bài viết nào</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Bạn chưa đăng bài viết nào trong nhóm này. Các bài viết của bạn (kể cả bị từ chối hay ẩn) sẽ xuất hiện ở đây.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return <span className="bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-bold px-2 py-0.5 rounded uppercase">Đã duyệt</span>;
      case "PENDING":
        return <span className="bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 text-xs font-bold px-2 py-0.5 rounded uppercase">Đang chờ duyệt</span>;
      case "REJECTED":
        return <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold px-2 py-0.5 rounded uppercase">Bị từ chối</span>;
      case "HIDDEN":
        return (
          <span className="bg-slate-800 text-white border border-slate-700 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase">
            <ShieldAlert className="w-3 h-3" /> Bị ẩn do vi phạm
          </span>
        );
      default:
        return <span className="bg-gray-500/10 text-gray-500 text-xs font-bold px-2 py-0.5 rounded uppercase">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Lịch sử bài viết của bạn</h3>
      </div>
      
      <div className="space-y-6">
        {historyPosts.map((post) => (
          <div key={post.id} className="relative">
            {/* Status Overlay for visual feedback */}
            <div className="mb-2 flex items-center justify-between">
              {getStatusBadge(post.status)}
              <span className="text-xs text-muted-foreground">Đăng lúc: {formatTimeAgo(post.createdAt)}</span>
            </div>
            
            {/* The actual post */}
            <div className={`transition-opacity duration-200 ${post.status === 'REJECTED' || post.status === 'HIDDEN' ? 'opacity-60' : ''}`}>
              <PostCard 
                post={post} 
                isGroupAdminOrMod={false} // Disable admin actions in history
                onPinToggle={() => {}} // No pin in history
                onProfileClick={onProfileClick}
                onPostClick={onPostClick}
              />
            </div>
            
            {/* Reason if rejected/hidden */}
            {post.statusReason && (post.status === 'REJECTED' || post.status === 'HIDDEN') && (
              <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold block mb-0.5">
                    Lý do {post.status === 'REJECTED' ? 'từ chối' : 'ẩn'}:
                  </span>
                  {post.statusReason}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
