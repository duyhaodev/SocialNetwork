import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, ShieldAlert, LogOut } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/userSlice';

const AdminLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Users Management', path: '/admin/users', icon: <Users className="w-5 h-5" /> },
    { name: 'Posts Moderation', path: '/admin/posts', icon: <FileText className="w-5 h-5" /> },
    { name: 'Report Handling', path: '/admin/reports', icon: <ShieldAlert className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary">Admin Portal</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              {item.icon}
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center space-x-3 px-4 py-3 w-full text-left rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-muted/20">
        <header className="bg-card border-b border-border p-4 shadow-sm flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-semibold">
            {navItems.find(item => item.path === location.pathname)?.name || 'Admin'}
          </h2>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
