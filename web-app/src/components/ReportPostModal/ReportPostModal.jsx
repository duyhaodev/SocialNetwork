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
  "Spam hoặc quảng cáo trái phép",
  "Nội dung thù địch, quấy rối",
  "Thông tin sai lệch",
  "Vi phạm nội quy nhóm",
  "Khác"
];

export function ReportPostModal({ isOpen, onClose, post }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    let finalReason = selectedReason;
    if (selectedReason === "Khác") {
      finalReason = customReason.trim();
    }

    if (!finalReason) {
      toast.error("Vui lòng chọn hoặc nhập lý do báo cáo");
      return;
    }

    setSubmitting(true);
    try {
      const res = await groupApi.createReport(post.groupId, {
        targetType: "POST",
        targetId: post.id ?? post.postId,
        reason: finalReason
      });
      if (res.code === 1000) {
        toast.success("Đã gửi báo cáo cho Quản trị viên");
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi gửi báo cáo");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <AlertCircle className="w-5 h-5" />
            Báo cáo bài viết
          </DialogTitle>
          <DialogDescription>
            Báo cáo này sẽ được gửi đến Quản trị viên của nhóm để xem xét xử lý.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <Label className="font-semibold text-sm">Chọn lý do:</Label>
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

          {selectedReason === "Khác" && (
            <div className="mt-3">
              <Textarea
                placeholder="Nhập lý do cụ thể..."
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
            Hủy
          </Button>
          <Button 
            className="bg-orange-500 hover:bg-orange-600 text-white" 
            onClick={handleSubmit} 
            disabled={submitting}
          >
            {submitting ? "Đang gửi..." : "Gửi báo cáo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
