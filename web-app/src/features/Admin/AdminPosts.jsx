import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const AdminPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await adminApi.deletePost(postId);
        toast.success("Post deleted");
        fetchPosts();
      } catch (error) {
        toast.error("Failed to delete post");
      }
    }
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
            <tr key={post.id} className="hover:bg-muted/20 transition-colors">
              <td className="p-4 text-xs font-mono text-muted-foreground truncate max-w-[100px]">
                {post.id}
              </td>
              <td className="p-4 text-xs font-mono text-muted-foreground truncate max-w-[100px]">
                {post.userId}
              </td>
              <td className="p-4">
                <p className="text-sm line-clamp-2">{post.content || <span className="italic text-muted-foreground">No content</span>}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(post.createdAt).toLocaleString()}
                </div>
              </td>
              <td className="p-4 text-center">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                  {post.status}
                </span>
              </td>
              <td className="p-4 text-center">
                <button
                  onClick={() => handleDeletePost(post.id)}
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
    </div>
  );
};

export default AdminPosts;
