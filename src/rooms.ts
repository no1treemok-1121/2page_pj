// 방·편지: Supabase 함수(rpc) 호출 + 이 브라우저에 저장된 "내 방" 정보
const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export type RoomInfo = { nickname: string; letterCount: number; avatar: string | null; decor: unknown };
export type Letter = { id: string; fromName: string; body: string; createdAt: number };
export type MyRoom = { roomId: string; ownerKey: string; nickname: string };

const MY_ROOM_KEY = "3d_pj.myRoom";

export async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  if (!URL_ || !KEY) throw new Error("서버 연결 정보가 없어요");
  const res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = ((await res.json().catch(() => ({}))) as { message?: string }).message || "";
    if (msg.includes("too many")) throw new Error("편지가 너무 많이 왔어요. 잠시 후 다시 보내 주세요.");
    if (msg.includes("not owner")) throw new Error("이 방의 주인만 편지를 읽을 수 있어요.");
    if (msg.includes("room not found")) throw new Error("방을 찾을 수 없어요.");
    if (msg.includes("cannot reply")) throw new Error("이미 답장한 편지예요.");
    if (msg.includes("login taken") || msg.includes("duplicate")) throw new Error("이미 누가 쓰고 있는 아이디예요. 다른 아이디로 해 주세요.");
    if (msg.includes("bad login")) throw new Error("아이디는 한글·영어·숫자로 3~16자로 해 주세요. (띄어쓰기·기호 안 돼요)");
    if (msg.includes("bad name")) throw new Error("방 이름은 1~12자로 해 주세요.");
    if (msg.includes("bad pw")) throw new Error("비밀번호는 4~30자로 해 주세요.");
    throw new Error(`요청에 실패했어요 (${res.status})`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function createRoom(nickname: string): Promise<MyRoom> {
  const [row] = await rpc<{ room_id: string; owner_key: string }[]>("create_room", { p_nickname: nickname });
  const mine = { roomId: row.room_id, ownerKey: row.owner_key, nickname };
  saveMyRoom(mine);
  return mine;
}

export async function getRoom(roomId: string): Promise<RoomInfo | null> {
  const rows = await rpc<{ nickname: string; letter_count: number; avatar: string | null; decor?: unknown }[]>("get_room", { p_room: roomId });
  return rows[0] ? { nickname: rows[0].nickname, letterCount: rows[0].letter_count, avatar: rows[0].avatar, decor: rows[0].decor ?? {} } : null;
}

export function setRoomAvatar(room: MyRoom, avatar: string) {
  return rpc<void>("set_room_avatar", { p_room: room.roomId, p_key: room.ownerKey, p_avatar: avatar });
}

export function sendLetter(roomId: string, fromName: string, body: string) {
  return rpc<void>("send_letter", { p_room: roomId, p_from: fromName, p_body: body });
}

export async function getLetters(roomId: string, ownerKey: string): Promise<Letter[]> {
  const rows = await rpc<{ id: string; from_name: string; body: string; created_at: string }[]>(
    "get_letters", { p_room: roomId, p_key: ownerKey });
  return rows.map((r) => ({ id: r.id, fromName: r.from_name, body: r.body, createdAt: Date.parse(r.created_at) }));
}

export function deleteLetter(roomId: string, ownerKey: string, letterId: string) {
  return rpc<void>("delete_letter", { p_room: roomId, p_key: ownerKey, p_letter: letterId });
}

// ✏️ 방 이름 바꾸기 (주인만). 이 기기의 '내 방' 정보도 같이 고침
export async function setRoomName(room: MyRoom, name: string): Promise<MyRoom> {
  await rpc<void>("set_room_name", { p_room: room.roomId, p_key: room.ownerKey, p_name: name.trim() });
  const updated = { ...room, nickname: name.trim() };
  saveMyRoom(updated);
  return updated;
}

// 🔑 내 방 열쇠 (아이디 + 비밀번호)
export const LOGIN_RE = /^[a-zA-Z0-9_가-힣]{3,16}$/;
export function setRoomLogin(room: MyRoom, login: string, pw: string) {
  return rpc<string>("set_room_login", { p_room: room.roomId, p_key: room.ownerKey, p_login: login.trim(), p_pw: pw });
}
export async function getRoomLogin(room: MyRoom): Promise<string | null> {
  return (await rpc<string | null>("get_room_login", { p_room: room.roomId, p_key: room.ownerKey })) ?? null;
}
export async function loginRoom(login: string, pw: string): Promise<MyRoom> {
  const [r] = await rpc<{ status: string; room_id: string | null; owner_key: string | null; nickname: string | null; left_tries: number | null }[]>(
    "room_login", { p_login: login.trim(), p_pw: pw });
  if (r?.status === "locked") throw new Error("비밀번호를 5번 틀려서 10분 동안 잠겼어요. 잠시 후 다시 해 주세요.");
  if (!r || r.status !== "ok" || !r.room_id || !r.owner_key) {
    throw new Error(r?.left_tries != null ? `아이디나 비밀번호가 맞지 않아요. (남은 기회 ${r.left_tries}번)` : "아이디나 비밀번호가 맞지 않아요.");
  }
  const mine = { roomId: r.room_id, ownerKey: r.owner_key, nickname: r.nickname ?? "" };
  saveMyRoom(mine);
  return mine;
}

export function loadMyRoom(): MyRoom | null {
  try {
    const v = JSON.parse(localStorage.getItem(MY_ROOM_KEY) || "null");
    return v && v.roomId && v.ownerKey ? v : null;
  } catch {
    return null;
  }
}

// 🚪 이 기기에서 내 방 내려놓기 (로그아웃): 방은 그대로 있고, 아이디·비밀번호로 다시 찾을 수 있음
export function forgetMyRoom() {
  try { localStorage.removeItem(MY_ROOM_KEY); } catch { /* 무시 */ }
}

export function saveMyRoom(room: MyRoom) {
  try {
    localStorage.setItem(MY_ROOM_KEY, JSON.stringify(room));
  } catch {
    // 저장 못 하는 환경이면 주인 링크로만 들어올 수 있음
  }
}

// 주소: 방 = ?room=<id>, 주인 링크 = ?room=<id>#key=<열쇠> (# 뒤는 서버로 전송되지 않음)
export const roomLink = (roomId: string) => `${location.origin}/?room=${roomId}`;
export const ownerLink = (room: MyRoom) => `${roomLink(room.roomId)}#key=${room.ownerKey}`;

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
