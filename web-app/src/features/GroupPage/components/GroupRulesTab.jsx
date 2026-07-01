import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, ShieldAlert } from "lucide-react";
import groupApi from "@/api/groupApi";
import { EditRulesModal } from "./EditRulesModal";

export function GroupRulesTab({ groupId, isAdmin, groupName }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await groupApi.getGroupRules(groupId);
      if (res.code === 1000) {
        setRules(res.result || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      fetchRules();
    }
  }, [groupId]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải nội quy...</div>;
  }

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4">
      <div className="bg-card rounded-2xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-8 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold mb-1">Nội quy của nhóm</h2>
            <p className="text-muted-foreground text-sm">
              Những quy định cần tuân thủ khi tham gia {groupName}
            </p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)} className="gap-2">
              <Edit className="w-4 h-4" /> Chỉnh sửa
            </Button>
          )}
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center">
            <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground/80">Nhóm chưa có nội quy nào</h3>
            {isAdmin && (
              <p className="text-muted-foreground text-sm mt-1">
                Hãy thêm nội quy để quản lý nhóm tốt hơn.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {rules.map((rule, index) => (
              <div key={rule.id || index} className="flex gap-4 group hover:bg-muted/30 p-4 rounded-xl transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center mt-0.5">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1 text-foreground/90">{rule.title}</h3>
                  {rule.description && (
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {rule.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <EditRulesModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          groupId={groupId}
          initialRules={rules}
          onSuccess={fetchRules}
        />
      )}
    </div>
  );
}
