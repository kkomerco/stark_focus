import { useEffect, useRef, useState } from "react";
import type { StudioMedia } from "../lib/reelMontage";

export interface LoadedStudioMedia {
  asset: StudioMedia;
  source: HTMLImageElement | HTMLVideoElement;
  url: string;
  width: number;
  height: number;
  duration: number;
  pendingSeek: Promise<void> | null;
}

function dispose(item: LoadedStudioMedia) {
  if (item.source instanceof HTMLVideoElement) {
    item.source.pause();
    item.source.removeAttribute("src");
    item.source.load();
  }
  if (item.asset.blob) URL.revokeObjectURL(item.url);
}

async function load(asset: StudioMedia): Promise<LoadedStudioMedia> {
  const url = asset.blob ? URL.createObjectURL(asset.blob) : asset.url!;
  const source = asset.kind === "video" ? document.createElement("video") : new Image();
  if (source instanceof HTMLVideoElement) {
    source.muted = true;
    source.playsInline = true;
    source.preload = "auto";
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const ready = () => {
        cleanup();
        resolve();
      };
      const fail = () => {
        cleanup();
        reject(new Error(`Nie można odczytać pliku: ${asset.name}`));
      };
      const timer = setTimeout(fail, 15000);
      const event = asset.kind === "video" ? "loadeddata" : "load";
      const cleanup = () => {
        clearTimeout(timer);
        source.removeEventListener(event, ready);
        source.removeEventListener("error", fail);
      };
      source.addEventListener(event, ready);
      source.addEventListener("error", fail);
      source.src = url;
    });
    const video = source instanceof HTMLVideoElement;
    return {
      asset,
      source,
      url,
      width: video ? source.videoWidth : source.naturalWidth,
      height: video ? source.videoHeight : source.naturalHeight,
      duration: video ? source.duration : 0,
      pendingSeek: null,
    };
  } catch (error) {
    if (source instanceof HTMLVideoElement) {
      source.removeAttribute("src");
      source.load();
    }
    if (asset.blob) URL.revokeObjectURL(url);
    throw error;
  }
}

/** Tylko zmienione pliki są dekodowane; przesuwanie suwaka nie tworzy nowych URL-i. */
export function useStudioMedia(inputs: StudioMedia[]) {
  const cache = useRef(new Map<string, LoadedStudioMedia>());
  const pending = useRef(new Set<string>());
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState("");
  const wanted = useRef(new Set<string>());
  const mounted = useRef(true);
  useEffect(() => {
    wanted.current = new Set(inputs.map((asset) => asset.id));
    for (const [id, item] of cache.current)
      if (!wanted.current.has(id)) {
        dispose(item);
        cache.current.delete(id);
      }
    for (const asset of inputs) {
      if (cache.current.has(asset.id) || pending.current.has(asset.id)) continue;
      pending.current.add(asset.id);
      load(asset)
        .then((item) => {
          if (!mounted.current || !wanted.current.has(asset.id)) {
            dispose(item);
            return;
          }
          cache.current.set(asset.id, item);
        })
        .catch((error: Error) => {
          if (mounted.current && wanted.current.has(asset.id)) setNotice(error.message);
        })
        .finally(() => {
          pending.current.delete(asset.id);
          if (mounted.current) setRevision((value) => value + 1);
        });
    }
    setRevision((value) => value + 1);
  }, [inputs]);
  useEffect(() => {
    mounted.current = true;
    const items = cache.current;
    return () => {
      mounted.current = false;
      for (const item of items.values()) dispose(item);
      items.clear();
    };
  }, []);
  return {
    media: cache.current,
    revision,
    notice,
    loading: inputs.some((asset) => pending.current.has(asset.id)),
  };
}

/** Przewijanie jest sekwencyjne, żeby eksport nie konkurował z ostatnim skokiem podglądu. */
export async function seekStudioVideo(item: LoadedStudioMedia, target: number): Promise<void> {
  if (!(item.source instanceof HTMLVideoElement)) return;
  if (item.pendingSeek) await item.pendingSeek;
  const video = item.source;
  if (Math.abs(video.currentTime - target) < 0.001 && !video.seeking) return;
  const task = new Promise<void>((resolve, reject) => {
    const finish = () => {
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(new Error(`Nie udało się przewinąć klipu: ${item.asset.name}`));
    };
    const timer = setTimeout(fail, 2000);
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", finish);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("seeked", finish);
    video.addEventListener("error", fail);
    video.currentTime = target;
  });
  item.pendingSeek = task;
  try {
    await task;
  } finally {
    if (item.pendingSeek === task) item.pendingSeek = null;
  }
}
