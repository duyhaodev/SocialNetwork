import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { searchApi } from "../../api/searchApi";

function AllResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Lấy query params
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get("type") || "users"; // users hoặc posts
  const keyword = queryParams.get("keyword") || "";

  useEffect(() => {
    const fetchAllResults = async () => {
      if (!keyword.trim()) return;
      setLoading(true);
      try {
        const res = await searchApi.search(keyword);
        let data;
        if (res && res.data) {
            data = res.data.result || {};
        } else {
            data = res?.result || {};
        }
        const allResults = type === "users" ? (data.users || []) : (data.posts || []);
        setResults(allResults);
      } catch (e) {
        console.error(e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllResults();
  }, [keyword, type]);

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-4xl bg-black/70 border border-cyan-500/30 rounded-2xl p-6">
        <h1 className="text-center text-2xl font-semibold mb-6 text-white">
          {type === "users" ? "MỌI NGƯỜI" : "TẤT CẢ BÀI VIẾT"}
        </h1>

        <button
          onClick={() => navigate(`/search?keyword=${encodeURIComponent(keyword)}`)}
          className="mb-6 px-4 py-2 bg-cyan-400 text-black rounded-xl hover:bg-cyan-300 transition"
        >
          🔙 Quay lại
        </button>

        {loading && <p className="text-cyan-300 text-center animate-pulse">Đang tải...</p>}

        {!loading && results.length === 0 && (
          <p className="text-gray-400 text-center italic">
            Không tìm thấy kết quả cho <span className="text-cyan-300">"{keyword}"</span>
          </p>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {type === "users" ? (
              results.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-cyan-400/40 bg-black/60">
                  <img
                    src={u.avatarUrl || "https://placehold.co/50x50?text=U"}
                    alt={u.userName}
                    className="w-12 h-12 aspect-square rounded-full border-2 border-cyan-400/70 object-cover"
                  />
                  <div>
                    <p className="font-semibold text-cyan-100">{u.full_name}</p>
                    <p className="text-sm text-cyan-300/70">{u.userName}</p>
                  </div>
                </div>
              ))
            ) : (
              results.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-pink-400/40 bg-black/60">
                  <p className="text-pink-300 font-medium mb-1">{p.authorname || "Ẩn danh"}</p>
                  <p className="text-gray-100">{p.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AllResultsPage;
