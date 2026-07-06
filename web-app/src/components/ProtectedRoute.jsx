import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdmin } from "../api/localStorageService";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, profile } = useSelector((state) => state.user);
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" replace />;
  }

  // Check admin role
  const userIsAdmin = isAdmin();

  if (userIsAdmin && !location.pathname.startsWith("/admin")) {
    return <Navigate to="/admin" replace />;
  }

  if (!userIsAdmin && location.pathname.startsWith("/admin")) {
    return <Navigate to="/feed" replace />;
  }

  // Kiểm tra xem đã hoàn thành lựa chọn sở thích chưa
  const hasInterests = profile && profile.categoryWeights && Object.keys(profile.categoryWeights).length > 0;

  if (profile && !hasInterests && location.pathname !== "/onboarding/interests" && !userIsAdmin) {
    return <Navigate to="/onboarding/interests" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
