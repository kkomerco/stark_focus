// src/lib/carousel.ts
// Kontrakt karuzeli: ile slajdów ma materiał. Jedno miejsce, które czytają
// trasa AI, studio i bank treści — dawniej prompt kazał 12, trasa ucinała do
// dziesięciu, bank dawał pięć, a studio przyjmowało szesnaście, więc żadna
// liczba w UI nie znaczyła tego samego.
//
// Cel 12+ nie jest kaprysem: na kontach poniżej 10k obserwujących karuzele
// 11-20 slajdów wychodzą ponad medianę autora w 23,5% przypadków, te 2-4 slajdy
// w 18,0% (Eden, 655 385 karuzeli).
export const CAROUSEL_TARGET_SLIDES = 12;

/**
 * Sufit techniczny: canvas 1080x1350 renderuje się przy każdym kliknięciu, a
 * przewijanie szesnastu podglądów to granica, poza którą studia się nie da
 * przejrzeć. Model, który odda dwadzieścia slajdów, dostaje ścięte TUTAJ, a nie
 * w trzech osobnych miejscach.
 */
export const CAROUSEL_MAX_SLIDES = 16;
