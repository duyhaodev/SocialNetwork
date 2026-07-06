import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import userApi from '../../api/userApi';
import { BadgeCheck, Ban, CheckCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [inputKeyword, setInputKeyword] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllUsers(currentPage, 10, searchKeyword);
      if (res.result && res.result.content) {
        const usersFromIdentity = res.result.content;
        setTotalPages(res.result.totalPages || 0);

        // Lấy trạng thái verified từ profile-service
        const userIds = usersFromIdentity.map(u => u.id);
        if (userIds.length > 0) {
          try {
            const profilesRes = await userApi.getUsersBatch(userIds);
            if (profilesRes.result) {
              const profileMap = profilesRes.result.reduce((acc, profile) => {
                acc[profile.userId] = profile.verified;
                return acc;
              }, {});

              const mergedUsers = usersFromIdentity.map(u => ({
                ...u,
                verified: profileMap[u.id] || false
              }));
              setUsers(mergedUsers);
              return;
            }
          } catch (e) {
            console.error("Failed to fetch profiles for verified status", e);
          }
        }

        setUsers(usersFromIdentity);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchKeyword]);

  const handleBanToggle = async (userId, isCurrentlyEnabled) => {
    try {
      if (isCurrentlyEnabled) {
        await adminApi.banUser(userId);
        toast.success('User has been banned');
      } else {
        await adminApi.unbanUser(userId);
        toast.success('User has been unbanned');
      }
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleVerifyToggle = async (userId) => {
    try {
      await adminApi.verifyUser(userId);
      toast.success('Verification status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to verify user');
    }
  };

  const confirmBanToggle = (userId, isCurrentlyEnabled, username) => {
    toast(`Are you sure you want to ${isCurrentlyEnabled ? 'ban' : 'unban'} @${username}?`, {
      action: {
        label: 'Confirm',
        onClick: () => handleBanToggle(userId, isCurrentlyEnabled),
      },
      cancel: {
        label: 'Cancel',
      },
      duration: 5000,
    });
  };

  const confirmVerifyToggle = (userId, username, isCurrentlyVerified) => {
    toast(`Are you sure you want to ${isCurrentlyVerified ? 'remove verification from' : 'verify'} @${username}?`, {
      action: {
        label: 'Confirm',
        onClick: () => handleVerifyToggle(userId),
      },
      cancel: {
        label: 'Cancel',
      },
      duration: 5000,
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchKeyword(inputKeyword);
    setCurrentPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Search by username, email or name..."
            value={inputKeyword}
            onChange={(e) => setInputKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-muted-foreground" />
          <button
            type="submit"
            className="absolute right-2 top-1.5 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-10">Loading users...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 font-semibold text-sm">User Info</th>
                <th className="p-4 font-semibold text-sm">Email</th>
                <th className="p-4 font-semibold text-sm text-center">Status</th>
                <th className="p-4 font-semibold text-sm text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-foreground">{user.fullName || user.username}</div>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                  </td>
                  <td className="p-4 text-sm">{user.email}</td>
                  <td className="p-4 text-center">
                    {user.enabled ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                        Banned
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => confirmVerifyToggle(user.id, user.username, user.verified)}
                        className={`p-2 rounded-lg transition-colors ${user.verified
                          ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        title={user.verified ? "Remove Verification" : "Verify User"}
                      >
                        <BadgeCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmBanToggle(user.id, user.enabled, user.username)}
                        className={`p-2 rounded-lg transition-colors ${user.enabled
                          ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                          : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          }`}
                        title={user.enabled ? "Ban User" : "Unban User"}
                      >
                        {user.enabled ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* P1agination Controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
            <span className="text-sm text-muted-foreground">
              Showing Page {currentPage + 1} of {totalPages}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
