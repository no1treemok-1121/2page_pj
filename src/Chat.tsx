import { FormEvent, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type ChatMessage = { id: string; nickname: string; body: string; created_at: string };

// 최근 몇 분 대화만 보여 줄지 (DB 규칙 supabase/chat.sql 과 같은 값)
export const KEEP_MINUTES = 10;
const KEEP_MS = KEEP_MINUTES * 60 * 1000;

const NICK_KEY = "3d_pj.chatNick";
const loadNick = () => { try { return localStorage.getItem(NICK_KEY) || ""; } catch { return ""; } };
const saveNick = (n: string) => { try { localStorage.setItem(NICK_KEY, n); } catch { /* 무시 */ } };
// 내가 보낸 메시지 구분용 (이 브라우저에서 보낸 id)
const mine = new Set<string>();

// 마을에 있는 동안 계속 연결: 새 메시지와 접속자 수를 받음
export function useVillageChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [online, setOnline] = useState(0);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const openRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const since = new Date(Date.now() - KEEP_MS).toISOString();
    supabase.from("chat_messages").select("*").gt("created_at", since)
      .order("created_at", { ascending: false }).limit(100)
      .then(({ data, error: e }) => {
        if (!alive) return;
        if (e) setError("채팅을 불러오지 못했어요");
        else setMessages((prev) => merge((data ?? []).reverse() as ChatMessage[], prev));
      });

    const ch = supabase.channel("village-square", { config: { presence: { key: crypto.randomUUID() } } });
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (p) => {
      const m = p.new as ChatMessage;
      setMessages((prev) => merge(prev, [m]));
      if (!openRef.current && !mine.has(m.id)) setUnread((u) => u + 1);
    })
      .on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState()).length))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") ch.track({ at: Date.now() });
      });
    channelRef.current = ch;
    // 화면에 떠 있는 메시지도 10분이 지나면 사라지게
    const prune = setInterval(() => {
      const cut = new Date(Date.now() - KEEP_MS).toISOString();
      setMessages((prev) => (prev.some((m) => m.created_at <= cut) ? prev.filter((m) => m.created_at > cut) : prev));
    }, 15000);
    return () => { alive = false; clearInterval(prune); supabase?.removeChannel(ch); };
  }, []);

  const setOpen = (open: boolean) => { openRef.current = open; if (open) setUnread(0); };

  const send = async (nickname: string, body: string) => {
    if (!supabase) throw new Error("서버 연결 정보가 없어요");
    const { data, error: e } = await supabase.from("chat_messages")
      .insert({ nickname, body }).select().single();
    if (e) throw new Error("메시지를 보내지 못했어요. 잠시 뒤 다시 보내 주세요.");
    mine.add((data as ChatMessage).id);
    setMessages((prev) => merge(prev, [data as ChatMessage]));
  };

  return { messages, online, unread, error, setOpen, send };
}

function merge(a: ChatMessage[], b: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  [...a, ...b].forEach((m) => map.set(m.id, m));
  return [...map.values()].sort((x, y) => x.created_at.localeCompare(y.created_at)).slice(-200);
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

export default function ChatPanel({ chat, defaultNick, onClose }: {
  chat: ReturnType<typeof useVillageChat>;
  defaultNick: string;
  onClose: () => void;
}) {
  const [nick, setNick] = useState(() => loadNick() || defaultNick);
  const [editingNick, setEditingNick] = useState(!loadNick() && !defaultNick);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chat.setOpen(true); return () => chat.setOpen(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); }, [chat.messages.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (editingNick) {
      if (!nick.trim()) return;
      saveNick(nick.trim());
      setNick(nick.trim());
      setEditingNick(false);
      return;
    }
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErr(null);
    try { await chat.send(nick, body); setText(""); }
    catch (e2) { setErr((e2 as Error).message); }
    finally { setSending(false); }
  };

  return (
    <div className="chat" role="dialog" aria-label="마을 광장 채팅">
      <header>
        <div>
          <strong>마을 광장</strong>
          <span className="online">● 지금 {Math.max(chat.online, 1)}명</span>
        </div>
        <button className="icon" onClick={onClose} aria-label="닫기">✕</button>
      </header>
      <div className="chat-list" ref={listRef}>
        {chat.messages.length === 0 && <p className="hint">아직 대화가 없어요. 먼저 인사해 보세요! 👋</p>}
        {chat.messages.map((m) => {
          const me = mine.has(m.id);
          return (
            <div key={m.id} className={`msg${me ? " me" : ""}`}>
              {!me && <span className="who">{m.nickname}</span>}
              <div className="bubble-row">
                <p className="bubble">{m.body}</p>
                <time>{time(m.created_at)}</time>
              </div>
            </div>
          );
        })}
      </div>
      <p className="chat-note">최근 {KEEP_MINUTES}분 대화만 보여요</p>
      {(err || chat.error) && <p className="gate-error">{err || chat.error}</p>}
      <form onSubmit={submit} className="chat-form">
        {editingNick ? (
          <>
            <input className="field" value={nick} maxLength={12} placeholder="채팅에서 쓸 닉네임" autoFocus
              onChange={(e) => setNick(e.target.value)} />
            <button className="btn" disabled={!nick.trim()}>시작</button>
          </>
        ) : (
          <>
            <button type="button" className="nick" onClick={() => setEditingNick(true)} title="닉네임 바꾸기">{nick}</button>
            <input className="field" value={text} maxLength={300} placeholder="메시지 보내기" autoFocus
              onChange={(e) => setText(e.target.value)} />
            <button className="btn" disabled={!text.trim() || sending}>보내기</button>
          </>
        )}
      </form>
    </div>
  );
}
