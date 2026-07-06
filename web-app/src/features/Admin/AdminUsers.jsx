import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import { BadgeCheck, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Note: we could implement pagination, but keeping it simple for now
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllUsers(0, 50);
      if (res.result && res.result.content) {
        setUsers(res.result.content);
      }
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
    } catch (error) {
      toast.error('Failed to verify user');
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading users...</div>;
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
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
                    onClick={() => handleVerifyToggle(user.id)}
                    className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
                    title="Toggle Verified (Blue Tick)"
                  >
                    <BadgeCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleBanToggle(user.id, user.enabled)}
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
        </tbody>
      </table>
    </div>
  );
};

export default AdminUsers;
