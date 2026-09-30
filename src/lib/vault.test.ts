import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowedFileType, isAllowedFileUrl } from "./fetch-image.server";
import { normalizePixabayClip, pickPixabayTier, searchPixabayClips } from "./pixabay.server";
import { vaultExtension, vaultFileName, vaultIdPrefix } from "./vault.server";
import { normalizeClip, pickStockFile, searchStockClips } from "./pexels.server";

/**
 * Sejf ujęć to jedyne miejsce, w którym aplikacja ściąga obcy plik na dysk.
 * Bramki (host, typ, rozmiar, nazwa) są więc badane tutaj, bez sieci i bez
 * klucza — reszta to już tylko złożenie ich w jedno pobranie.
 */

const HOSTS = ["videos.pexels.com", "images.pexels.com", "cdn.pixabay.com"];
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

describe("pixabay", () => {
  const HIT = {
    id: 42,
    duration: 14,
    picture_2x: "https://cdn.pixabay.com/video/2024/01/01/42-poster.jpg",
    videos: {
      large: {
        url: "https://cdn.pixabay.com/video/2024/01/01/42-large.mp4",
        width: 2160,
        height: 3840,
        size: 90_000_000,
      },
      medium: {
        url: "https://cdn.pixabay.com/video/2024/01/01/42-medium.mp4",
        width: 1080,
        height: 1920,
        size: 8_000_000,
      },
      small: {
        url: "https://cdn.pixabay.com/video/2024/01/01/42-small.mp4",
        width: 720,
        height: 1280,
        size: 3_000_000,
      },
    },
  };

  it("biera pion w jakości, która zmieści się w sejfie", () => {
    const clip = normalizePixabayClip(HIT);

    assert.equal(clip?.id, "pixabay-42");
    assert.equal(clip?.fileUrl, "https://cdn.pixabay.com/video/2024/01/01/42-medium.mp4");
    assert.equal(clip?.bytes, 8_000_000);
    assert.equal(clip?.height, 1920);
  });

  it("poziom bierze dopiero bez pionu, a pusty hit nie jest ujęciem", () => {
    const landscape = pickPixabayTier(
      {
        videos: {
          large: {
            url: "https://cdn.pixabay.com/video/x.mp4",
            width: 1920,
            height: 1080,
            size: 1000,
          },
        },
      },
      FIVE_MB,
    );
    assert.equal(landscape?.width, 1920);
    assert.equal(pickPixabayTier({ videos: {} }, FIVE_MB), null);
    assert.equal(normalizePixabayClip({ id: 42, videos: {} }), null);
  });

  it("nie ufa adresowi, który nie jest https", () => {
    assert.equal(
      normalizePixabayClip({
        id: 42,
        videos: {
          medium: {
            url: "http://cdn.pixabay.com/video/x.mp4",
            width: 1080,
            height: 1920,
            size: 1000,
          },
        },
      }),
      null,
    );
  });

  it("bez klucza mówi, którego klucza brakuje", async () => {
    delete process.env.PIXABAY_API_KEY;
    const result = await searchPixabayClips("cold shower", 8);

    assert.deepEqual(result.clips, []);
    assert.match(result.notice, /PIXABAY_API_KEY/);
  });

  it("pliki Pixabaya wolno ściągać, strony już nie", () => {
    assert.ok(isAllowedFileUrl("https://cdn.pixabay.com/video/2024/x.mp4", HOSTS));
    assert.equal(isAllowedFileUrl("https://pixabay.com/video/2024/x.mp4", HOSTS), false);
  });
});

describe("vaultIdPrefix", () => {
  it("nazwa katalogu przeżywa, ścieżka nie", () => {
    assert.equal(vaultIdPrefix("pixabay-42"), "pixabay-42");
    assert.equal(vaultIdPrefix("Pixabay 42/../x"), "pixabay42x");
    assert.equal(
      vaultFileName("pixabay-42", "zimny prysznic", "video/mp4"),
      "pixabay-42-zimny-prysznic.mp4",
    );
  });
});
