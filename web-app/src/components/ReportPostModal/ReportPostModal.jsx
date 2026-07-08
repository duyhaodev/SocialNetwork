import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import groupApi from "@/api/groupApi";
import { AlertCircle } from "lucide-react";

const REPORT_REASONS = [
  "Spam or unauthorized advertising",
  "Hate speech or harassment",
  "Misinformation",
  "Violates community standards",
  "Other"
];

export function ReportPostModal({ isOpen, onClose, post }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    let finalReason = selectedReason;
    if (selectedReason === "Other") {
      finalReason = customReason.trim();
    }

    if (!finalReason) {
      toast.error("Please select or enter a reason");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        targetType: "POST",
        targetId: post.id ?? post.postId,
        reason: finalReason
      };
      
      let res;
      let adminText = "Administrator";
      if (post.groupId) {
        res = await groupApi.createReport(post.groupId, payload);
        adminText = "Group Admin";
      } else {
        const postApi = (await import("@/api/postApi")).default;
        res = await postApi.reportPost(payload);
        adminText = "System Admin";
      }
      if (res.code === 1000) {
        toast.success(`Report submitted to ${adminText}`);
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const isAdminReport = !post.groupId;
  const adminText = isAdminReport ? "System Admin" : "Group Admin";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <AlertCircle className="w-5 h-5" />
            Report Post
          </DialogTitle>
          <DialogDescription>
            This report will be sent to {adminText} for review.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Label className="font-semibold text-sm">Select a reason:</Label>
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <div key={reason} className="flex items-center space-x-2">
                <RadioGroupItem value={reason} id={`reason-${reason}`} />
                <Label htmlFor={`reason-${reason}`} className="font-normal cursor-pointer text-sm">
                  {reason}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReason === "Other" && (
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
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            className="bg-orange-500 hover:bg-orange-600 text-white" 
            onClick={handleSubmit} 
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
