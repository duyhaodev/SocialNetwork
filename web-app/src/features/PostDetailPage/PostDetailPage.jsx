import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { PostCard } from "@/components/PostCard/PostCard.jsx";
import { PostComments } from "@/components/PostComments/PostComments.jsx";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { fetchPostById, selectPostDetail, selectPostDetailLoading, selectPostDetailError, } from "../../store/postsSlice"; // đường dẫn tuỳ cấu trúc của bạn

export function PostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const post = useSelector(selectPostDetail);
  const loading = useSelector(selectPostDetailLoading);
  const error = useSelector(selectPostDetailError);

  // ======== LOAD POST ========
  useEffect(() => {
    if (!postId) return;
    dispatch(fetchPostById(postId));
  }, [postId, dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const handleProfileClick = (username) => {
    if (!username) return;
    navigate(`/profile/@${username}`);
  };

  if (loading && !post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto border-x min-h-screen">
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-semibold">Thread</span>
        </div>
        <div className="p-4 text-sm text-muted-foreground">
          Post not found.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto border-x min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="font-semibold">Thread</span>
      </div>

      {/* Bài viết */}
      <PostCard post={post} onProfileClick={handleProfileClick} />

      {/* Comment */}
      <PostComments postId={post.repostOfId ?? post.id} onProfileClick={handleProfileClick} onCommentCreated={() => dispatch(fetchPostById(post.id))}/>
    </div>
  );
}

export default PostDetailPage;
