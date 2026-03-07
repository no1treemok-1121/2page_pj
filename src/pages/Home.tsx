import { useState } from "react";
import { Bell } from "lucide-react";
import FeedCard from "@/components/FeedCard";
import BottomNav from "@/components/BottomNav";
import WriteModal from "@/components/WriteModal";
import WritePromptCard from "@/components/WritePromptCard";

const CATEGORIES = ["전체", "일상", "연애·관계", "모임·만남"];

const DUMMY_POSTS = [
  {
    id: "1",
    category: "연애·관계",
    nickname: "달빛고양이",
    date: "3월 4일 14:32",
    content: "오늘 데이트 끝나고 찍은 사진... 행복한데 왜 눈물이 나지",
    likes: 24,
    comments: 2,
    isLocked: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    durationHours: 24,
  },
  {
    id: "2",
    category: "일상",
    nickname: "새벽안개",
    date: "3월 4일 09:17",
    content: "오늘 진짜 아무것도 하기 싫다...",
    likes: 4,
    comments: 2,
    isLocked: false,
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(), // 20h ago
    durationHours: 24,
  },
  {
    id: "3",
    category: "모임·만남",
    nickname: "봄비소나기",
    date: "3월 4일 11:02",
    content: "서울 합정 근처 번개 뛸 사람 있나요 ☕",
    likes: 6,
    comments: 3,
    isLocked: true,
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    durationHours: 24,
  },
];

const Home = () => {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [isWriteOpen, setIsWriteOpen] = useState(false);

  const filteredPosts =
    activeCategory === "전체"
      ? DUMMY_POSTS
      : DUMMY_POSTS.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mobile-container">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3">
          <h1 className="font-logo text-2xl font-light text-foreground">이면</h1>
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
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
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="text-5xl mb-3">🌙</span>
            <p className="text-sm" style={{ color: "#6B6560" }}>올라온 글이 없어요</p>
            <p className="text-xs mt-1" style={{ color: "#A89F96" }}>가장 먼저 이야기를 꺼내봐요</p>
          </div>
        ) : (
          <div className="space-y-3 px-4 py-3">
            {filteredPosts.map((post, i) => (
              <FeedCard key={i} {...post} />
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
