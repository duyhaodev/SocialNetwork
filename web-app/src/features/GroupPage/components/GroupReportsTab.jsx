import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatTimeAgo } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Check, EyeOff, ShieldAlert, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import groupApi from "@/api/groupApi";
import postApi from "@/api/postApi";
import { PostCard } from "@/components/PostCard/PostCard";

export function GroupReportsTab({ groupId }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportPosts, setReportPosts] = useState({});

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // { reportId, postId, userId, reason }
  const [submitting, setSubmitting] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await groupApi.getPendingReports(groupId);
      if (res.code === 1000) {
        setReports(res.result);
        fetchReportedPosts(res.result);
      }
    } catch (error) {
      toast.error("Failed to load reports");
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
          console.error("Failed to load reported post", postId);
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
      toast.success("Report dismissed");
      fetchReports();
    } catch (error) {
      toast.error("Failed to dismiss report");
    }
  };

  const openHideConfirm = (reportId, postId, userId, reason) => {
    setPendingAction({ reportId, postId, userId, reason });
    setConfirmOpen(true);
  };

  const handleConfirmHide = async () => {
    if (!pendingAction) return;
    const { reportId, postId, userId, reason } = pendingAction;
    setSubmitting(true);
    try {
      await postApi.updatePostStatus(postId, "HIDDEN", reason);
      await groupApi.updateReportStatus(groupId, reportId, "RESOLVED", userId, reason);
      toast.success("Post hidden and report resolved");
      setConfirmOpen(false);
      fetchReports();
    } catch (error) {
      toast.error("Failed to process report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/20">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-xl font-bold mb-2">No reports</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Your group is doing great and following all community guidelines.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="w-5 h-5 text-orange-500" />
        <h3 className="font-semibold text-lg">Pending Reports</h3>
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
                      Violation
                    </span>
                    <span className="font-semibold text-sm">
                      {report.reason}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Reported {formatTimeAgo(report.createdAt)}
                  </div>
                </div>
              </div>

              <div className="p-0 opacity-80 pointer-events-none">
                {post ? (
                  <PostCard post={post} />
                ) : (
                  <div className="p-4 text-center text-muted-foreground italic text-sm">
                    (Post no longer exists or has been deleted)
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-border/40 bg-muted/20 flex items-center justify-end gap-3 pointer-events-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDismissReport(report.id)}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                  disabled={!post}
                  onClick={() => openHideConfirm(report.id, report.targetId, post?.userId, report.reason)}
                >
                  <EyeOff className="w-4 h-4" /> Hide Post
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm Hide Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <AlertCircle className="w-5 h-5" />
              Hide Post
            </DialogTitle>
            <DialogDescription>
              The post will be hidden due to the reported violation: <strong>{pendingAction?.reason}</strong>. The author will be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleConfirmHide}
              disabled={submitting}
            >
              {submitting ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
