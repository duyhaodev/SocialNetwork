import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const PREDEFINED_REASONS = [
  { id: "spam", label: "Spam, quảng cáo không mong muốn" },
  { id: "irrelevant", label: "Nội dung không liên quan đến chủ đề nhóm" },
  { id: "rules_violation", label: "Vi phạm nội quy nhóm" },
  { id: "toxic", label: "Ngôn từ đả kích, gây thù hằn" },
  { id: "other", label: "Khác (vui lòng nhập chi tiết bên dưới)" }
];

export function RejectPostModal({ isOpen, onClose, onReject }) {
  const [selectedReasonId, setSelectedReasonId] = useState("");
  const [customReason, setCustomReason] = useState("");

  const handleReject = () => {
    let finalReason = "";
    if (selectedReasonId === "other") {
      finalReason = customReason.trim();
    } else {
      const reasonObj = PREDEFINED_REASONS.find(r => r.id === selectedReasonId);
      finalReason = reasonObj ? reasonObj.label : "";
    }
    
    onReject(finalReason);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Từ chối bài viết</DialogTitle>
          <DialogDescription>
            Vui lòng chọn lý do từ chối. Người đăng sẽ nhận được thông báo kèm theo lý do này.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <RadioGroup 
            value={selectedReasonId} 
            onValueChange={(val) => {
              setSelectedReasonId(val);
              if (val !== "other") {
                setCustomReason("");
              }
            }}
            className="flex flex-col gap-3"
          >
            {PREDEFINED_REASONS.map((reason) => (
              <div key={reason.id} className="flex items-center space-x-2">
                <RadioGroupItem value={reason.id} id={reason.id} />
                <Label htmlFor={reason.id} className="cursor-pointer font-normal">
                  {reason.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {selectedReasonId === "other" && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2">
              <Textarea 
                placeholder="Nhập lý do chi tiết..." 
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="min-h-[100px] resize-none focus-visible:ring-red-500"
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button 
            variant="destructive" 
            onClick={handleReject}
            disabled={!selectedReasonId || (selectedReasonId === "other" && !customReason.trim())}
          >
            Xác nhận từ chối
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
