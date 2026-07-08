import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import { Image as ImageIcon, EyeOff, Eye, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Textarea } from '../../components/ui/textarea';
import { ImageViewer } from '../../components/ImageViewer/ImageViewer';

const HIDE_REASONS = [
  "Spam or unauthorized advertising",
  "Hate speech or harassment",
  "Misinformation",
  "Violates community standards",
  "Other"
];

const AdminPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Hide reason dialog state
  const [hideModalOpen, setHideModalOpen] = useState(false);
  const [hideTargetId, setHideTargetId] = useState(null);
  const [hideReason, setHideReason] = useState("Violates community standards");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllPosts(0, 50);
      if (res.result && res.result.content) {
        setPosts(res.result.content);
      }
    } catch (error) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const openHideModal = (e, postId) => {
    e.stopPropagation();
    setHideTargetId(postId);
    setHideReason("Violates community standards");
    setCustomReason("");
    setHideModalOpen(true);
  };

  const handleConfirmHide = async () => {
    let finalReason = hideReason;
    if (hideReason === "Other") {
      finalReason = customReason.trim();
    }
    if (!finalReason) {
      toast.error("Please select or enter a reason");
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.hidePost(hideTargetId, finalReason);
      toast.success("Post hidden");
      setHideModalOpen(false);
      fetchPosts();
    } catch (error) {
      toast.error("Failed to hide post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnhidePost = async (e, postId) => {
    e.stopPropagation();
    try {
      await adminApi.unhidePost(postId);
      toast.success("Post restored");
      fetchPosts();
    } catch (error) {
      toast.error("Failed to restore post");
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading posts...</div>;
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full text-left border-collapse table-fixed">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="p-4 font-semibold text-sm w-16">ID</th>
            <th className="p-4 font-semibold text-sm w-32">User ID</th>
            <th className="p-4 font-semibold text-sm">Content Preview</th>
            <th className="p-4 font-semibold text-sm w-56">Reason</th>
            <th className="p-4 font-semibold text-sm w-32 text-center">Status</th>
            <th className="p-4 font-semibold text-sm w-24 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {posts.map(post => (
            <tr
              key={post.id}
              className="hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => setSelectedPost(post)}
            >
              <td className="p-4 text-xs font-mono text-muted-foreground truncate max-w-[100px]">
                {post.id}
              </td>
              <td className="p-4 text-xs font-mono text-muted-foreground truncate max-w-[100px]">
                {post.userId}
              </td>
              <td className="p-4">
                <p className="text-sm line-clamp-2">{post.content || <span className="italic text-muted-foreground">No content</span>}</p>
                <div className="text-xs text-muted-foreground mt-1 flex items-center space-x-2">
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <span className="flex items-center text-blue-500"><ImageIcon className="w-3 h-3 mr-1" /> {post.mediaUrls.length} Media</span>
                  )}
                </div>
              </td>
              <td className="p-4 w-56 align-middle">
                {post.statusReason
                  ? <span className="text-xs text-orange-400">{post.statusReason}</span>
                  : <span className="text-xs text-muted-foreground">—</span>
                }
              </td>
              <td className="p-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                    {post.status}
                  </span>
                </div>
              </td>              <td className="p-4 text-center">
                {post.status === 'HIDDEN' ? (
                  <button
                    onClick={(e) => handleUnhidePost(e, post.id)}
                    className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                    title="Restore post"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => openHideModal(e, post.id)}
                    className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-lg transition-colors"
                    title="Hide post"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {posts.length === 0 && (
            <tr>
              <td colSpan="6" className="text-center p-8 text-muted-foreground">No posts found</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Hide Reason Modal */}
      <Dialog open={hideModalOpen} onOpenChange={setHideModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <AlertCircle className="w-5 h-5" />
              Hide Post
            </DialogTitle>
            <DialogDescription>
              The post will be hidden for 30 days then permanently deleted. The author will be notified with the reason below.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <Label className="font-semibold text-sm">Select reason to notify the author:</Label>
            <RadioGroup value={hideReason} onValueChange={setHideReason} className="space-y-2">
              {HIDE_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={`hide-reason-${reason}`} />
                  <Label htmlFor={`hide-reason-${reason}`} className="font-normal cursor-pointer text-sm">
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {hideReason === "Other" && (
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
            <Button variant="outline" onClick={() => setHideModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleConfirmHide}
              disabled={submitting}
            >
              {submitting ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && !viewerOpen && setSelectedPost(null)} modal={!viewerOpen}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border"
          onEscapeKeyDown={(e) => { if (viewerOpen) e.preventDefault(); }}
        >
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription className="text-xs font-mono mt-1">
              Post ID: {selectedPost?.id} <br />
              User: {selectedPost?.fullName || selectedPost?.username || selectedPost?.userId}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <p className="text-sm whitespace-pre-wrap">{selectedPost?.content || <span className="italic text-muted-foreground">No content</span>}</p>
              {selectedPost?.mediaUrls && selectedPost.mediaUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {selectedPost.mediaUrls.map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg border border-border overflow-hidden bg-muted">
                      {url.endsWith('.mp4') ? (
                        <video src={url} className="w-full h-full object-cover" controls />
                      ) : (
                        <img
                          src={url}
                          alt={`Media ${i}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => { setViewerIndex(i); setViewerOpen(true); }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer */}
      {selectedPost?.mediaUrls && (
        <ImageViewer
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          mediaList={selectedPost.mediaUrls.map(url => ({
            mediaUrl: url,
            mediaType: url.endsWith('.mp4') ? 'video' : 'image'
          }))}
          index={viewerIndex}
        />
      )}
    </div>
  );
};

export default AdminPosts;
