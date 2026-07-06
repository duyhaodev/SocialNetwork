import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import { Trash2, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';

const AdminPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postComments, setPostComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

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

  const handleDeletePost = (e, postId) => {
    e.stopPropagation(); // Ngăn sự kiện click row
    toast("Are you sure you want to delete this post?", {
      action: {
        label: 'Confirm',
        onClick: async () => {
          try {
            await adminApi.deletePost(postId);
            toast.success("Post deleted");
            fetchPosts();
          } catch (error) {
            toast.error("Failed to delete post");
          }
        }
      },
      cancel: {
        label: 'Cancel'
      },
      duration: 5000,
    });
  };

  const handlePostClick = async (post) => {
    setSelectedPost(post);
    setLoadingComments(true);
    try {
      const res = await adminApi.getPostComments(post.id, 0, 50);
      if (res.result) {
        setPostComments(res.result);
      } else {
        setPostComments([]);
      }
    } catch (e) {
      toast.error('Failed to load comments');
      setPostComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    toast("Are you sure you want to delete this comment?", {
      action: {
        label: 'Confirm',
        onClick: async () => {
          try {
            await adminApi.deleteComment(commentId);
            toast.success("Comment deleted");
            // Tải lại danh sách comments
            if (selectedPost) {
              const res = await adminApi.getPostComments(selectedPost.id, 0, 50);
              if (res.result) setPostComments(res.result);
            }
          } catch (e) {
            toast.error("Failed to delete comment");
          }
        }
      },
      cancel: {
        label: 'Cancel'
      },
      duration: 5000,
    });
  };

  if (loading) {
    return <div className="text-center py-10">Loading posts...</div>;
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="p-4 font-semibold text-sm w-16">ID</th>
            <th className="p-4 font-semibold text-sm w-32">User ID</th>
            <th className="p-4 font-semibold text-sm">Content Preview</th>
            <th className="p-4 font-semibold text-sm w-32 text-center">Status</th>
            <th className="p-4 font-semibold text-sm w-24 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {posts.map(post => (
            <tr 
              key={post.id} 
              className="hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => handlePostClick(post)}
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
              <td className="p-4 text-center">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                  {post.status}
                </span>
              </td>
              <td className="p-4 text-center">
                <button
                  onClick={(e) => handleDeletePost(e, post.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Delete Post"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {posts.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center p-8 text-muted-foreground">No posts found</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-border">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription className="text-xs font-mono mt-1">
              Post ID: {selectedPost?.id} <br />
              User ID: {selectedPost?.userId}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Post Content */}
            <div>
              <p className="text-sm whitespace-pre-wrap">{selectedPost?.content || <span className="italic text-muted-foreground">No content</span>}</p>
              
              {/* Post Media */}
              {selectedPost?.mediaUrls && selectedPost.mediaUrls.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {selectedPost.mediaUrls.map((url, i) => (
                    <div key={i} className="aspect-square rounded-lg border border-border overflow-hidden bg-muted">
                      {url.endsWith('.mp4') ? (
                        <video src={url} className="w-full h-full object-cover" controls />
                      ) : (
                        <img src={url} alt={`Media ${i}`} className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-border" />

            {/* Comments Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Comments ({postComments.length})</h3>
              </div>
              
              {loadingComments ? (
                <div className="text-center py-4 text-muted-foreground text-sm">Loading comments...</div>
              ) : postComments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm border border-dashed border-border rounded-lg">No comments found</div>
              ) : (
                <div className="space-y-4">
                  {postComments.map(comment => (
                    <div key={comment.id} className="bg-muted/30 p-4 rounded-lg border border-border flex justify-between group">
                      <div className="flex-1 mr-4">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-sm">{comment.author?.fullName || comment.userId}</span>
                          <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className={`text-sm ${comment.content === 'Bình luận đã bị ẩn bởi Quản trị viên' ? 'text-red-500 italic' : ''}`}>
                          {comment.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-2 h-fit rounded-lg hover:bg-destructive/10"
                        title="Delete Comment"
                        disabled={comment.content === 'Bình luận đã bị ẩn bởi Quản trị viên'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPosts;
