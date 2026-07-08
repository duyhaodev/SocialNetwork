import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { LoginPage } from "./features/LoginPage/LoginPage.jsx";
import { FeedPage } from "./features/FeedPage/FeedPage.jsx";
import { ProfilePage } from "./features/ProfilePage/ProfilePage.jsx";
import { ThreadsLayout } from "./components/ThreadsLayout/ThreadsLayout.jsx";
import { RegisterPage } from "./features/RegisterPage/RegisterPage.jsx";
import SearchPage from "./features/SearchPage/SearchPage.jsx";
import AllResultsPage from "./features/SearchPage/AllResultsPage.jsx";
import ActivityPage from "./features/ActivityPage/ActivityPage.jsx";
import { MessagesPage } from "./features/MessagePage/MessagePage.jsx";
import { verifyToken } from "./store/userSlice.js";
import { useDispatch, useSelector } from "react-redux";
import { Spinner } from "@/components/ui/spinner"
import { PostDetailPage } from "./features/PostDetailPage/PostDetailPage.jsx";
import { TagFeedPage } from "./features/TagFeedPage/TagFeedPage.jsx";
import { ConnectionsPage } from "./features/ConnectionsPage/ConnectionsPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import { getAccessToken, isAdmin } from "./api/localStorageService.js";
import { VerifyAccountPage } from "./features/VerifyAccountPage/VerifyAccountPage.jsx";
import { ForgotPasswordPage } from "./features/ForgotPasswordPage/ForgotPasswordPage.jsx";
import CallOverlay from "./features/MessagePage/components/CallOverlay.jsx";
import CreateStoryPage from "./features/StoryPage/CreateStoryPage.jsx";
import StoryArchivePage from "./features/StoryPage/StoryArchivePage.jsx";
import { OnboardingInterestsPage } from "./features/OnboardingInterestsPage/OnboardingInterestsPage.jsx";
import { GroupListPage } from "./features/GroupPage/GroupListPage.jsx";
import { GroupDetailPage } from "./features/GroupPage/GroupDetailPage.jsx";

// Admin Imports
import AdminLayout from "./features/Admin/AdminLayout.jsx";
import AdminDashboard from "./features/Admin/AdminDashboard.jsx";
import AdminUsers from "./features/Admin/AdminUsers.jsx";
import AdminPosts from "./features/Admin/AdminPosts.jsx";
import AdminReports from "./features/Admin/AdminReports.jsx";

// Component con nằm trong BrowserRouter để có access useNavigate
function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleForceLogout = () => {
      toast.error("Your account has been suspended by an administrator.", { duration: 5000 });
      navigate("/login", { replace: true });
    };

    window.addEventListener('force_logout', handleForceLogout);
    return () => window.removeEventListener('force_logout', handleForceLogout);
  }, [navigate]);

  return (
    <Routes>
      {/* Public routes (Login, Register) - Redirect if authenticated */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyAccountPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Protected Routes - Redirect to login if not authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/message" element={<Navigate to="/messages" replace />} />
        <Route path="/story/create/image" element={<CreateStoryPage mode="image" />} />
        <Route path="/story/create/text" element={<CreateStoryPage mode="text" />} />
        <Route path="/onboarding/interests" element={<OnboardingInterestsPage />} />

        <Route path="/" element={<ThreadsLayout />}>
          <Route index element={<Navigate to="/feed" replace />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="search/all-results" element={<AllResultsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="profile/:username" element={<ProfilePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="connections/:username" element={<ConnectionsPage />} />
          <Route path="post/:postId" element={<PostDetailPage />} />
          <Route path="tag/:tagName" element={<TagFeedPage />} />
          <Route path="story/archive" element={<StoryArchivePage />} />
          <Route path="groups" element={<GroupListPage />} />
          <Route path="groups/:groupId" element={<GroupDetailPage />} />
        </Route>
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Route>

      <Route path="*" element={isAdmin() ? <Navigate to="/admin" replace /> : <Navigate to="/feed" replace />} />
    </Routes>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.user);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    const token = getAccessToken();
    if (token) {
      dispatch(verifyToken());
    }
  }, [dispatch]);

  const isVerifyingToken = !isAuthenticated && getAccessToken();
  if (isVerifyingToken) {
    return (
      <>
        <Toaster richColors position="top-right" />
        <CallOverlay />
        <div className="min-h-screen flex items-center justify-center">
          <Spinner />
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster richColors position="top-right" />
      <CallOverlay />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}
