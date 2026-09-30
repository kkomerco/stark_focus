import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowedFileType, isAllowedFileUrl } from "./fetch-image.server";
import { vaultExtension, vaultFileName } from "./vault.server";
import { normalizeClip, pickStockFile, searchStockClips } from "./pexels.server";

/**
 * Sejf ujęć to jedyna ścieżka, w której aplikacja ściąga obcy plik na dysk.
 * Bramki (host, typ, rozmiar, nazwa) są więc badane tutaj, bez sieci i bez
 * klucza — reszta to już tylko złożenie ich w jedno pobranie.
 */

const HOSTS = ["videos.pexels.com", "images.pexels.com"];
const FIVE_MB = 5 * 1024 * 1024;

describe("isAllowedFileUrl", () => {
  it("przyjmuje wyłącznie hosty z listy", () => {
    assert.ok(isAllowedFileUrl("https://videos.pexels.com/video-files/9/9-hd.mp4", HOSTS));
    assert.equal(isAllowedFileUrl("https://evil.example/9-hd.mp4", HOSTS), false);
    assert.equal(isAllowedFileUrl("https://videos.pexels.com.evil.example/x.mp4", HOSTS), false);
  });

  it("nie przyjmuje adresów, których nie da się otworzyć ani sieci wewnętrznej", () => {
    assert.equal(isAllowedFileUrl("https://127.0.0.1/sejf.mp4", ["127.0.0.1"]), false);
    assert.equal(isAllowedFileUrl("https://localhost:3000/x.mp4", ["localhost"]), false);
    assert.equal(isAllowedFileUrl("wideo.mp4", HOSTS), false);
    assert.equal(isAllowedFileUrl(undefined, HOSTS), false);
  });
});

describe("allowedFileType", () => {
  it("normalizuje typ z nagłówka i ufa tylko listzie", () => {
    assert.equal(allowedFileType("Video/MP4; codecs=avc1", null, FIVE_MB), "video/mp4");
    assert.equal(allowedFileType("image/svg+xml", null, FIVE_MB), null);
    assert.equal(allowedFileType("text/html", null, FIVE_MB), null);
    assert.equal(allowedFileType(null, null, FIVE_MB), null);
  });

  it("odrzuca plik zgłoszony ponad limit, zanim przeczyta bajt", () => {
    assert.equal(allowedFileType("video/mp4", String(FIVE_MB + 1), FIVE_MB), null);
    assert.equal(allowedFileType("video/mp4", String(FIVE_MB), FIVE_MB), "video/mp4");
    // Brak content-length nie jest zaproszeniem: limit i tak sprawdza strumień.
    assert.equal(allowedFileType("video/mp4", null, FIVE_MB), "video/mp4");
    assert.equal(allowedFileType("video/mp4", "nie-liczba", FIVE_MB), "video/mp4");
  });
});

describe("vaultFileName", () => {
  it("rozszerza plik tylko po typie odpowiedzi", () => {
    assert.equal(vaultExtension("video/mp4"), "mp4");
    assert.equal(vaultExtension("video/quicktime"), null);
  });

  it("z nazwy katalogu nie zrobi ścieżki", () => {
    const name = vaultFileName("3045791", "../../etc/passwd | Widowisko!", "video/mp4");
    assert.equal(name, "3045791-etc-passwd-widowisko.mp4");
  });

  it("bez identyfikatora albo z nieznanym typem nie ma pliku", () => {
    assert.equal(vaultFileName("", "empty street", "video/mp4"), null);
    assert.equal(vaultFileName("3045791", "empty street", "application/x-sh"), null);
    assert.equal(vaultFileName("3045791", "", "video/mp4"), "3045791-ujecie.mp4");
  });
});

describe("pickStockFile", () => {
  it("wybiera pion w jakości, która mieści się w sejfie", () => {
    const chosen = pickStockFile([
      { link: "https://videos.pexels.com/a.mp4", quality: "uhd", width: 3840, height: 2160 },
      { link: "https://videos.pexels.com/b.mp4", quality: "hd", width: 1080, height: 1920 },
      { link: "https://videos.pexels.com/c.mp4", quality: "sd", width: 540, height: 960 },
    ]);
    assert.equal(chosen?.link, "https://videos.pexels.com/b.mp4");
  });

  it("bez pionu bierze najwyższy poziom, a bez sensownych wymiarów oddaje null", () => {
    const landscape = pickStockFile([
      { link: "https://videos.pexels.com/d.mp4", quality: "hd", width: 1920, height: 1080 },
      { link: "https://videos.pexels.com/e.mp4", quality: "hd", width: 1280, height: 720 },
    ]);
    assert.equal(landscape?.height, 1080);
    assert.equal(pickStockFile([{ link: "", quality: "hd", width: 0, height: 0 }]), null);
  });
});

describe("normalizeClip", () => {
  it("zwraca tylko ujęcie z identyfikatorem i adresem https", () => {
    const clip = normalizeClip({
      id: 3045791,
      duration: 11.4,
      image: "https://images.pexels.com/photos/x.jpeg",
      video_files: [
        {
          id: 1,
          quality: "hd",
          width: 1080,
          height: 1920,
          link: "https://videos.pexels.com/v.mp4",
        },
      ],
    });

    assert.equal(clip?.id, "3045791");
    assert.equal(clip?.fileUrl, "https://videos.pexels.com/v.mp4");
    assert.equal(clip?.durationSec, 11.4);
    assert.equal(normalizeClip({ id: 1, video_files: [] }), null);
    assert.equal(
      normalizeClip({
        id: 1,
        video_files: [
          { quality: "hd", width: 1, height: 2, link: "http://videos.pexels.com/v.mp4" },
        ],
      }),
      null,
    );
  });
});

describe("searchStockClips", () => {
  it("bez klucza mówi, że katalog milczy, zamiast oddawać pustą siatkę", async () => {
    delete process.env.PEXELS_API_KEY;
    const result = await searchStockClips("empty street night", 8);

    assert.deepEqual(result.clips, []);
    assert.match(result.notice, /PEXELS_API_KEY/);
  });

  it("bez frazy nie wychodzi do sieci", async () => {
    process.env.PEXELS_API_KEY = "test-klucz";
    const result = await searchStockClips("   ", 8);

    assert.deepEqual(result.clips, []);
    assert.match(result.notice, /fraz/);
    delete process.env.PEXELS_API_KEY;
  });
});
