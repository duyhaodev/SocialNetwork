import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { isAdmin } from "../api/localStorageService";

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.user);

  if (isAuthenticated) {
    if (isAdmin()) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/feed" replace />;
  }

  return children ? children : <Outlet />;
};

export default PublicRoute;
