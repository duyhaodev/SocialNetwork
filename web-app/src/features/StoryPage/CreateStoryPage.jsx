import { useLocation, useNavigate } from "react-router-dom";
import StoryImageEditor from "../../components/Story/StoryImageEditor";
import StoryTextEditor from "../../components/Story/StoryTextEditor";

export default function CreateStoryPage({ mode }) {
    const navigate = useNavigate();
    const location = useLocation();

    // File được truyền qua navigation state khi chọn ảnh/video
    const file = location.state?.file;

    const handleBack = () => navigate("/feed");

    if (mode === "image") {
        // Nếu không có file (vào thẳng URL) thì về feed
        if (!file) { navigate("/feed"); return null; }
        return <StoryImageEditor file={file} onBack={handleBack} />;
    }

    if (mode === "text") {
        return <StoryTextEditor onBack={handleBack} />;
    }

    return null;
}
