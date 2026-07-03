import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserHoverCard } from "@/components/UserHoverCard/UserHoverCard";
import groupApi from "@/api/groupApi";
import userApi from "@/api/userApi";
import { toast } from "sonner";
import { Loader2, Search, UserMinus, ArrowUpCircle, ShieldBan, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function GroupMembersTab({ groupId, currentUserRole }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [bannedMembers, setBannedMembers] = useState([]);
  const [isLoadingBanned, setIsLoadingBanned] = useState(false);

  useEffect(() => {
    if (groupId) {
      if (activeTab === "active") {
        fetchMembers();
      } else if (activeTab === "banned") {
        fetchBannedMembers();
      }
    }
  }, [groupId, activeTab]);

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
      if (error.response?.status === 403 || error.response?.status === 400 || error.response?.status === 500) {
        setIsForbidden(true);
      } else {
        setIsForbidden(true); // Treat general fetch errors as permission denied to avoid toast
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBannedMembers = async () => {
    try {
      setIsLoadingBanned(true);
      const res = await groupApi.getBannedMembers(groupId);
      const memberData = res.result || [];
      if (memberData.length > 0) {
        const userIds = memberData.map(m => m.userId);
        const profilesRes = await userApi.getUsersBatch(userIds);
        const profiles = profilesRes.result || [];
        const mergedMembers = memberData.map(m => {
          const profile = profiles.find(p => p.userId === m.userId) || {};
          return { ...profile, role: m.role };
        });
        setBannedMembers(mergedMembers);
      } else {
        setBannedMembers([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingBanned(false);
    }
  };

  const handleKickMember = async (userId) => {
    try {
      await groupApi.kickMember(groupId, userId);
      toast.success("Đã xóa khỏi nhóm");
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa thành viên");
    }
  };

  const handleBanMember = async (userId) => {
    try {
      await groupApi.banMember(groupId, userId);
      toast.success("Đã chặn người dùng khỏi nhóm");
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi chặn thành viên");
    }
  };

  const handleUnbanMember = async (userId) => {
    try {
      await groupApi.unbanMember(groupId, userId);
      toast.success("Đã gỡ chặn thành viên");
      setBannedMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi gỡ chặn");
    }
  };

  const handlePromoteMod = async (userId) => {
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

  const filteredBannedMembers = bannedMembers.filter(m => 
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
        <div className="flex gap-4">
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
      </div>

      {(currentUserRole === 'ADMIN' || currentUserRole === 'MODERATOR') && (
        <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
          <button
            onClick={() => setActiveTab("active")}
            className={`pb-3 font-semibold px-2 transition-colors ${activeTab === "active" ? "border-b-2 border-primary text-primary" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"}`}
          >
            Đang hoạt động
          </button>
          <button
            onClick={() => setActiveTab("banned")}
            className={`pb-3 font-semibold px-2 transition-colors ${activeTab === "banned" ? "border-b-2 border-red-500 text-red-500" : "text-zinc-500 hover:text-red-400"}`}
          >
            Đã chặn
          </button>
        </div>
      )}

      {activeTab === "active" ? (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
        ) : isForbidden ? (
          <div className="text-center text-zinc-500 py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl">
            Chỉ thành viên mới được xem danh sách này.
          </div>
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-blue-200"
                        >
                          <ArrowUpCircle className="w-4 h-4 mr-2" />
                          Thăng cấp Mod
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Thăng cấp Kiểm duyệt viên?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bạn có chắc chắn muốn thăng cấp <b>{member.fullName}</b> làm Kiểm duyệt viên không? Họ sẽ có quyền duyệt thành viên và duyệt bài viết.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handlePromoteMod(member.userId)} className="bg-blue-500 hover:bg-blue-600 text-white">Xác nhận thăng cấp</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Mời ra
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Mời ra khỏi nhóm?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc chắn muốn xóa <b>{member.fullName}</b> khỏi nhóm này không?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleKickMember(member.userId)} className="bg-red-500 hover:bg-red-600 text-white">Xác nhận mời ra</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  {/* Ban Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                        title="Chặn khỏi nhóm"
                      >
                        <ShieldBan className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Chặn khỏi nhóm?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc chắn muốn chặn <b>{member.fullName}</b> khỏi nhóm này không? Họ sẽ bị xóa khỏi nhóm và không thể tìm thấy hoặc tham gia lại nhóm.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleBanMember(member.userId)} className="bg-red-500 hover:bg-red-600 text-white">Xác nhận chặn</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {isLoadingBanned ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
          ) : filteredBannedMembers.length === 0 ? (
            <div className="text-center text-zinc-500 py-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl">
              Không có thành viên nào bị chặn.
            </div>
          ) : (
            filteredBannedMembers.map((member) => (
              <div key={member.userId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-xl transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 border border-red-200">
                    <AvatarImage src={member.avatarUrl} style={{ objectFit: "cover" }} />
                    <AvatarFallback>{member.fullName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <UserHoverCard username={member.username}>
                        <p className="font-bold text-base cursor-pointer text-red-700 dark:text-red-400 hover:underline">{member.fullName}</p>
                      </UserHoverCard>
                      <Badge variant="destructive">Đã chặn</Badge>
                    </div>
                    <p className="text-sm text-red-500/70">@{member.username}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 self-start sm:self-auto">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-zinc-700 border-zinc-300 hover:bg-zinc-100 dark:text-zinc-300 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Undo2 className="w-4 h-4 mr-2" />
                        Gỡ chặn
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Gỡ chặn thành viên?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Bạn có chắc chắn muốn gỡ chặn <b>{member.fullName}</b> không? Họ sẽ có thể tìm thấy nhóm và gửi yêu cầu tham gia lại.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleUnbanMember(member.userId)} className="bg-zinc-900 hover:bg-zinc-800 text-white">Xác nhận gỡ chặn</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
