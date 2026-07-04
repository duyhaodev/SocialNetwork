import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatTimeAgo } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Check, Trash2, ShieldAlert } from "lucide-react";
import groupApi from "@/api/groupApi";
import postApi from "@/api/postApi";
import { PostCard } from "@/components/PostCard/PostCard";

export function GroupReportsTab({ groupId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportPosts, setReportPosts] = useState({}); // mapped by targetId

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await groupApi.getPendingReports(groupId);
      if (res.code === 1000) {
        setReports(res.result);
        fetchReportedPosts(res.result);
      }
    } catch (error) {
      toast.error("Lỗi khi tải danh sách báo cáo");
    } finally {
      setLoading(false);
    }
  };

  const fetchReportedPosts = async (reportList) => {
    const postIds = [...new Set(reportList.filter(r => r.targetType === "POST").map(r => r.targetId))];
    const newReportPosts = { ...reportPosts };

    for (const postId of postIds) {
      if (!newReportPosts[postId]) {
        try {
          const postRes = await postApi.getPostById(postId);
          if (postRes.code === 1000) {
            newReportPosts[postId] = postRes.result;
          }
        } catch (error) {
          console.error("Lỗi tải chi tiết bài viết bị báo cáo", postId);
        }
      }
    }
    setReportPosts(newReportPosts);
  };

  useEffect(() => {
    fetchReports();
  }, [groupId]);

  const handleDismissReport = async (reportId) => {
    try {
      await groupApi.updateReportStatus(groupId, reportId, "DISMISSED");
      toast.success("Đã bỏ qua báo cáo");
      fetchReports();
    } catch (error) {
      toast.error("Lỗi khi cập nhật báo cáo");
    }
  };

  const handleDeletePostAndResolve = async (reportId, postId, notifyUserId, reason) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không? Tác giả sẽ nhận được thông báo.")) return;
    try {
      // Xóa bài viết ở post-service
      await postApi.deletePost(postId);
      
      // Update report status = RESOLVED and send notification via group-service
      await groupApi.updateReportStatus(groupId, reportId, "RESOLVED", notifyUserId, reason);
      
      toast.success("Đã xóa bài viết và xử lý báo cáo");
      fetchReports();
    } catch (error) {
      toast.error("Lỗi khi xử lý báo cáo hoặc xóa bài viết");
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/20">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">Không có báo cáo nào</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Nhóm của bạn đang hoạt động rất tốt và tuân thủ các quy định.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-orange-500" />
        <h3 className="font-semibold text-lg">Báo cáo đang chờ xử lý</h3>
      </div>
      
      <div className="space-y-6">
        {reports.map((report) => {
          const post = reportPosts[report.targetId];
          return (
            <div key={report.id} className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm relative">
              <div className="bg-orange-500/10 border-b border-orange-500/20 p-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded uppercase">
                      Vi phạm
                    </span>
                    <span className="font-semibold text-sm">
                      {report.reason}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Báo cáo lúc: {formatTimeAgo(report.createdAt)}
                  </div>
                </div>
              </div>
              
              <div className="p-0 opacity-80 pointer-events-none">
                {post ? (
                  <PostCard post={post} />
                ) : (
                  <div className="p-4 text-center text-muted-foreground italic text-sm">
                    (Bài viết không tồn tại hoặc đã bị xóa)
                  </div>
                )}
              </div>
              
              <div className="p-3 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-3 pointer-events-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDismissReport(report.id)}
                >
                  Bỏ qua
                </Button>
                <Button 
                  size="sm" 
                  className="bg-red-500 hover:bg-red-600 text-white gap-2"
                  disabled={!post}
                  onClick={() => handleDeletePostAndResolve(report.id, report.targetId, post?.userId, report.reason)}
                >
                  <Trash2 className="w-4 h-4" /> Xóa bài viết
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
