/**
 * Treść materiału trafia na Instagram/TikTok, gdzie zwrot w drugiej osobie o
 * śmierci czy samookaleczeniu potrafi zdjąć zasięg albo zatrzymać post.
 * Marka jest ostra, ale nie dlatego, że grozi widzowi — dlatego ryzykowny
 * zwrot zastępujemy równie twardym, tylko bez haczyka w regulaminie.
 *
 * Działa na surowej odpowiedzi modelu (patrz `gemini.server.ts`), więc
 * obejmuje wszystkie silniki treści naraz. Zastąpienia nie zawierają cudzysłowów
 * ani ukośników, żeby nie rozjechać JSON-a, w którym siedzą.
 */
const RISKY_COPY: { pattern: RegExp; replacement: string }[] = [
  {
    pattern: /\b(you|we|i) (could|might|can|will|would|are going to) die\b/gi,
    replacement: "$1 could be gone",
  },
  { pattern: /\bdie right now\b/gi, replacement: "be gone by tonight" },
  { pattern: /\bdie alone\b/gi, replacement: "end up alone" },
  { pattern: /\bdie with\b/gi, replacement: "leave with" },
  { pattern: /\bkill yourself\b/gi, replacement: "quit the habit" },
  { pattern: /\bkilling yourself\b/gi, replacement: "working against yourself" },
  { pattern: /\bend it all\b/gi, replacement: "walk away" },
  { pattern: /\bend your life\b/gi, replacement: "give up the standard" },
  { pattern: /\bsuicidal\b/gi, replacement: "done" },
  { pattern: /\bcut yourself off from\b/gi, replacement: "walk away from" },
  { pattern: /\bcut yourself off\b/gi, replacement: "walk away" },
  { pattern: /\bcut yourself\b/gi, replacement: "cut them off" },
  { pattern: /\bhurt yourself\b/gi, replacement: "work against yourself" },
  { pattern: /\bno reason to live\b/gi, replacement: "no ground to stand on" },
  { pattern: /\brot\b/gi, replacement: "fade" },
  // Pojedyncze wyrazy śmiertelne: „memento mori" w prompcie Radaru prowokuje
  // model do nagiego „die"/„dead", których powyższe frazy nie łapią. Reguły są
  // na końcu, więc wcześniejsze, dłuższe zwroty wygrywają, a „god / to die for"
  // pozostaje nietknięte (?e przed granicą słowa nie łapie \bdie\b).
  { pattern: /\bdie\b/gi, replacement: "pass away" },
  { pattern: /\bdies\b/gi, replacement: "passes away" },
  { pattern: /\bdied\b/gi, replacement: "passed away" },
  { pattern: /\bdead\b/gi, replacement: "gone" },
  { pattern: /\bdeath\b/gi, replacement: "loss" },
  { pattern: /\bwaste away\b/gi, replacement: "slip away" },
  { pattern: /\boverdose\b/gi, replacement: "crash" },
  { pattern: /\bsuicide\b/gi, replacement: "walk away" },
  { pattern: /\bkills\b/gi, replacement: "cuts" },
  { pattern: /\bkill\b/gi, replacement: "cut" },
  { pattern: /\bkilling\b/gi, replacement: "cutting" },
  { pattern: /\bkilled\b/gi, replacement: "cut" },
  { pattern: /\bkillers\b/gi, replacement: "saboteurs" },
  { pattern: /\bkiller\b/gi, replacement: "saboteur" },
];

export function softenForPlatform(text: string): string {
  return RISKY_COPY.reduce((safe, rule) => safe.replace(rule.pattern, rule.replacement), text);
}
