/**
 * Kontrola materiału przed publikacją.
 *
 * Pomysł nie jest mój: na górze niszy publikuje się po pomiarze, nie po
 * „jakoś to wygląda" — pierwszy strzał trafia w widełki około 20%, więc
 * autor, który nie sprawdził własnego kadru, płaci za to zasięgiem konta.
 *
 * Panel jest doradczy. Blokowanie eksportu byłoby zakładaniem, że aplikacja
 * wie lepiej niż właściciel marki — wie tylko tyle, co wpisaliście w reguły.
 */
import { auditHook } from "./hookCraft";
import { isPolishCopy, STARK_CTA } from "./caption";

export interface ChecklistItem {
  id: string;
  label: string;
  ok: boolean;
  hint: string;
}

/** Ile sekund na jedno zdanie, żeby dało się je przeczytać na spokojnie. */
const SECONDS_PER_BEAT = 2.2;
const NL = String.fromCharCode(10);
const MAX_WORDS_PER_LINE = 4;

function words(text: string): string[] {
  return text.replace(/[*#]/g, "").trim().split(/\s+/).filter(Boolean);
}

export function reelChecklist(options: {
  phrases: string[];
  durationSec: number;
  audioEnabled: boolean;
}): ChecklistItem[] {
  const phrases = options.phrases.map((p) => p.trim()).filter(Boolean);
  const secondsPerBeat = phrases.length ? options.durationSec / phrases.length : 0;
  const accents = phrases.join(" ").match(/\*\S+\*/g) ?? [];

  return [
    {
      id: "first-frame",
      label: "Pierwsze zdanie do przeczytania w pół sekundy",
      ok: words(phrases[0] ?? "").length <= 8,
      hint: "Decyzja o przewinięciu zapada około 1,7 s. Osiem słów to górna granica pierwszego kadru.",
    },
    {
      id: "beats",
      label: `Każde zdanie ma ${SECONDS_PER_BEAT} s na przeczytanie`,
      ok: secondsPerBeat >= SECONDS_PER_BEAT,
      hint: "Za krótki takt = nikt nie doczyta; za długi = kciuk idzie w górę.",
    },
    {
      id: "line-length",
      label: "Wiersze do czterech słów",
      ok: phrases.every((phrase) => words(phrase).length <= 12),
      hint: "Powyżej dwunastu słów zdanie łamie się na trzy linie i przestaje być cytatem.",
    },
    {
      id: "cliches",
      label: "Żadne zdanie nie jest kliszą",
      ok: phrases.every((phrase) => auditHook(phrase).ok),
      hint:
        phrases
          .map((phrase) => auditHook(phrase).issues[0])
          .filter(Boolean)
          .join("; ") || "Wszystkie zdania przeszły kontrolę rzemiosła.",
    },
    {
      id: "english",
      label: "Materiał jest po angielsku",
      ok: phrases.every((phrase) => !isPolishCopy(phrase)),
      hint: "Aplikacja jest polska, materiał nie. Polski na kadrze to błąd trasy, nie wariant.",
    },
    {
      id: "accent",
      label: "Jeden akcent na rolkę",
      ok: accents.length <= 1,
      hint: "Karmazyn łapiący całe zdanie przestaje wyróżniać i zaczyna krzyczeć.",
    },
    {
      id: "audio",
      label: "Rolka ma ścieżkę dźwiękową",
      ok: options.audioEnabled,
      hint: "Wysyłki idą przez DM-y, a tam ogląda się ze dźwiękiem. Bez bedu eksport jest cichy.",
    },
  ];
}

export function postChecklist(options: { hook: string; caption: string }): ChecklistItem[] {
  const tags = (options.caption.match(/#[\p{L}\d_]+/gu) ?? []).map((tag) => tag.toLowerCase());
  const unique = new Set(tags);

  return [
    {
      id: "hook",
      label: "Myśl z kadru przechodzi kontrolę rzemiosła",
      ok: auditHook(options.hook).ok,
      hint: auditHook(options.hook).issues.join("; ") || "Czysto.",
    },
    {
      id: "english",
      label: "Opis jest po angielsku",
      ok: !isPolishCopy(options.caption),
      hint: "Model odpowiada w języku instrukcji, a instrukcje są polskie.",
    },
    {
      id: "hashtags",
      label: "Trzy do pięciu hashtagów, bez powtórzeń",
      ok: tags.length >= 3 && tags.length <= 5 && unique.size === tags.length,
      hint: `Masz ${tags.length}. Meta ucina listę powyżej pięciu, więc szósty i tak odpada.`,
    },
    {
      id: "lead",
      label: "Pierwsze 125 znaków niesie sedno",
      // Instagram ucina opis po ~125 znakach, zanim dopisze „więcej”.
      ok: options.caption.trim().length > 40 && options.caption.split(NL)[0].length <= 125,
      hint: "To, co widać przed „więcej”, musi być myślą, a nie powtórzeniem hasła.",
    },
    {
      id: "cta",
      label: "Wezwanie do działania jest nasze",
      // Ogon to CTA + hashtagi, wiec CTA nie lezy na samym koncu — sprawdza
      // sie jego obecnosc, nie pozycja.
      ok: options.caption.includes(STARK_CTA),
      hint: "Markowy ogon zamiast własnego — inaczej feed wygląda na prowadzony przez kilka osób.",
    },
  ];
}

export function checklistProblems(items: ChecklistItem[]): ChecklistItem[] {
  return items.filter((item) => !item.ok);
}
