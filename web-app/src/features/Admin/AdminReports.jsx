import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import { Check, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [resolveReason, setResolveReason] = useState("Violates community standards");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const REASONS = [
    "Spam or unauthorized advertising",
    "Hate speech or harassment",
    "Misinformation",
    "Violates community standards",
    "Other"
  ];

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPendingReports(0, 50);
      if (res.result && res.result.content) {
        setReports(res.result.content);
      }
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const openResolveModal = (reportId) => {
    setSelectedReportId(reportId);
    setResolveReason("Violates community standards");
    setCustomReason("");
    setResolveModalOpen(true);
  };

  const handleResolve = async () => {
    let finalReason = resolveReason;
    if (resolveReason === "Other") {
      finalReason = customReason.trim();
    }

    if (!finalReason) {
      toast.error("Please select or enter a reason");
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.resolveReport(selectedReportId, { actionReason: finalReason });
      toast.success("Report resolved and post hidden");
      setResolveModalOpen(false);
      fetchReports();
    } catch (error) {
      toast.error("Failed to resolve report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async (reportId) => {
    if (window.confirm("Dismiss this report?")) {
      try {
        await adminApi.dismissReport(reportId);
        toast.success("Report dismissed");
        fetchReports();
      } catch (error) {
        toast.error("Failed to dismiss report");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Report Handling</h2>
      
      <div className="grid gap-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-card border border-border p-5 rounded-xl shadow-sm flex flex-col gap-4">
            
            {/* Header: Reporter Info & Date */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border border-border/50">
                  <AvatarImage src={report.reporterAvatar} alt={report.reporterName} />
                  <AvatarFallback>{report.reporterName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{report.reporterName}</div>
                  <div className="text-xs text-muted-foreground">
                    Reported at {new Date(report.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="bg-orange-500/10 text-orange-500 text-xs font-semibold px-2.5 py-1 rounded-full border border-orange-500/20">
                {report.reason}
              </div>
            </div>

            {/* Post Content */}
            <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap">
              {report.postContent ? report.postContent : <span className="italic text-muted-foreground">No text content</span>}
            </div>

            {/* Post Media */}
            {report.postMediaUrls && report.postMediaUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {report.postMediaUrls.map((url, idx) => (
                  <img key={idx} src={url} alt="Post media" className="h-32 w-auto object-cover rounded-md border border-border/50" />
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-2">
              <Button variant="outline" onClick={() => handleDismiss(report.id)}>
                <X className="w-4 h-4 mr-1.5" />
                Dismiss
              </Button>
              <Button onClick={() => openResolveModal(report.id)} className="bg-red-500 hover:bg-red-600 text-white">
                <Check className="w-4 h-4 mr-1.5" />
                Resolve & Hide
              </Button>
            </div>
          </div>
        ))}
        
        {reports.length === 0 && (
          <div className="text-center p-12 bg-card border border-border rounded-xl shadow-sm text-muted-foreground">
            No pending reports
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              Confirm Report Resolution
            </DialogTitle>
            <DialogDescription>
              The post will be hidden and the author will be notified with the reason below.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Label className="font-semibold text-sm">Select reason to notify the author:</Label>
            <RadioGroup value={resolveReason} onValueChange={setResolveReason} className="space-y-2">
              {REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={`admin-reason-${reason}`} />
                  <Label htmlFor={`admin-reason-${reason}`} className="font-normal cursor-pointer text-sm">
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {resolveReason === "Other" && (
              <div className="mt-3">
                <Textarea
                  placeholder="Enter specific reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600 text-white" 
              onClick={handleResolve} 
              disabled={submitting}
            >
              {submitting ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReports;
