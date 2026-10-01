/**
 * Widełki sejfu.
 *
 * To nie jest bank treści: nie ma tu żadnego materiału, tylko frazy, które
 * **zmierzyliśmy** na żywym katalogu (2026-09-30) i które naprawdę dają pionowe
 * ujęcia w moodzie marki. Kliknięcie w widełki nadal pyta katalog i nadal nic
 * nie kosztuje — zapytanie jest gotowe, materiał nie.
 *
 * Dlaczego to w pliku, a nie w głowie: wpisanie „dark gym training" daje osiem
 * kart, z których zero jest pionowych, a „barbell plates" daje trzy. Słowo
 * konkretnego przedmiotu bije przymiotnik nastroju i lepiej to zapamiętać
 * niż powtarzać eksperyment przy każdej rolce.
 */

export interface VaultQuery {
  /** Etykieta po polsku — to widzi człowiek. */
  label: string;
  /** Fraza dla katalogu — zawsze angielska, bo po polsku nie ma wyników. */
  query: string;
}

export interface VaultQueryGroup {
  title: string;
  queries: VaultQuery[];
}

export const VAULT_QUERY_GROUPS: VaultQueryGroup[] = [
  {
    title: "Noc w mieście",
    queries: [
      { label: "człowiek idzie nocą", query: "man walking city night" },
      { label: "most i deszcz", query: "bridge night rain" },
      { label: "okno pociągu w nocy", query: "train window night" },
      { label: "pusta ulica nocą", query: "empty street night" },
    ],
  },
  {
    title: "Poranek i droga",
    queries: [
      { label: "wschód słońca, samotny", query: "sunrise alone mountain" },
      { label: "pusta droga we mgle", query: "lonely road fog" },
      { label: "biegacz o świcie", query: "runner dawn" },
      { label: "góra we mgle", query: "mountain fog lone tree" },
    ],
  },
  {
    title: "Woda i pogoda",
    queries: [
      { label: "szare morze", query: "sea horizon grey" },
      { label: "sztorm o skały", query: "ocean storm rocks" },
      { label: "zimny prysznic", query: "cold shower water" },
      { label: "lód i woda", query: "ice water splash" },
    ],
  },
  {
    title: "Ciało i praca",
    queries: [
      { label: "tarcze na sztandze", query: "barbell plates" },
      { label: "czarna kawa", query: "coffee black cup" },
      { label: "świeca w ciemności", query: "candle dark room" },
      { label: "betonowe schody", query: "concrete stairs" },
    ],
  },
];

/** Płaska lista do liczenia i do ewentualnego losowania. */
export const VAULT_QUERIES: VaultQuery[] = VAULT_QUERY_GROUPS.flatMap((group) => group.queries);
