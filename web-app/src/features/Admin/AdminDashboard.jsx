import React, { useEffect, useState } from 'react';
import { Users, FileText, MessageSquare } from 'lucide-react';
import adminApi from '../../api/adminApi';

const StatCard = ({ title, value, icon, colorClass }) => (
  <div className="bg-card p-6 rounded-xl border border-border shadow-sm flex items-center space-x-4">
    <div className={`p-4 rounded-lg ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-muted-foreground text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-bold mt-1">{value}</h3>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    comments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, postsRes, commentsRes] = await Promise.all([
          adminApi.getUserStats(),
          adminApi.getPostStats(),
          adminApi.getCommentStats()
        ]);
        
        setStats({
          users: usersRes.result || 0,
          posts: postsRes.result || 0,
          comments: commentsRes.result || 0
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading statistics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Users" 
          value={stats.users} 
          icon={<Users className="w-8 h-8 text-blue-500" />} 
          colorClass="bg-blue-500/10"
        />
        <StatCard 
          title="Total Posts" 
          value={stats.posts} 
          icon={<FileText className="w-8 h-8 text-green-500" />} 
          colorClass="bg-green-500/10"
        />
        <StatCard 
          title="Total Comments" 
          value={stats.comments} 
          icon={<MessageSquare className="w-8 h-8 text-purple-500" />} 
          colorClass="bg-purple-500/10"
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm mt-8">
        <h3 className="text-xl font-semibold mb-4">System Overview</h3>
        <div className="flex items-center justify-center h-64 bg-muted/30 rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground">Chart visualizer would go here (e.g. Recharts)</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
