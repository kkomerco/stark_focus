import type { SlideData } from "../types";
import { formatStarkCaption, starkHashtags, stripHashtagTail } from "./caption";

/** Wyróżnienia i krój nie zmieniają znaczenia materiału ani dopasowania opisu. */
export function carouselContentKey(slides: SlideData[]): string {
  return JSON.stringify(slides.map(({ headline, bodyText }) => [headline.trim(), bodyText.trim()]));
}

/** Hashtagi wynikają z aktualnych slajdów, nie ze starego podpisu. */
export function carouselCaptionText(
  slides: SlideData[],
  caption: string,
  fallbackThesis = "",
): string {
  const thesis = slides.find((slide) => slide.headline.trim())?.headline || fallbackThesis;
  const bare = stripHashtagTail(caption.trim());
  if (!bare) return formatStarkCaption(thesis, []);
  const material = slides.map((slide) => `${slide.headline} ${slide.bodyText}`).join(" ");
  return `${bare}\n\n${starkHashtags(material || thesis).join(" ")}`;
}
