import confetti from "canvas-confetti";

export function fireCelebration(): void {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#38BDF8", "#10B981", "#F59E0B", "#FFFFFF"],
    });
  } catch (e) {
    console.log("Confetti not available", e);
  }
}

export function fireFlameStreak(): void {
  try {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#F59E0B", "#EF4444", "#F97316"],
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#F59E0B", "#EF4444", "#F97316"],
    });
  } catch (e) {
    console.log("Confetti not available", e);
  }
}
