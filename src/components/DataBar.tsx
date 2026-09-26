import React, { useRef, useState } from "react";
import { Download, Package, Upload } from "lucide-react";
import { StarkFocusData } from "../types";
import { importStoredData, serializeBackup } from "../utils/storage";
import { buildPlatformPack } from "../utils/platformPack";
import { filterUnpublished } from "../lib/published";

/**
 * Rzecz aplikacyjna, nie redakcyjna: kopia danych i gotowy pakiet na
 * platformy. Trzymane w jednym rzędzie nad kadrem, żeby nie udawało
 * osobnej powierzchni roboczej.
 */

interface DataBarProps {
  data: StarkFocusData;
}

const today = () => new Date().toISOString().slice(0, 10);

const BTN =
  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 text-[10px] font-mono uppercase tracking-wider text-neutral-400 hover:text-white hover:border-white/30 transition-colors cursor-pointer disabled:opacity-40";

export const DataBar: React.FC<DataBarProps> = ({ data }) => {
  const [packing, setPacking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Kolejka to zapisane posty, które jeszcze nie poszły na konto. Planera w
  // aplikacji nie ma, więc nie udajemy, że pakiet bierze z niego pozycje.
  //
  // „Poszło na konto" odpowiada JEDYNE źródło prawdy, dziennik publikacji:
  // `post.published_date` pisało `null` w czterech miejscach i nie ustawiał go
  // żaden widok, więc licznik „jeszcze nie poszły" nie schodził nawet po
  // zalogowaniu publikacji. Drugiego pola księgowego nie dodajemy.
  const queued = filterUnpublished(data.posts, data.published ?? []);

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Natychmiastowe revokeObjectURL ucina pobierany plik w Firefox i Safari
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const handlePlatformPack = async () => {
    if (queued.length === 0) {
      setNotice("Nie ma czego pakować — zapisane posty muszą najpierw powstać w studio.");
      return;
    }
    setPacking(true);
    setNotice(null);
    try {
      const { blob, files, skipped } = await buildPlatformPack(queued);
      download(blob, `STARK_PAKIET_PLATFORMY_${today()}.zip`);
      setNotice(
        `Pakiet pobrany: ${files} plików dla ${queued.length} pozycji${
          skipped.length > 0 ? ` (pominięto ${skipped.length} bez treści)` : ""
        }.`,
      );
    } catch (e: any) {
      setNotice(`Pakiet nie powstał: ${e?.message || "nieznany błąd"}`);
    } finally {
      setPacking(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // ten sam plik wybrany dwukrotnie musi ponownie odpalić onChange
    if (!file) return;
    try {
      const result = importStoredData(await file.text());
      if (!result.ok) {
        setNotice(`Import odrzucony: ${result.error}`);
        return;
      }
      // Przeładowanie przechodzi przez loadStoredData — pełna normalizacja kształtu
      window.location.reload();
    } catch {
      setNotice("Import odrzucony: nie udało się odczytać pliku.");
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {notice && <span className="text-[10px] font-mono text-neutral-500">{notice}</span>}
      <button type="button" className={BTN} onClick={handlePlatformPack} disabled={packing}>
        <Package className="w-3 h-3" />
        {packing ? "Pakuję…" : `Pakiet platformy (${queued.length})`}
      </button>
      <button
        type="button"
        className={BTN}
        onClick={() => {
          download(
            new Blob([serializeBackup(data)], { type: "application/json" }),
            `STARK_FOCUS_DANE_${today()}.json`,
          );
          setNotice("Kopia danych pobrana jako plik JSON.");
        }}
      >
        <Download className="w-3 h-3" />
        Eksport
      </button>
      <button
        type="button"
        className={BTN}
        onClick={() => {
          setNotice(null);
          if (
            window.confirm(
              "Uwaga: import NADPISZE wszystkie dane Stark Focus w tej przeglądarce treścią z pliku.\n" +
                'Operacji nie da się cofnąć — jeśli nie masz świeżej kopii, najpierw kliknij „Eksport".\n\n' +
                "Kontynuować?",
            )
          )
            fileRef.current?.click();
        }}
      >
        <Upload className="w-3 h-3" />
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  );
};
