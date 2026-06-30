import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Plus, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import groupApi from "@/api/groupApi";
import { CreateGroupModal } from "./components/CreateGroupModal";

export function GroupListPage() {
  const [myGroups, setMyGroups] = useState([]);
  const [discoverGroups, setDiscoverGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const [myRes, allRes] = await Promise.all([
        groupApi.getMyGroups(),
        groupApi.getAllGroups()
      ]);
      if (myRes.code === 1000) setMyGroups(myRes.result);
      if (allRes.code === 1000) {
        // Filter out groups I already joined
        const myIds = new Set(myRes.result.map(g => g.id));
        setDiscoverGroups(allRes.result.filter(g => !myIds.has(g.id)));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleGroupCreated = (newGroup) => {
    navigate(`/groups/${newGroup.id}`);
  };

  if (loading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            Cộng đồng của bạn
          </h1>
          <p className="text-muted-foreground mt-1">
            Khám phá và tham gia các nhóm phù hợp với sở thích của bạn.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Tạo nhóm
        </Button>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Nhóm đã tham gia</h2>
          {myGroups.length === 0 ? (
            <p className="text-muted-foreground text-sm">Bạn chưa tham gia nhóm nào.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myGroups.map(group => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Khám phá nhóm mới</h2>
          {discoverGroups.length === 0 ? (
            <p className="text-muted-foreground text-sm">Không có nhóm mới để khám phá.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discoverGroups.map(group => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          )}
        </section>
      </div>

      <CreateGroupModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={handleGroupCreated}
      />
    </div>
  );
}

function GroupCard({ group }) {
  return (
    <Link to={`/groups/${group.id}`}>
      <Card className="flex flex-col h-full hover:bg-muted/50 transition-colors overflow-hidden">
        {group.coverImageUrl ? (
          <img src={group.coverImageUrl} alt="Cover" className="w-full h-24 object-cover" />
        ) : (
          <div className="w-full h-24 bg-gradient-to-r from-primary/20 to-primary/10"></div>
        )}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-bold text-lg leading-tight line-clamp-1">{group.name}</h3>
          <div className="flex items-center text-xs text-muted-foreground mt-1 mb-2 gap-2">
            {group.privacy === 'PUBLIC' ? (
              <span className="flex items-center gap-1"><Globe className="w-3 h-3"/> Công khai</span>
            ) : (
              <span className="flex items-center gap-1"><Shield className="w-3 h-3"/> Riêng tư</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {group.description || "Chưa có mô tả."}
          </p>
        </div>
      </Card>
    </Link>
  );
}
