// Browser notification helper with Web Audio API chime and multi-platform posting algorithms

export interface PostingWindowInfo {
  name: string;
  targetTime: string;
  minutesLeft: number;
  description: string;
  platformFocus: string;
  isPeakGoldenHour: boolean;
  recommendedFormat: string;
  dailyFrequencyAdvice: string;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") {
    return true;
  }
  const perm = await Notification.requestPermission();
  return perm === "granted";
}

export function playDisciplineChime() {
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Ignore audio context restrictions
  }
}

export function sendLocalNotification(title: string, body: string) {
  playDisciplineChime();
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/public/stark_logo.svg",
      });
    } catch (e) {
      console.warn("Notification blocked", e);
    }
  }
}

/**
 * Empirical social algorithm scheduling (Instagram Reels, TikTok, YT Shorts):
 * - Weekdays: 07:45 (Morning commute), 13:00 (Lunch carousel break), 19:30 (Golden evening couch peak).
 * - Saturdays: 10:30 (Late morning coffee scroll), 16:30 (Midday pause), 20:00 (Evening viral & Audit).
 * - Sundays: 11:00 (Lazy morning), 17:00 (Afternoon relax), 20:30 ("Sunday Scaries & Reset" - highest save rate for stoicism).
 */
export function getNextPostingWindow(): PostingWindowInfo {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const isSunday = day === 0;
  const isSaturday = day === 6;
  const isWeekend = isSunday || isSaturday;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (isSunday) {
    // Sunday Schedule: 11:00, 17:00, 20:30 (Golden Sunday Reset)
    const w1 = 11 * 60;
    const w2 = 17 * 60;
    const w3 = 20 * 60 + 30;

    if (currentMinutes < w1) {
      return {
        name: "Niedzielny Poranny Scroll (Coffee Time)",
        targetTime: "11:00",
        minutesLeft: w1 - currentMinutes,
        description:
          "Leniwy poranek weekendowy. Użytkownicy budzą się później i spędzają 40+ minut w łóżku na Reels/TikTok.",
        platformFocus: "Instagram Reels & TikTok",
        isPeakGoldenHour: false,
        recommendedFormat: "Rolka 7-9s z mocnym stoickim cytatem o dyscyplinie",
        dailyFrequencyAdvice:
          "Niedziela: 2 publikacje (np. 11:00 i 20:30) + Stories z podsumowaniem tygodnia.",
      };
    } else if (currentMinutes < w2) {
      return {
        name: "Niedzielne Popołudnie (Spokojna Przerwa)",
        targetTime: "17:00",
        minutesLeft: w2 - currentMinutes,
        description: "Czas powrotów i odpoczynku przed wieczorem.",
        platformFocus: "Instagram Karuzela / YT Shorts",
        isPeakGoldenHour: false,
        recommendedFormat: 'Karuzela 5-7 slajdów: "7 Zasad na Nowy Tydzień"',
        dailyFrequencyAdvice: "Karuzela edukacyjna – wysoki współczynnik zapisów (Saves).",
      };
    } else if (currentMinutes < w3) {
      return {
        name: "👑 ZŁOTY SZCZYT: Niedzielny Reset (Sunday Scaries)",
        targetTime: "20:30",
        minutesLeft: w3 - currentMinutes,
        description:
          "Absolutnie najwyższy współczynnik zapisań (Saves) i udostępnień w tygodniu. Ludzie stresują się poniedziałkiem i desperacko szukają dyscypliny i siły psychicznej.",
        platformFocus: "Wszystkie platformy (IG, TikTok, YT Shorts)",
        isPeakGoldenHour: true,
        recommendedFormat: "Główna bezlitosna rolka mindsetowa / YT Long-form zapowiedź",
        dailyFrequencyAdvice: "To najważniejszy post całego tygodnia. Daj 100% energii.",
      };
    } else {
      // Roll over to Monday 07:45
      return {
        name: "Poniedziałkowe Poranne Przebudzenie",
        targetTime: "07:45",
        minutesLeft: 24 * 60 - currentMinutes + (7 * 60 + 45),
        description: 'Poniedziałek rano – "Wake up while 99% are sleeping".',
        platformFocus: "Instagram Reels & TikTok",
        isPeakGoldenHour: false,
        recommendedFormat: "Krótki wstrząsający hook wideo",
        dailyFrequencyAdvice:
          "Dni robocze: 1 rolka wieczorem (19:30) + ew. 1 karuzela w południe (13:00).",
      };
    }
  } else if (isSaturday) {
    // Saturday Schedule: 10:30, 16:30, 20:00 (Audit & Evening)
    const w1 = 10 * 60 + 30;
    const w2 = 16 * 60 + 30;
    const w3 = 20 * 60; // 20:00 Saturday Audit & Post

    if (currentMinutes < w1) {
      return {
        name: "Sobotni Poranny Scroll",
        targetTime: "10:30",
        minutesLeft: w1 - currentMinutes,
        description: "Weekendowe odsłony wideo bez presji czasu pracy.",
        platformFocus: "TikTok & Instagram",
        isPeakGoldenHour: false,
        recommendedFormat: "Wideo 7-10s z dynamicznym montażem",
        dailyFrequencyAdvice: "Sobota: 1 publikacja rano lub wieczorem + Audyt o 20:00.",
      };
    } else if (currentMinutes < w2) {
      return {
        name: "Sobotnie Popołudnie",
        targetTime: "16:30",
        minutesLeft: w2 - currentMinutes,
        description: "Drugi slot weekendowy, idealny na karuzelę edukacyjną.",
        platformFocus: "Instagram Karuzela",
        isPeakGoldenHour: false,
        recommendedFormat: 'Karuzela "Lektury Stoików, które zmienią Twój mózg"',
        dailyFrequencyAdvice: "Pozwala utrzymać zasięgi między weekendem.",
      };
    } else if (currentMinutes < w3) {
      return {
        name: "🚨 Sobotni Audyt & Wieczorna Premiera",
        targetTime: "20:00",
        minutesLeft: w3 - currentMinutes,
        description:
          "Godzina Twojego cotygodniowego audytu systemowego oraz publikacja mocnego materiału na sobotni wieczór.",
        platformFocus: "Instagram, TikTok, YouTube",
        isPeakGoldenHour: true,
        recommendedFormat: "Premiera wideo + zapisanie liczb w Audycie STARK_FOCUS",
        dailyFrequencyAdvice: "Zrób audyt i odnotuj przyrosty tygodniowe.",
      };
    } else {
      // Roll over to Sunday 11:00
      return {
        name: "Niedzielny Poranny Scroll",
        targetTime: "11:00",
        minutesLeft: 24 * 60 - currentMinutes + 11 * 60,
        description: "Leniwa niedziela rano.",
        platformFocus: "Instagram & TikTok",
        isPeakGoldenHour: false,
        recommendedFormat: "Poranna motywacja",
        dailyFrequencyAdvice: "Przygotuj materiał na Niedzielny Reset (20:30).",
      };
    }
  } else {
    // Weekdays (Poniedziałek - Piątek): 07:45, 13:00, 19:30
    const w1 = 7 * 60 + 45;
    const w2 = 13 * 60;
    const w3 = 19 * 60 + 30;

    if (currentMinutes < w1) {
      return {
        name: "Poranne Okno Dnia Roboczego (Commute Time)",
        targetTime: "07:45",
        minutesLeft: w1 - currentMinutes,
        description:
          "Ludzie jadą do pracy/szkoły i przeglądają telefon. Mocny zastrzyk motywacji na start dnia.",
        platformFocus: "Instagram Reels & TikTok",
        isPeakGoldenHour: false,
        recommendedFormat: 'Mocna rolka 7s: "Don\'t complain. Work in silence."',
        dailyFrequencyAdvice: "Złota zasada: Max 1-2 posty dziennie z odstępem min. 5h!",
      };
    } else if (currentMinutes < w2) {
      return {
        name: "Południowa Przerwa (Lunch Break)",
        targetTime: "13:00",
        minutesLeft: w2 - currentMinutes,
        description:
          "Przerwa obiadowa. Widzowie mają czas usiąść i przewinąć 6 slajdów karuzeli lub obejrzeć 3-minutowy film.",
        platformFocus: "Instagram Karuzela / YouTube Shorts",
        isPeakGoldenHour: false,
        recommendedFormat: "Wieloslajdowa karuzela z zasadami stoickimi",
        dailyFrequencyAdvice: "Karuzela w południe nie kanibalizuje wieczornej rolki!",
      };
    } else if (currentMinutes < w3) {
      return {
        name: "👑 ZŁOTA GODZINA: Wieczorny Szczyt Algorytmiczny",
        targetTime: "19:30",
        minutesLeft: w3 - currentMinutes,
        description:
          "Najwyższa retencja doby. Ludzie kończą obowiązki i spędzają 1-2 godziny na kanapie scrollując feed.",
        platformFocus: "Instagram Reels, TikTok, YouTube Shorts",
        isPeakGoldenHour: true,
        recommendedFormat: "Twój najlepszy, najbardziej dopracowany film 9:16 dnia",
        dailyFrequencyAdvice: "1x Główna Rolka Wieczorem to fundament wzrostu.",
      };
    } else {
      // Roll over to tomorrow 07:45
      return {
        name: "Poranne Okno (Jutro)",
        targetTime: "07:45",
        minutesLeft: 24 * 60 - currentMinutes + w1,
        description: "Przygotuj post na poranny commute kolejnego dnia.",
        platformFocus: "Instagram & TikTok",
        isPeakGoldenHour: false,
        recommendedFormat: "Krótka rolka lub cytat",
        dailyFrequencyAdvice: "Nie postuj w nocy (23:00-05:00) – algorytm uśnie.",
      };
    }
  }
}
