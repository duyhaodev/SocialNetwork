import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Globe, Shield, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import groupApi from "@/api/groupApi";
import postApi from "@/api/postApi";
import { PostCard } from "@/components/PostCard/PostCard";
import CreatePost from "@/components/CreatePost/CreatePost";
import { PendingMembersModal } from "./components/PendingMembersModal";
import { Users, Plus, LogOut } from "lucide-react";
import { useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GroupMembersTab } from "./components/GroupMembersTab";
import { motion } from "framer-motion";


export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [showPendingMembers, setShowPendingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const currentUser = useSelector((s) => s.user.profile) ?? {};

  const fetchGroupDetails = async () => {
    try {
      const res = await groupApi.getGroupDetails(groupId);
      if (res.code === 1000) {
        setGroup(res.result);
        const role = res.result.currentUserRole;
        if (role === 'ADMIN' || role === 'MODERATOR' || role === 'MEMBER') {
          setIsMember(true);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải thông tin nhóm");
    }
  };

  const fetchGroupPosts = async () => {
    try {
      const res = await postApi.getGroupPosts(groupId);
      if (res.code === 1000) {
        setPosts(res.result);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPendingPosts = async () => {
    try {
      const res = await postApi.getPendingGroupPosts(groupId);
      if (res.code === 1000) {
        setPendingPosts(res.result);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchGroupDetails(), fetchGroupPosts(), fetchPendingPosts()]).finally(() => {
      setLoading(false);
    });
  }, [groupId]);

  const handleJoinGroup = async () => {
    try {
      const res = await groupApi.joinGroup(groupId);
      if (res.code === 1000) {
        toast.success("Đã gửi yêu cầu tham gia!");
        fetchGroupDetails();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tham gia nhóm");
    }
  };

  const handleWithdrawRequest = async () => {
    try {
      const res = await groupApi.leaveGroup(groupId);
      if (res.code === 1000) {
        toast.success("Đã thu hồi yêu cầu tham gia!");
        fetchGroupDetails();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi thu hồi yêu cầu");
    }
  };

  const handleApprovePost = async (postId, status) => {
    try {
      await postApi.updatePostStatus(postId, status);
      toast.success("Cập nhật bài viết thành công!");
      fetchPendingPosts();
      fetchGroupPosts();
    } catch (error) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn rời nhóm?")) return;
    try {
      const res = await groupApi.leaveGroup(groupId);
      if (res.code === 1000) {
        toast.success("Đã rời nhóm thành công!");
        fetchGroupDetails();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi rời nhóm");
    }
  };

  const handleDisbandGroup = async () => {
    if (!window.confirm("Hành động này không thể hoàn tác. Bạn có chắc chắn muốn giải tán nhóm này? Toàn bộ dữ liệu sẽ bị xóa.")) return;
    try {
      const res = await groupApi.disbandGroup(groupId);
      if (res.code === 1000) {
        toast.success("Đã giải tán nhóm thành công!");
        navigate("/activity"); // Or wherever makes sense
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi giải tán nhóm");
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
  if (!group) return <div className="text-center p-8">Không tìm thấy nhóm</div>;

  return (
    <div className="w-full max-w-4xl mx-auto pb-16">
      {/* Cover Image */}
      <div className="w-full h-48 md:h-64 bg-gradient-to-r from-primary/20 to-primary/10 relative">
        {group.coverImageUrl && (
          <img src={group.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Group Header Info */}
      <div className="px-4 md:px-8 py-6 w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{group.name}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 font-medium">
          {group.privacy === 'PUBLIC' ? <Globe className="w-4 h-4"/> : <Shield className="w-4 h-4"/>}
          {group.privacy === 'PUBLIC' ? "Nhóm Công khai" : "Nhóm Riêng tư"}
        </div>
        <h2 className="text-lg text-foreground/80 mb-6">
          {group.description || "Chưa có mô tả chi tiết cho nhóm này."}
        </h2>
        
        <div className="flex justify-end gap-3">
          {group.currentUserRole === 'NONE' && (
            <Button onClick={handleJoinGroup} size="lg" className="font-semibold px-8">
              Tham gia
            </Button>
          )}
          {group.currentUserRole === 'PENDING' && (
            <Button size="lg" variant="secondary" className="font-semibold px-8 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={handleWithdrawRequest}>
              Thu hồi yêu cầu
            </Button>
          )}
          {(group.currentUserRole === 'MEMBER' || group.currentUserRole === 'MODERATOR') && (
            <Button size="lg" variant="outline" className="font-semibold px-8 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={handleLeaveGroup}>
              Rời nhóm
            </Button>
          )}
          {group.currentUserRole === 'ADMIN' && (
            <Button size="lg" variant="destructive" className="font-semibold px-8" onClick={handleDisbandGroup}>
              Giải tán nhóm
            </Button>
          )}

          {(group.currentUserRole === 'ADMIN' || group.currentUserRole === 'MODERATOR') && (
            <Button 
              size="lg" 
              variant="default" 
              className="font-semibold px-6 gap-2 bg-zinc-800 hover:bg-zinc-700 text-white"
              onClick={() => setShowPendingMembers(true)}
            >
              <Users className="w-5 h-5" /> Duyệt thành viên
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="px-4 md:px-8 mt-4 border-t pt-4">
        {(() => {
          const isAdminOrMod = group.currentUserRole === 'ADMIN' || group.currentUserRole === 'MODERATOR';
          const colsClass = isAdminOrMod ? "grid-cols-3" : "grid-cols-2";
          const indicatorWidth = isAdminOrMod ? "w-[calc(33.333%-4px)]" : "w-[calc(50%-4px)]";
          
          let xValue = "0";
          if (activeTab === "members") {
            xValue = "100%";
          } else if (activeTab === "pending") {
            xValue = "200%";
          }

          return (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center w-full border-b border-border/20 py-2.5 bg-background/30 backdrop-blur-sm sticky top-14 z-10 px-4 mb-4">
                <TabsList className={`bg-muted/40 border border-border/40 rounded-full p-1 h-10 w-full max-w-[480px] grid ${colsClass} relative overflow-hidden`}>
                  <TabsTrigger
                    value="feed"
                    className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
                  >
                    Bảng tin
                  </TabsTrigger>
                  <TabsTrigger
                    value="members"
                    className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
                  >
                    Thành viên
                  </TabsTrigger>
                  {isAdminOrMod && (
                    <TabsTrigger
                      value="pending"
                      className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
                    >
                      Chờ duyệt {pendingPosts.length > 0 && `(${pendingPosts.length})`}
                    </TabsTrigger>
                  )}

                  {/* Sliding Indicator background pill */}
                  <div className={`absolute inset-1 ${indicatorWidth} h-[calc(100%-8px)] pointer-events-none z-0`}>
                    <motion.div
                      className="w-full h-full bg-foreground rounded-full shadow-sm"
                      animate={{ x: xValue }}
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  </div>
                </TabsList>
              </div>

              <TabsContent value="feed">
                {!isMember && group.privacy === 'PRIVATE' ? (
                  <div className="text-center p-8 text-muted-foreground border rounded-lg bg-muted/20 w-full">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    Đây là nhóm riêng tư. Bạn cần tham gia để xem bài viết.
                  </div>
                ) : (
                  <div className="space-y-6 w-full">
                    {isMember && (
                      <div className="mb-4">
                        <CreatePost isInline={true} groupId={groupId} onOpenChange={() => fetchGroupPosts()} />
                      </div>
                    )}
                    {posts.length === 0 ? (
                      <p className="text-muted-foreground text-center p-8 border rounded-lg">Chưa có bài viết nào.</p>
                    ) : (
                      posts.map(post => <PostCard key={post.id} post={post} />)
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pending">
                <div className="space-y-4 w-full">
                  {pendingPosts.length === 0 ? (
                    <p className="text-muted-foreground text-center p-8 border rounded-lg">Không có bài viết chờ duyệt.</p>
                  ) : (
                    pendingPosts.map(post => (
                      <div key={post.id} className="relative border rounded-lg">
                        <PostCard post={post} />
                        {/* Overlay Action buttons for admin */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleApprovePost(post.id, 'REJECTED')}>
                            <X className="w-4 h-4 mr-1" /> Từ chối
                          </Button>
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApprovePost(post.id, 'APPROVED')}>
                            <Check className="w-4 h-4 mr-1" /> Phê duyệt
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="members">
                <GroupMembersTab groupId={groupId} currentUserRole={group.currentUserRole} />
              </TabsContent>
            </Tabs>
          );
        })()}
      </div>

      <PendingMembersModal 
        isOpen={showPendingMembers} 
        onClose={() => {
          setShowPendingMembers(false);
          // Refresh after closing modal to see if there are any changes
          fetchGroupPosts();
        }} 
        groupId={groupId} 
      />
    </div>
  );
}
