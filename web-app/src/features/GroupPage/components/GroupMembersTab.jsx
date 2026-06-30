import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserHoverCard } from "@/components/UserHoverCard/UserHoverCard";
import groupApi from "@/api/groupApi";
import userApi from "@/api/userApi";
import { toast } from "sonner";
import { Loader2, Search, UserMinus, ArrowUpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function GroupMembersTab({ groupId, currentUserRole }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (groupId) {
      fetchMembers();
    }
  }, [groupId]);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const res = await groupApi.getActiveMembers(groupId);
      const memberData = res.result || [];
      
      if (memberData.length > 0) {
        const userIds = memberData.map(m => m.userId);
        const profilesRes = await userApi.getUsersBatch(userIds);
        const profiles = profilesRes.result || [];
        
        // Merge profile with role
        const mergedMembers = memberData.map(m => {
          const profile = profiles.find(p => p.userId === m.userId) || {};
          return { ...profile, role: m.role };
        });
        
        // Sort: ADMIN first, then MODERATOR, then MEMBER
        const roleOrder = { "ADMIN": 1, "MODERATOR": 2, "MEMBER": 3 };
        mergedMembers.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
        
        setMembers(mergedMembers);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải danh sách thành viên");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKickMember = async (userId) => {
    if (!window.confirm("Bạn có chắc chắn muốn mời người này ra khỏi nhóm?")) return;
    
    try {
      await groupApi.kickMember(groupId, userId);
      toast.success("Đã xóa khỏi nhóm");
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa thành viên");
    }
  };

  const handlePromoteMod = async (userId) => {
    if (!window.confirm("Thăng cấp người này làm Kiểm duyệt viên?")) return;
    
    try {
      await groupApi.promoteToModerator(groupId, userId);
      toast.success("Thăng cấp thành công!");
      fetchMembers(); // reload list
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi thăng cấp");
    }
  };

  const filteredMembers = members.filter(m => 
    m.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canKick = (targetRole) => {
    if (currentUserRole === 'ADMIN') {
      return targetRole === 'MODERATOR' || targetRole === 'MEMBER';
    }
    if (currentUserRole === 'MODERATOR') {
      return targetRole === 'MEMBER';
    }
    return false;
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">Quản trị viên</Badge>;
      case 'MODERATOR':
        return <Badge variant="secondary" className="bg-purple-500/20 text-purple-600 hover:bg-purple-500/30">Kiểm duyệt viên</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full bg-white/5 border rounded-2xl p-4 md:p-6 mt-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-bold">Thành viên ({members.length})</h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="Tìm kiếm thành viên..." 
            className="pl-9 bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center text-zinc-500 py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl">
            Không tìm thấy thành viên nào.
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div key={member.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 border">
                  <AvatarImage src={member.avatarUrl} style={{ objectFit: "cover" }} />
                  <AvatarFallback>{member.fullName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <UserHoverCard username={member.username}>
                      <p className="font-bold text-base cursor-pointer hover:underline">{member.fullName}</p>
                    </UserHoverCard>
                    {getRoleBadge(member.role)}
                  </div>
                  <p className="text-sm text-zinc-500">@{member.username}</p>
                </div>
              </div>
              
              {canKick(member.role) && (
                <div className="flex gap-2 self-start sm:self-auto">
                  {currentUserRole === 'ADMIN' && member.role === 'MEMBER' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-blue-200"
                      onClick={() => handlePromoteMod(member.userId)}
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-2" />
                      Thăng cấp Mod
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                    onClick={() => handleKickMember(member.userId)}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Mời ra
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
