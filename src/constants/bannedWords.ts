// 금지어 목록 (추후 Supabase banned_words 테이블 연동 예정)
export const bannedWords: string[] = [
  "시발",
  "씨발",
  "병신",
  "지랄",
  "개새끼",
  "미친놈",
  "미친년",
  "꺼져",
  "죽어",
  "ㅅㅂ",
  "ㅂㅅ",
  "ㅈㄹ",
];

export function containsBannedWord(text: string): boolean {
  const normalized = text.toLowerCase().replace(/\s/g, "");
  return bannedWords.some((word) => normalized.includes(word));
}
