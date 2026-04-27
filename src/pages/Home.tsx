import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FeedCard from "@/components/FeedCard";
import BottomNav from "@/components/BottomNav";
import WriteModal from "@/components/WriteModal";
import WritePromptCard from "@/components/WritePromptCard";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["전체", "일상", "연애·관계", "모임·만남"];

interface PostRow {
  id: string;
  content: string;
  created_at: string;
  duration_hours: number;
  expires_at: string;
  like_count: number;
  comment_count: number;
  is_locked: boolean;
  profiles: { nickname: string } | null;
  categories: { name: string } | null;
}

const Home = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("전체");
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentNickname, setCurrentNickname] = useState("");

  // 현재 유저 닉네임 가져오기
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", session.user.id)
        .single();
      if (data) setCurrentNickname(data.nickname);
    };
    fetchProfile();
  }, []);

  // 게시글 가져오기 (profiles, categories는 별도 쿼리 후 매핑)
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      const now = new Date().toISOString();
      const { data: postRows, error } = await supabase
        .from("posts")
        .select("id, content, created_at, duration_hours, expires_at, like_count, comment_count, is_locked, user_id, category_id")
        .eq("is_blind", false)
        .gt("expires_at", now)
        .order("created_at", { ascending: false });

      if (error || !postRows) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const userIds = Array.from(new Set(postRows.map((p) => p.user_id).filter(Boolean)));
      const categoryIds = Array.from(new Set(postRows.map((p) => p.category_id).filter(Boolean) as number[]));

      const [{ data: profilesData }, { data: categoriesData }] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, nickname").in("id", userIds)
          : Promise.resolve({ data: [] as { id: string; nickname: string }[] }),
        categoryIds.length
          ? supabase.from("categories").select("id, name").in("id", categoryIds)
          : Promise.resolve({ data: [] as { id: number; name: string }[] }),
      ]);

      const profileMap = new Map((profilesData ?? []).map((p) => [p.id, p.nickname]));
      const categoryMap = new Map((categoriesData ?? []).map((c) => [c.id, c.name]));

      const merged: PostRow[] = postRows.map((p) => ({
        id: p.id,
        content: p.content,
        created_at: p.created_at as string,
        duration_hours: p.duration_hours ?? 24,
        expires_at: p.expires_at,
        like_count: p.like_count ?? 0,
        comment_count: p.comment_count ?? 0,
        is_locked: p.is_locked ?? false,
        profiles: p.user_id && profileMap.has(p.user_id)
          ? { nickname: profileMap.get(p.user_id)! }
          : null,
        categories: p.category_id && categoryMap.has(p.category_id)
          ? { name: categoryMap.get(p.category_id)! }
          : null,
      }));

      setPosts(merged);
      setLoading(false);
    };
    fetchPosts();
  }, []);

  const filteredPosts = activeCategory === "전체"
    ? posts
    : posts.filter((p) => p.categories?.name === activeCategory);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mobile-container">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3">
          <h1 className="font-logo text-2xl font-light text-foreground">이면</h1>
          <button
            onClick={() => navigate("/notifications")}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell size={22} />
          </button>
        </header>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`pill whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Write Prompt Card */}
        <div className="px-4 pt-3">
          <WritePromptCard onOpen={() => setIsWriteOpen(true)} />
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="text-5xl mb-3">🌙</span>
            <p className="text-sm" style={{ color: "#6B6560" }}>아직 올라온 이야기가 없어요</p>
            <p className="text-xs mt-1" style={{ color: "#A89F96" }}>첫 번째로 이야기를 남겨보세요</p>
          </div>
        ) : (
          <div className="space-y-3 px-4 py-3">
            {filteredPosts.map((post) => (
              <FeedCard
                key={post.id}
                id={post.id}
                category={post.categories?.name ?? "일상"}
                nickname={post.profiles?.nickname ?? "익명"}
                date={formatDate(post.created_at)}
                content={post.content}
                likes={post.like_count ?? 0}
                comments={post.comment_count ?? 0}
                isLocked={post.is_locked}
                createdAt={post.created_at}
                durationHours={post.duration_hours ?? 24}
                currentUserNickname={currentNickname}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav onWriteClick={() => setIsWriteOpen(true)} />
      <WriteModal isOpen={isWriteOpen} onClose={() => setIsWriteOpen(false)} />
    </div>
  );
};

export default Home;
