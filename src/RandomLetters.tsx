import { FormEvent, useCallback, useEffect, useState } from "react";
import { Modal } from "./RoomView";
import { AvatarBadge } from "./Avatar";
import { Received, Sent, loadSeen, markSeen, receiveLetters, replyLetter, sentLetters, writeLetter } from "./randomLetters";

// 마을에 들어올 때 새 편지를 받아 두고, 안 읽은 수를 알려 줌
export function useRandomInbox() {
  const [inbox, setInbox] = useState<Received[] | null>(null);
  const [unseen, setUnseen] = useState(0);
  const refresh = useCallback(async () => {
    try {
      const list = await receiveLetters();
      setInbox(list);
      const seen = loadSeen();
      setUnseen(list.filter((l) => !seen.has(l.id)).length);
    } catch { setInbox([]); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const clearUnseen = () => { if (inbox) markSeen(inbox.map((l) => l.id)); setUnseen(0); };
  return { inbox, unseen, refresh, clearUnseen, setInbox };
}

const day = (t: number) => new Date(t).toLocaleDateString("ko-KR");

export default function RandomLetters({ box, myAvatar, onClose, notify }: {
  box: ReturnType<typeof useRandomInbox>;
  myAvatar: string | null;
  onClose: () => void;
  notify: (m: string) => void;
}) {
  const [tab, setTab] = useState<"inbox" | "sent" | "write">("inbox");
  const [open, setOpen] = useState<Received | null>(null);
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [from, setFrom] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { box.clearUnseen(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === "sent") sentLetters().then(setSent).catch(() => { setSent([]); notify("보낸 편지를 불러오지 못했어요"); });
  }, [tab, notify]);

  const write = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      await writeLetter(from.trim(), body.trim(), myAvatar);
      notify("편지를 띄웠어요 ✉️ 마을에 들어오는 사람들에게 전해져요");
      setBody(""); setTab("sent");
    } catch (err) { notify((err as Error).message); }
    finally { setBusy(false); }
  };

  const sendReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!open || !reply.trim() || busy) return;
    setBusy(true);
    try {
      await replyLetter(open.id, reply.trim());
      const updated = { ...open, reply: reply.trim() };
      box.setInbox((prev) => prev?.map((l) => (l.id === open.id ? updated : l)) ?? null);
      setOpen(updated); setReply("");
      notify("답장을 보냈어요");
    } catch (err) { notify((err as Error).message); }
    finally { setBusy(false); }
  };

  if (open) {
    return (
      <Modal onClose={() => setOpen(null)}>
        <p className="letter-from"><AvatarBadge value={open.avatar} size={28} /> From. {open.fromName}</p>
        <p className="letter-body">{open.body}</p>
        <p className="date">{day(open.at)}에 받은 편지</p>
        {open.reply ? (
          <div className="my-reply"><small>내 답장</small><p>{open.reply}</p></div>
        ) : (
          <form onSubmit={sendReply}>
            <textarea value={reply} maxLength={300} rows={3} placeholder="답장을 적어 보세요 (보낸 사람만 읽어요)"
              onChange={(e) => setReply(e.target.value)} />
            <button className="btn wide" disabled={!reply.trim() || busy}>{busy ? "보내는 중…" : "답장 보내기"}</button>
          </form>
        )}
        <button className="btn ghost wide" onClick={() => setOpen(null)}>목록으로</button>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h2>✉️ 랜덤 편지</h2>
      <div className="tabs">
        <button className={tab === "inbox" ? "on" : ""} onClick={() => setTab("inbox")}>받은 편지</button>
        <button className={tab === "sent" ? "on" : ""} onClick={() => setTab("sent")}>보낸 편지</button>
        <button className={tab === "write" ? "on" : ""} onClick={() => setTab("write")}>쓰기</button>
      </div>

      {tab === "inbox" && (
        box.inbox === null ? <p className="hint">불러오는 중…</p>
          : box.inbox.length === 0 ? <p className="hint">아직 받은 편지가 없어요.<br />누군가 랜덤 편지를 쓰면, 그다음 마을에 들어올 때 받을 수 있어요.</p>
          : (
            <ul className="letters">
              {box.inbox.map((l) => (
                <li key={l.id}>
                  <button onClick={() => setOpen(l)}>
                    <strong><AvatarBadge value={l.avatar} size={26} /> {l.fromName}</strong>
                    <span>{l.body.slice(0, 28)}{l.body.length > 28 ? "…" : ""}</span>
                    <small>{day(l.at)}{l.reply ? " · 답장함" : ""}</small>
                  </button>
                </li>
              ))}
            </ul>
          )
      )}

      {tab === "sent" && (
        sent === null ? <p className="hint">불러오는 중…</p>
          : sent.length === 0 ? <p className="hint">아직 보낸 편지가 없어요.</p>
          : (
            <ul className="sent-list">
              {sent.map((l) => (
                <li key={l.id}>
                  <p>{l.body}</p>
                  <small>{day(l.at)} · {l.deliveries}명에게 전해짐 · 답장 {l.replies.length}</small>
                  {l.replies.map((r, i) => <p key={i} className="reply-in">↳ {r.reply}</p>)}
                </li>
              ))}
            </ul>
          )
      )}

      {tab === "write" && (
        <form onSubmit={write}>
          <p className="hint">쓴 편지는 마을에 들어오는 사람 <b>최대 10명</b>에게 전해져요. 받은 사람이 답장하면 '보낸 편지'에서 볼 수 있어요.</p>
          <input className="field" value={from} maxLength={12} placeholder="보내는 사람 (선택, 비우면 익명)" onChange={(e) => setFrom(e.target.value)} />
          <textarea value={body} maxLength={500} rows={5} placeholder="모르는 누군가에게 전하고 싶은 말" onChange={(e) => setBody(e.target.value)} />
          <button className="btn wide" disabled={!body.trim() || busy}>{busy ? "띄우는 중…" : "편지 띄우기"}</button>
        </form>
      )}

      <button className="btn ghost wide" onClick={onClose}>닫기</button>
    </Modal>
  );
}
