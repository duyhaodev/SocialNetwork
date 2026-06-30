import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserHoverCard } from "@/components/UserHoverCard/UserHoverCard";
import groupApi from "@/api/groupApi";
import userApi from "@/api/userApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function PendingMembersModal({ isOpen, onClose, groupId }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && groupId) {
      fetchPendingMembers();
    }
  }, [isOpen, groupId]);

  const fetchPendingMembers = async () => {
    try {
      setIsLoading(true);
      // Get list of user IDs
      const res = await groupApi.getPendingMembers(groupId);
      const userIds = res.result || [];
      
      if (userIds.length > 0) {
        // Fetch profiles
        const profilesRes = await userApi.getUsersBatch(userIds);
        setPendingUsers(profilesRes.result || []);
      } else {
        setPendingUsers([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách chờ duyệt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      await groupApi.approveMember(groupId, userId);
      toast.success("Đã duyệt thành viên");
      setPendingUsers((prev) => prev.filter((user) => user.userId !== userId));
    } catch (error) {
      toast.error("Duyệt thất bại");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-950/90 backdrop-blur-xl border border-white/10 text-white rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Duyệt thành viên</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">
              Không có yêu cầu tham gia nào
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <div key={user.userId} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarImage src={user.avatarUrl} style={{ objectFit: "cover" }} />
                      <AvatarFallback>{user.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <UserHoverCard username={user.username}>
                        <p className="font-semibold text-sm cursor-pointer hover:underline inline-block">{user.fullName}</p>
                      </UserHoverCard>
                      <p className="text-xs text-zinc-400">@{user.username}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-white text-black hover:bg-zinc-200 rounded-xl"
                    onClick={() => handleApprove(user.userId)}
                  >
                    Duyệt
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
