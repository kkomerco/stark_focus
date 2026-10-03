import { useEffect, useRef, useState } from "react";
import { readStudioDraft, writeStudioDraft } from "../utils/studioDrafts";

export function useStudioDraft<T>(key: string, value: T, restore: (value: T) => void) {
  const [readyKey, setReadyKey] = useState("");
  const ready = readyKey === key;
  const [notice, setNotice] = useState("Odczytuję szkic…");
  const restoreRef = useRef(restore);
  const valueRef = useRef(value);
  const readyRef = useRef(false);
  const readableRef = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    restoreRef.current = restore;
    valueRef.current = value;
  }, [restore, value]);
  useEffect(() => {
    let alive = true;
    readyRef.current = false;
    readableRef.current = false;
    revision.current += 1;
    readStudioDraft<T>(key)
      .then((saved) => {
        if (!alive) return;
        if (saved) restoreRef.current(saved);
        readableRef.current = true;
        setNotice(
          saved
            ? "Przywrócono lokalny szkic."
            : "Szkic zapisuje się automatycznie w tej przeglądarce.",
        );
      })
      .catch(() => {
        if (alive)
          setNotice(
            "Nie udało się odczytać szkicu. Automatyczny zapis jest wyłączony, aby nie nadpisać poprzedniej wersji. Zachowaj materiał w plikach przed zamknięciem studia.",
          );
      })
      .finally(() => {
        if (alive) {
          readyRef.current = true;
          setReadyKey(key);
        }
      });
    return () => {
      alive = false;
      revision.current += 1;
      if (readyRef.current && readableRef.current)
        void writeStudioDraft(key, valueRef.current).catch(() => {});
    };
  }, [key]);
  useEffect(() => {
    if (!ready || !readableRef.current) return;
    const current = ++revision.current;
    const timer = setTimeout(() => {
      setNotice("Zapisuję szkic…");
      writeStudioDraft(key, value)
        .then(() => {
          if (revision.current === current) setNotice("Szkic zapisany lokalnie.");
        })
        .catch(() => {
          if (revision.current === current)
            setNotice(
              "Szkic nie został zapisany. Sprawdź wolne miejsce; nie zamykaj studia przed zachowaniem materiałów.",
            );
        });
    }, 400);
    return () => clearTimeout(timer);
  }, [key, ready, value]);
  return { ready, notice };
}
