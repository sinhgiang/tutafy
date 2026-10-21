// How the tests recognise Vietnamese text, so that src can stay English everywhere except the admin translation table.

// Letters only Vietnamese uses (the tone marks under and over a vowel, ă ơ ư đ, ĩ ũ). French, Spanish and Portuguese words
// (café, São Paulo, naïve, déjà vu) use none of them, so an English blog post with a foreign name is not flagged.
export const VIETNAMESE_LETTERS = /[Ạ-ỹăĂơƠưƯđĐĩĨũŨ]/u

// Whole words, for a short text whose letters happen to carry no mark of that kind ("Khách hàng"), and the same words written
// without marks ("khach hang", "hoc sinh"), which is how Vietnamese is often typed in a hurry.
export const VIETNAMESE_WORDS = /\b(khách hàng|khách|hàng|gia sư|học sinh|buổi học|của bạn|xin chào|cảm ơn|đăng ký|đăng nhập|khach hang|gia su|hoc sinh|buoi hoc|cua ban|xin chao|cam on|dang ky|dang nhap|tieng viet|khong duoc|nguoi dung|chua co|chua doc)\b/iu

/** The first piece of Vietnamese found in the text, or null. */
export function findVietnamese(text: string): string | null {
  const letter = text.match(VIETNAMESE_LETTERS)
  if (letter) return letter[0]
  const word = text.match(VIETNAMESE_WORDS)
  return word ? word[0] : null
}
