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
import { EditGroupModal } from "./components/EditGroupModal";
import { Users, Plus, LogOut, Settings } from "lucide-react";
import { useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GroupMembersTab } from "./components/GroupMembersTab";
import { GroupRulesTab } from "./components/GroupRulesTab";
import { JoinGroupRulesModal } from "./components/JoinGroupRulesModal";
import { RejectPostModal } from "./components/RejectPostModal";
import { motion } from "framer-motion";
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


export function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [pendingMembersCount, setPendingMembersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [showPendingMembers, setShowPendingMembers] = useState(false);
  const [showJoinRulesModal, setShowJoinRulesModal] = useState(false);
  const [isEditGroupOpen, setIsEditGroupOpen] = useState(false);
  const [postToReject, setPostToReject] = useState(null);
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

  const fetchPendingMembers = async () => {
    try {
      const res = await groupApi.getPendingMembers(groupId);
      if (res.code === 1000) {
        setPendingMembersCount(res.result?.length || 0);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchGroupDetails(), fetchGroupPosts(), fetchPendingPosts(), fetchPendingMembers()]).finally(() => {
      setLoading(false);
    });
  }, [groupId]);

  useEffect(() => {
    if (activeTab === "pending") {
      fetchPendingPosts();
    }
  }, [activeTab]);

  const handleJoinGroup = async () => {
    try {
      const res = await groupApi.joinGroup(groupId);
      if (res.code === 1000) {
        toast.success("Đã gửi yêu cầu tham gia!");
        window.dispatchEvent(new Event('groupListChanged'));
        fetchGroupDetails();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tham gia nhóm");
    }
  };

  const handleJoinGroupClick = async () => {
    try {
      const res = await groupApi.getGroupRules(groupId);
      if (res.code === 1000 && res.result && res.result.length > 0) {
        setShowJoinRulesModal(true);
      } else {
        handleJoinGroup();
      }
    } catch (error) {
      handleJoinGroup();
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

  const handleApprovePost = async (postId, status, reason = null) => {
    try {
      await postApi.updatePostStatus(postId, status, reason);
      toast.success(status === 'APPROVED' ? "Phê duyệt bài viết thành công!" : "Đã từ chối bài viết!");
      fetchPendingPosts();
      if (status === 'APPROVED') {
        fetchGroupPosts();
      }
      setPostToReject(null);
    } catch (error) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const res = await groupApi.leaveGroup(groupId);
      if (res.code === 1000) {
        toast.success("Đã rời nhóm thành công!");
        window.dispatchEvent(new Event('groupListChanged'));
        fetchGroupDetails();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi rời nhóm");
    }
  };

  const handleDisbandGroup = async () => {
    try {
      const res = await groupApi.disbandGroup(groupId);
      if (res.code === 1000) {
        toast.success("Đã giải tán nhóm thành công!");
        window.dispatchEvent(new Event('groupListChanged'));
        navigate("/activity"); // Or wherever makes sense
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi giải tán nhóm");
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;
  if (!group) return <div className="text-center p-8">Không tìm thấy nhóm</div>;

  if (group.currentUserRole === 'BANNED') {
    return (
      <div className="w-full max-w-4xl mx-auto py-20 px-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-red-500 mb-4">Bạn đã bị chặn khỏi nhóm này</h1>
        <p className="text-muted-foreground text-lg">Bạn không thể xem nội dung hoặc tham gia lại nhóm này.</p>
      </div>
    );
  }

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
            <Button onClick={handleJoinGroupClick} size="lg" className="font-semibold px-8">
              Tham gia
            </Button>
          )}
          {group.currentUserRole === 'PENDING' && (
            <Button size="lg" variant="secondary" className="font-semibold px-8 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={handleWithdrawRequest}>
              Thu hồi yêu cầu
            </Button>
          )}
          {(group.currentUserRole === 'MEMBER' || group.currentUserRole === 'MODERATOR') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" variant="outline" className="font-semibold px-8 hover:bg-red-50 hover:text-red-600 transition-colors">
                  Rời nhóm
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Bạn có chắc chắn muốn rời nhóm?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn sẽ không còn nhận được thông báo hay tham gia các hoạt động trong nhóm này nữa.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveGroup} className="bg-red-500 hover:bg-red-600 text-white">Xác nhận rời nhóm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {group.currentUserRole === 'ADMIN' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="lg" variant="destructive" className="font-semibold px-8">
                  Giải tán nhóm
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Giải tán nhóm?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hành động này không thể hoàn tác. Toàn bộ dữ liệu của nhóm, bao gồm bài viết và thành viên sẽ bị xóa vĩnh viễn.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisbandGroup} className="bg-red-500 hover:bg-red-600 text-white">Tôi chắc chắn, giải tán!</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {group.currentUserRole === 'ADMIN' && (
            <Button 
              size="lg" 
              variant="outline" 
              className="font-semibold px-6 gap-2"
              onClick={() => setIsEditGroupOpen(true)}
            >
              <Settings className="w-5 h-5" /> Cài đặt
            </Button>
          )}

          {(group.currentUserRole === 'ADMIN' || group.currentUserRole === 'MODERATOR') && (
            <div className="relative">
              <Button 
                size="lg" 
                variant="default" 
                className="font-semibold px-6 gap-2 bg-zinc-800 hover:bg-zinc-700 text-white"
                onClick={() => {
                  fetchPendingMembers();
                  setShowPendingMembers(true);
                }}
              >
                <Users className="w-5 h-5" /> Duyệt thành viên
              </Button>
              {pendingMembersCount > 0 && (
                <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-background bg-blue-500 transform translate-x-1/3 -translate-y-1/3 z-10" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="px-4 md:px-8 mt-4 border-t pt-4">
        {(() => {
          const isAdminOrMod = group.currentUserRole === 'ADMIN' || group.currentUserRole === 'MODERATOR';
          const colsClass = isAdminOrMod ? "grid-cols-4" : "grid-cols-3";
          const indicatorWidth = isAdminOrMod ? "w-[calc(25%-4px)]" : "w-[calc(33.333%-4px)]";
          
          let xValue = "0";
          if (activeTab === "members") {
            xValue = "100%";
          } else if (activeTab === "rules") {
            xValue = "200%";
          } else if (activeTab === "pending") {
            xValue = "300%";
          }

          return (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex justify-center w-full border-b border-border/20 py-2.5 bg-background/30 backdrop-blur-sm sticky top-14 z-10 px-4 mb-4">
                <TabsList className={`bg-muted/40 border border-border/40 rounded-full p-1 h-10 w-full max-w-[600px] grid ${colsClass} relative overflow-hidden`}>
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
                  <TabsTrigger
                    value="rules"
                    className="relative z-10 rounded-full text-xs font-semibold h-full transition-colors duration-300 select-none bg-transparent border-none data-[state=active]:text-background dark:data-[state=active]:text-background text-muted-foreground data-[state=active]:bg-transparent dark:data-[state=active]:bg-transparent data-[state=active]:shadow-none cursor-pointer"
                  >
                    Nội quy
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
                      <div className="mb-6">
                        <CreatePost 
                          isInline={true}
                          groupId={groupId} 
                          onOpenChange={() => {
                            fetchGroupPosts();
                            fetchPendingPosts();
                          }}
                        />
                      </div>
                    )}
                    {posts.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">Chưa có bài viết nào.</div>
                    ) : (
                      posts.map((post) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          isGroupAdminOrMod={group.currentUserRole === 'ADMIN' || group.currentUserRole === 'MODERATOR'}
                          onPinToggle={() => fetchGroupPosts()}
                        />
                      ))
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="members" className="m-0 focus-visible:outline-none">
                <GroupMembersTab 
                  groupId={groupId} 
                  currentUserRole={group.currentUserRole}
                />
              </TabsContent>

              <TabsContent value="rules" className="m-0 focus-visible:outline-none">
                <GroupRulesTab 
                  groupId={groupId} 
                  isAdmin={group.currentUserRole === 'ADMIN'}
                  groupName={group.name}
                />
              </TabsContent>

              {isAdminOrMod && (
                <TabsContent value="pending" className="m-0 focus-visible:outline-none">
                  <div className="space-y-4">
                    {pendingPosts.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">Không có bài viết chờ duyệt.</div>
                    ) : (
                      pendingPosts.map((post) => (
                        <div key={post.id} className="relative">
                          <PostCard post={post} />
                          <div className="absolute top-4 right-4 flex gap-2">
                            <Button size="sm" onClick={() => handleApprovePost(post.id, 'APPROVED')} className="bg-green-500 hover:bg-green-600 text-white gap-1">
                              <Check className="w-4 h-4"/> Duyệt
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setPostToReject(post)} className="gap-1">
                              <X className="w-4 h-4"/> Từ chối
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          );
        })()}
      </div>

      <PendingMembersModal 
        isOpen={showPendingMembers} 
        onClose={() => setShowPendingMembers(false)} 
        groupId={groupId}
        onApproveSuccess={() => {
          fetchPendingMembers();
          fetchGroupDetails();
          // also refresh members tab if needed by dispatching an event or relying on websocket
        }}
      />
      <EditGroupModal
        isOpen={isEditGroupOpen}
        onClose={() => setIsEditGroupOpen(false)}
        group={group}
        onSuccess={() => {
          fetchGroupDetails();
        }}
      />
      
      <JoinGroupRulesModal
        isOpen={showJoinRulesModal}
        onClose={() => setShowJoinRulesModal(false)}
        groupId={groupId}
        groupName={group.name}
        onAgree={handleJoinGroup}
      />
      
      <RejectPostModal
        isOpen={!!postToReject}
        onClose={() => setPostToReject(null)}
        onReject={(reason) => {
          if (postToReject) {
            handleApprovePost(postToReject.id, 'REJECTED', reason);
          }
        }}
      />
    </div>
  );
}
