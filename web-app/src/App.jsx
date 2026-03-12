import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./features/LoginPage/LoginPage.jsx";
import { FeedPage } from "./features/FeedPage/FeedPage.jsx";
import { ProfilePage } from "./features/ProfilePage/ProfilePage.jsx";
import { ThreadsLayout } from "./components/ThreadsLayout/ThreadsLayout.jsx";
import { RegisterPage } from "./features/RegisterPage/RegisterPage.jsx";
import SearchPage from "./features/SearchPage/SearchPage.jsx";
import AllResultsPage from "./features/SearchPage/AllResultsPage.jsx";
import ActivityPage from "./features/ActivityPage/ActivityPage.jsx";
import { MessagesPage } from "./features/MessagePage/MessagePage.jsx";
import { Toaster } from "sonner";
import { verifyToken } from "./store/userSlice.js";
import { useDispatch, useSelector } from "react-redux";
import { Spinner } from "@/components/ui/spinner"
import { PostDetailPage } from "./features/PostDetailPage/PostDetailPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import { getToken } from "./api/localStorageService.js";
import { VerifyAccountPage } from "./features/VerifyAccountPage/VerifyAccountPage.jsx";
import { ForgotPasswordPage } from "./features/ForgotPasswordPage/ForgotPasswordPage.jsx";

export default function App() {
  const dispatch = useDispatch();
  const { loading, isAuthenticated } = useSelector((state) => state.user);

  // Set dark mode by default and verify token on initial load
  useEffect(() => {
    document.documentElement.classList.add('dark');
    const token = getToken();
    if (token) {
      dispatch(verifyToken());
    }
  }, [dispatch]);

  // While verifying token, show a loader to prevent route flashing
  // We only want to show this initial loading screen if a token exists and we are verifying it.
  const isVerifyingToken = loading && !isAuthenticated && getToken();
  if (isVerifyingToken) {
    return (
      <>
          <Toaster richColors position="top-right" />
        <div className="min-h-screen flex items-center justify-center">
          <Spinner />
        </div>
      </>
    );
  }

  return (
    <>
        <Toaster richColors position="top-right" />
      <BrowserRouter>
        <Routes>
          {/* Public routes (Login, Register) - Redirect if authenticated */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify" element = {<VerifyAccountPage/>} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Protected Routes - Redirect to login if not authenticated */}
          <Route element={<ProtectedRoute />}>
            {/* Messages route rendered full-screen (outside ThreadsLayout) */}
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/message" element={<Navigate to="/messages" replace />} />

            {/* Main app routes with Layout */}
            <Route path="/" element={<ThreadsLayout />}>
              <Route index element={<Navigate to="/feed" replace />} />
              <Route path="feed" element={<FeedPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="search/all-results" element={<AllResultsPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="profile/:username" element={<ProfilePage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="post/:postId" element={<PostDetailPage />} />
            </Route>
          </Route>

          {/* Catch-all for logged-in users - redirect to feed. For non-logged in, ProtectedRoute handles redirect to login. */}
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}