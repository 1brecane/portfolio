/**
 * scrollToZone(zoneId)
 *
 * Smart anchor scroll for the journey. A nav/rail click can't just jump to
 * `#about`: the section is `position: sticky` inside a tall `.present-track`, so
 * landing at the track's top shows the slide *un-revealed* (`--present ≈ 0`,
 * content faded out). Instead we scroll to the point inside the track where the
 * slide is fully revealed and holding.
 *
 * Reveal math (see globals.css): a slide is fully in and not yet exiting around
 * `--present ≈ 0.65`, i.e. `trackTop + 0.65 * (trackHeight - viewport)`.
 *
 * In "flat" mode, on small screens, or under reduced motion the track isn't
 * pinned, so we fall back to a plain top-of-element scroll (minus the nav bar).
 */
const NAV_OFFSET = 80; // fixed NavBar height, so the heading isn't hidden under it
const REVEAL_POINT = 0.65; // --present where a slide is fully shown, pre-exit

export function scrollToZone(zoneId) {
  if (typeof window === "undefined" || !zoneId) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flat = document.documentElement.dataset.journeyMode === "flat";
  const small = window.innerWidth < 768;
  const pinned = !reduced && !flat && !small;

  const track = document.querySelector(`.present-track[data-journey="${zoneId}"]`);
  const behavior = reduced ? "auto" : "smooth";

  let top;
  if (track && pinned) {
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const revealDist = Math.max(0, track.offsetHeight - window.innerHeight);
    top = trackTop + revealDist * REVEAL_POINT;
  } else {
    const el = track || document.getElementById(zoneId);
    if (!el) return;
    top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  }

  window.scrollTo({ top: Math.max(0, top), behavior });
}
