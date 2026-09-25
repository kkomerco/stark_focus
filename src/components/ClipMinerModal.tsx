// ClipMinerModal.tsx — cytat z podcastu na NASZEJ karcie.
//
// Wycinek z cudzego podcastu to cudze audio i cudzy obraz. Od 30 kwietnia 2026
// recykling materiału jest osobno karany w rekomendacjach, a konto firmowe nie
// ma praw do cudzego nagrania. Zostaje forma uczciwa: bierzemy ZDANIE,
// podpisujemy je mówcą i opakowujemy własną typografią. To cytat, nie przeróbka
// — i jedyna wersja, której nie da się podważyć.
import React, { useState } from "react";
import { Copy, Check, Loader2, Quote, Scissors, X } from "lucide-react";
import { formatStarkCaption } from "../lib/caption";

interface ClipMinerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Karta z cytatem idzie do studia posta razem z podpisem pod nią. */
  onSendToPost?: (text: string, caption?: string) => void;
}

interface Clip {
  quote: string;
  why: string;
  attribution: string;
}

const FIELD =
  "w-full px-2.5 py-1.5 bg-[#050505] border border-white/15 rounded text-[11px] font-mono text-white focus:outline-none focus:border-white";
const LABEL = "text-[10px] font-mono text-neutral-500 uppercase block";

export const ClipMinerModal: React.FC<ClipMinerModalProps> = ({
  isOpen,
  onClose,
  onSendToPost,
}) => {
  const [transcript, setTranscript] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const mine = async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ai/clip-miner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, speaker, source, count: 5 }),
      });
      const data = await res.json();
      const list = Array.isArray(data?.clips) ? data.clips : [];
      setClips(list);
      if (list.length === 0) {
        setNotice(
          typeof data?.notice === "string"
            ? data.notice
            : typeof data?.error === "string"
              ? data.error
              : "Nic nie wyszło z tego tekstu.",
        );
      }
    } catch {
      setNotice("Serwer nie odpowiedział. Sprawdź, czy aplikacja działa.");
    } finally {
      setLoading(false);
    }
  };

  /** Podpis jedzie w opisie POD kartą — to standard, którego nie da się podważyć. */
  const captionFor = (clip: Clip) =>
    `${formatStarkCaption(clip.quote)}\n\n${clip.attribution ? `— ${clip.attribution}` : ""}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-rose-500" />
            <h2 className="text-sm font-bold font-mono uppercase text-white">
              Cytaty z transkryptu
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">
            Wklej transkrypt odcinka (napisy, notatka z YouTuba, cokolwiek z tekstem). Aplikacja
            wybiera zdania, które{" "}
            <span className="text-neutral-300">wystąpiły w tym tekście słowo w słowo</span> —
            przeredagowane wypada. Nie pobieramy audio ani obrazu: karta nasza, cytat ich, podpis
            widoczny.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className={LABEL}>Mówca</span>
              <input
                className={FIELD}
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                placeholder="David Goggins"
              />
            </label>
            <label className="space-y-1">
              <span className={LABEL}>Skąd</span>
              <input
                className={FIELD}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="The Peter Attia Show, 2026"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className={LABEL}>Transkrypt</span>
            <textarea
              rows={7}
              className={`${FIELD} leading-relaxed`}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Wklej tu tekst odcinka…"
            />
          </label>

          <button
            type="button"
            onClick={mine}
            disabled={loading || transcript.trim().split(/\s+/).length < 20}
            className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black rounded-lg text-xs font-mono font-bold uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Quote className="w-4 h-4" />}
            {loading ? "Szukam w tekście…" : "Wydobądź cytaty"}
          </button>

          {notice && <p className="text-[10px] font-mono text-rose-400">{notice}</p>}

          {clips.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-neutral-500 uppercase">
                Przeszły kontrolę słowo-w-słowo ({clips.length})
              </p>
              {clips.map((clip) => (
                <div
                  key={clip.quote}
                  className="p-3 bg-[#080808] border border-white/10 rounded-lg space-y-1.5"
                >
                  <p className="text-[12px] font-mono text-white leading-snug">“{clip.quote}”</p>
                  {clip.attribution && (
                    <p className="text-[10px] font-mono text-neutral-500">— {clip.attribution}</p>
                  )}
                  {clip.why && <p className="text-[10px] font-mono text-neutral-400">{clip.why}</p>}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSendToPost?.(clip.quote, captionFor(clip));
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-white text-black rounded text-[10px] font-mono font-bold uppercase cursor-pointer"
                    >
                      Do Posta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${clip.quote}\n\n— ${clip.attribution}`);
                        setCopied(clip.quote);
                        setTimeout(() => setCopied(null), 2000);
                      }}
                      className="px-2.5 py-1 bg-[#141414] border border-white/10 text-neutral-300 rounded text-[10px] font-mono uppercase cursor-pointer flex items-center gap-1"
                    >
                      {copied === clip.quote ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Kopiuj z podpisem
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
