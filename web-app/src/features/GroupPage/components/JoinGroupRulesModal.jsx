import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import groupApi from "@/api/groupApi";
import { Spinner } from "@/components/ui/spinner";
import { ShieldAlert } from "lucide-react";

export function JoinGroupRulesModal({ isOpen, onClose, groupId, groupName, onAgree }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && groupId) {
      setLoading(true);
      groupApi.getGroupRules(groupId)
        .then(res => {
          if (res.code === 1000) {
            setRules(res.result || []);
          }
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, groupId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nội quy tham gia nhóm</DialogTitle>
          <DialogDescription>
            Admin của {groupName} đã thiết lập các quy định sau. Bạn cần đồng ý với các nội quy này để tham gia.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8"><Spinner /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
             <ShieldAlert className="w-10 h-10 mb-3 opacity-20" />
             <p>Nhóm này chưa thiết lập nội quy cụ thể.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4 mt-2">
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <div key={rule.id || index} className="bg-muted/30 p-3 rounded-lg border">
                  <h4 className="font-semibold text-foreground/90">
                    {index + 1}. {rule.title}
                  </h4>
                  {rule.description && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {rule.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button onClick={() => {
            onAgree();
            onClose();
          }}>
            Đồng ý và Tham gia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
