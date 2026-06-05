import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Archive, ArrowLeft, Calendar } from "lucide-react";
import {
    fetchArchive,
    resetArchive,
    selectArchive,
    selectArchiveLoading,
    selectArchivePage,
    selectArchiveHasMore,
} from "../../store/storySlice";
import { selectUser } from "../../store/userSlice";
import StoryViewer from "../../components/Story/StoryViewer";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Spinner } from "@/components/ui/spinner";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 20;

export default function StoryArchivePage() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentUser = useSelector(selectUser);
    const archive = useSelector(selectArchive);
    const loading = useSelector(selectArchiveLoading);
    const page = useSelector(selectArchivePage);
    const hasMore = useSelector(selectArchiveHasMore);

    const [viewerState, setViewerState] = useState(null);
    const loadMoreRef = useRef(null);
    const loadDelayRef = useRef(null);

    // Load trang đầu khi mount, reset khi unmount
    useEffect(() => {
        dispatch(resetArchive());
        dispatch(fetchArchive({ page: 0, size: PAGE_SIZE }));
        return () => {
            dispatch(resetArchive());
            if (loadDelayRef.current) clearTimeout(loadDelayRef.current);
        };
    }, [dispatch]);

    // IntersectionObserver — giống FeedPage
    useEffect(() => {
        if (!hasMore || loading) return;
        const el = loadMoreRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting) return;
                if (loading || !hasMore) return;
                if (loadDelayRef.current) return;

                loadDelayRef.current = setTimeout(() => {
                    dispatch(fetchArchive({ page, size: PAGE_SIZE }));
                    loadDelayRef.current = null;
                }, 300);
            },
            { root: null, threshold: 0.1 }
        );

        observer.observe(el);
        return () => {
            observer.disconnect();
            if (loadDelayRef.current) {
                clearTimeout(loadDelayRef.current);
                loadDelayRef.current = null;
            }
        };
    }, [hasMore, loading, page, dispatch]);

    const openViewer = (storyIndex) => {
        setViewerState({
            groups: [{
                userId: currentUser?.userId,
                username: currentUser?.username,
                fullName: currentUser?.fullName,
                avatarUrl: currentUser?.avatarUrl,
                stories: archive,
                hasUnviewed: false,
            }],
            startIndex: 0,
            storyIndex,
        });
    };

    const getThumbnail = (story) => story.mediaUrl || null;
    const isInitialLoad = loading && archive.length === 0;

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="border-b border-border p-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-foreground transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-semibold">Archive Story</h2>
                </div>
            </div>

            {/* Content */}
            <div className="px-4 py-6">
                {isInitialLoad ? (
                    <div className="flex justify-center py-20">
                        <Spinner />
                    </div>
                ) : archive.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <Archive className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">Your archive is empty</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Stories that expire after 24 hours are automatically saved here
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-2">
                            {archive.map((story, index) => (
                                <button
                                    key={story.id}
                                    onClick={() => openViewer(index)}
                                    className="relative aspect-[9/16] rounded-xl overflow-hidden bg-muted hover:opacity-90 transition-opacity group"
                                >
                                    {getThumbnail(story) ? (
                                        <img
                                            src={getThumbnail(story)}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-full"
                                            style={{ background: story.backgroundColor || "#1a1a2e" }}
                                        />
                                    )}

                                    {story.mediaType === "TEXT" && story.textContent && (
                                        <div className="absolute inset-0 flex items-center justify-center p-3">
                                            <p
                                                className="text-white text-xs text-center break-words line-clamp-4 leading-relaxed"
                                                style={{ fontWeight: 700 }}
                                            >
                                                {story.textContent}
                                            </p>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-white/70 flex-shrink-0" />
                                        <span className="text-white/80 text-[10px] truncate">
                                            {formatDistanceToNow(new Date(story.createdAt), {
                                                addSuffix: true,
                                                locale: vi,
                                            })}
                                        </span>
                                    </div>

                                    {story.musicTitle && (
                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                                            <span className="text-[10px]">♪</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Load more sentinel */}
                        <div className="p-4 text-center">
                            {loading && hasMore && (
                                <span className="text-muted-foreground text-sm">Loading...</span>
                            )}
                            {hasMore && <div ref={loadMoreRef} className="h-1" />}
                            {!hasMore && !loading && (
                                <span className="text-muted-foreground text-sm">You've seen it all</span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Viewer */}
            {viewerState && (
                <StoryViewer
                    groups={viewerState.groups}
                    startIndex={0}
                    initialStoryIndex={viewerState.storyIndex}
                    onClose={() => setViewerState(null)}
                />
            )}
        </div>
    );
}
