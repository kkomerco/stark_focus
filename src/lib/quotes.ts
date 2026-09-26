// src/lib/quotes.ts
// Cudze zdanie na naszej karcie — bez zgadywania, czy ono padło.
//
// Pomysł „wycinek z podcastu" ma jeden problem prawny i jeden faktograficzny.
// Prawnego nie rozwiązuje aplikacja: ich audio i ich obraz to ich własność, a
// recykling obcego materiału jest od 30 kwietnia 2026 osobno karany w
// rekomendacjach. Zostaje wersja uczciwa: BIERZYEMY TEKST, podpisujemy się pod
// nim swoją typografią i przypisujemy mówcę. To cytat, nie przeróbka.
//
// Problem faktograficzny rozwiązujemy tutaj: model ma skłonność do „poprawiania"
// cytatów, a sfałszowany cytat przypisany żywej osobie to najgorszy błąd, jaki
// może zrobić konto oparte na dyscyplinie. Więc każde zdanie wraca do transkryptu.

/** Znaki, które nie zmieniają sensu cytatu: cudzysłowy, myślniki, spacje. */
export function normalizeQuote(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’'`´]/g, "")
    .replace(/[“”"]/g, "")
    .replace(/[–—-]/g, " ")
    .replace(/\u2026/g, " ")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Czy to zdanie naprawdę padło? Wolno pominąć środek (wielokropek, nawias),
 * ale kawałki muszą leżeć w transkrypcie w tej samej kolejności, nie nachodzić
 * na siebie i zgadzać się całymi słowami.
 *
 * Wcześniejsza wersja pytała tylko „czy każdy kawałek gdzieś tu jest" — więc
 * „you are not tired… discipline is a feeling" przechodziło, kiedy oba urywki
 * padły w różnych miejscach rozmowy, a „build the" udawało cytat ze słowa
 * „build there". Zdanie złożone z dwóch przypadkowych fragmentów i podpisane
 * żywą osobą to dokładnie ten błąd, którego konto nie przeżyje.
 */
export function isVerbatim(quote: string, transcript: string): boolean {
  const flat = normalizeQuote(transcript);
  if (!flat || !quote) return false;
  const haystack = ` ${flat} `;

  const pieces = quote
    .split(/\s*(?:\.\.\.|…|\[|\]|—|–)\s*/)
    .map(normalizeQuote)
    .filter((piece) => piece.length > 0);
  if (pieces.length === 0) return false;

  let cursor = 0;
  for (const piece of pieces) {
    const needle = ` ${piece} `;
    const at = haystack.indexOf(needle, cursor);
    if (at < 0) return false;
    cursor = at + needle.length - 1;
  }
  return true;
}

/** Podpis pod cytatem: najpierw czyje jest, potem skąd. Bez tego to kradzież. */
export function attributionLine(speaker: string, source = ""): string {
  const who = speaker.trim();
  const where = source.trim();
  if (!who) return "";
  return where ? `${who}, ${where}` : who;
}

/** Ile słów może mieć cytat na kadrze. Dłużzy nie da się przeczytać w 2 s. */
export const CLIP_MAX_WORDS = 14;

export function clipFits(quote: string): boolean {
  const words = quote.trim().split(/\s+/).filter(Boolean);
  return words.length >= 3 && words.length <= CLIP_MAX_WORDS;
}
