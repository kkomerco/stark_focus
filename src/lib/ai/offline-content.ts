/**
 * Wspólne frazy fallbackowe offline.
 *
 * UWAGA: trasy AI na razie z tego banku NIE korzystają — każda ma własną kopię
 * treści zapasowych. Plik czeka na przeniesienie tamtych kopii tutaj.
 */
export const OFFLINE_FALLBACK = {
  // Hooki często powtarzane (z Centralnego Rejestru Frazy)
  common: {
    coffin: "Your comfort zone is a coffin with Wi-Fi.",
    silence: "They see your silence and call it weakness.",
    threeAM: "3 AM is the only honest hour you have left.",
    discipline: "Discipline is choosing what you want most over what you want now.",
  },

  // Pełne frazy zdefiniowane w poszczególnych trasach (pozostałe frazy)
  full: {
    dailyPack: [
      "You wait for external peace before you focus.",
      "You owe your younger self a profound apology.",
      "The more you value things outside your control, the less control you have.",
    ],
    deconstruct: [
      "Your comfort zone is a coffin with Wi-Fi.",
      "Every scroll is a nail in your potential.",
      "Close the app. Open your future.",
    ],
    ideaStream: [
      "Your comfort zone is a coffin with Wi-Fi.",
      "They see your silence and call it weakness.",
      "You don't lack time. You lack the courage to say no.",
      "Hard work beats talent when talent is scrolling.",
    ],
    /** Temat wstawia wołający — jako zwykły string `${cleanTopic}` byłby literałem. */
    mentor: (cleanTopic: string) => `Comfort in ${cleanTopic} is quietly ruining your potential.`,
  },
};
