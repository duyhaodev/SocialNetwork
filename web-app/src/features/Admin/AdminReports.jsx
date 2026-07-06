import React, { useEffect, useState } from 'react';
import adminApi from '../../api/adminApi';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPendingReports(0, 50);
      if (res.result && res.result.content) {
        setReports(res.result.content);
      }
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleResolve = async (reportId) => {
    if (window.confirm("Mark this report as resolved? (You should have taken action first)")) {
      try {
        await adminApi.resolveReport(reportId);
        toast.success("Report resolved");
        fetchReports();
      } catch (error) {
        toast.error("Failed to resolve report");
      }
    }
  };

  const handleDismiss = async (reportId) => {
    if (window.confirm("Dismiss this report?")) {
      try {
        await adminApi.dismissReport(reportId);
        toast.success("Report dismissed");
        fetchReports();
      } catch (error) {
        toast.error("Failed to dismiss report");
      }
    }
  };

  if (loading) {
    return <div className="text-center py-10">Loading reports...</div>;
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="p-4 font-semibold text-sm w-24">Type</th>
            <th className="p-4 font-semibold text-sm w-32">Target ID</th>
            <th className="p-4 font-semibold text-sm">Reason</th>
            <th className="p-4 font-semibold text-sm w-32">Date</th>
            <th className="p-4 font-semibold text-sm w-24 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {reports.map(report => (
            <tr key={report.id} className="hover:bg-muted/20 transition-colors">
              <td className="p-4">
                <span className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded font-medium">
                  {report.targetType}
                </span>
              </td>
              <td className="p-4 text-xs font-mono text-muted-foreground truncate max-w-[100px]" title={report.targetId}>
                {report.targetId}
              </td>
              <td className="p-4 text-sm">{report.reason}</td>
              <td className="p-4 text-xs text-muted-foreground">
                {new Date(report.createdAt).toLocaleString()}
              </td>
              <td className="p-4 text-center">
                <div className="flex justify-center space-x-2">
                  <button
                    onClick={() => handleResolve(report.id)}
                    className="p-1.5 text-green-500 bg-green-500/10 hover:bg-green-500/20 rounded-lg transition-colors"
                    title="Resolve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDismiss(report.id)}
                    className="p-1.5 text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {reports.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center p-8 text-muted-foreground">No pending reports</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminReports;
