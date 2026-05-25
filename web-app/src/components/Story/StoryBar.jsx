import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { fetchFeedStories, fetchMyStories, selectFeedStories, selectMyStories } from "../../store/storySlice";
import { selectUser } from "../../store/userSlice";
import StoryViewer from "./StoryViewer";
import CreateStoryModal from "./CreateStoryModal";

function groupByUser(stories) {
    const map = new Map();
    for (const story of stories) {
        if (!map.has(story.userId)) {
            map.set(story.userId, {
                userId: story.userId,
                username: story.username,
                fullName: story.fullName,
                avatarUrl: story.avatarUrl,
                stories: [],
                hasUnviewed: false,
            });
        }
        const group = map.get(story.userId);
        group.stories.push(story);
        if (!story.viewedByCurrentUser) group.hasUnviewed = true;
    }
    return Array.from(map.values());
}

export default function StoryBar() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentUser = useSelector(selectUser);
    const feedStories = useSelector(selectFeedStories);
    const myStories = useSelector(selectMyStories);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewerState, setViewerState] = useState(null);

    useEffect(() => {
        dispatch(fetchFeedStories());
        dispatch(fetchMyStories());
    }, [dispatch]);

    const feedGroups = groupByUser(feedStories);
    const openViewer = (groups, index) => setViewerState({ groups, startIndex: index });

    // Lấy thumbnail của story đầu tiên trong group
    const getThumbnail = (story) => {
        if (!story) return null;
        if (story.mediaUrl) return story.mediaUrl;
        return null;
    };

    return (
        <>
            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>

                {/* Card "Tạo tin" */}
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="relative flex-shrink-0 w-28 h-44 rounded-xl overflow-hidden border border-border bg-muted hover:border-primary/50 transition-colors group"
                >
                    {/* Nửa trên: avatar */}
                    <div className="absolute top-0 left-0 right-0 h-[65%] overflow-hidden">
                        {currentUser?.avatarUrl ? (
                            <img
                                src={currentUser.avatarUrl}
                                alt=""
                                className="w-full h-full object-cover object-top scale-150"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10" />
                        )}
                    </div>

                    {/* Gradient overlay dưới */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                    {/* Nút + nằm ở ranh giới giữa ảnh và phần dưới */}
                    <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "calc(65% - 18px)" }}>
                        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center ring-4 ring-background shadow-lg">
                            <Plus className="w-5 h-5 text-primary-foreground" />
                        </div>
                    </div>

                    {/* Label */}
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                        <span className="text-white text-xs font-semibold drop-shadow">Tạo tin</span>
                    </div>
                </button>

                {/* Card "Tin của bạn" */}
                {myStories.length > 0 && (
                    <button
                        onClick={() => openViewer(
                            [{ userId: currentUser?.userId, username: currentUser?.username,
                               fullName: currentUser?.fullName, avatarUrl: currentUser?.avatarUrl,
                               stories: myStories, hasUnviewed: false }],
                            0
                        )}
                        className="relative flex-shrink-0 w-28 h-44 rounded-xl overflow-hidden border border-primary/50 group"
                    >
                        {/* Ảnh nền */}
                        <div className="absolute inset-0 bg-muted">
                            {getThumbnail(myStories[0]) ? (
                                <img src={getThumbnail(myStories[0])} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full" style={{ background: myStories[0]?.backgroundColor || "#1a1a2e" }} />
                            )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {/* Avatar góc trên */}
                        <div className="absolute top-3 left-3">
                            <div className="w-9 h-9 rounded-full ring-2 ring-primary overflow-hidden">
                                <img src={currentUser?.avatarUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                        </div>

                        {/* Tên dưới */}
                        <div className="absolute bottom-3 left-3 right-3">
                            <span className="text-white text-xs font-semibold drop-shadow line-clamp-2">Tin của bạn</span>
                        </div>
                    </button>
                )}

                {/* Cards của người khác */}
                {feedGroups.map((group, index) => (
                    <button
                        key={group.userId}
                        onClick={() => openViewer(feedGroups, index)}
                        className="relative flex-shrink-0 w-28 h-44 rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-colors group"
                    >
                        {/* Ảnh nền */}
                        <div className="absolute inset-0 bg-muted">
                            {getThumbnail(group.stories[0]) ? (
                                <img src={getThumbnail(group.stories[0])} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full" style={{ background: group.stories[0]?.backgroundColor || "#1a1a2e" }} />
                            )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {/* Avatar góc trên — ring màu nếu chưa xem */}
                        <div className="absolute top-3 left-3">
                            <div className={`w-9 h-9 rounded-full overflow-hidden ring-2 ${
                                group.hasUnviewed ? "ring-primary" : "ring-white/30"
                            }`}>
                                <img src={group.avatarUrl} alt={group.fullName} className="w-full h-full object-cover" />
                            </div>
                        </div>

                        {/* Tên dưới */}
                        <div className="absolute bottom-3 left-3 right-3">
                            <span className="text-white text-xs font-semibold drop-shadow line-clamp-2">
                                {group.fullName}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            {showCreateModal && <CreateStoryModal onClose={() => setShowCreateModal(false)} />}
            {viewerState && (
                <StoryViewer
                    groups={viewerState.groups}
                    startIndex={viewerState.startIndex}
                    onClose={() => setViewerState(null)}
                />
            )}
        </>
    );
}
