/**
 * v-scramble — glyph-scramble hover on a plain-text element.
 *
 * On mouseenter the text is rescrambled with the same ASCII glyph set the
 * SectionHeader decode uses, resolving left-to-right over ~0.3s. The original
 * text is read AT HOVER TIME (not cached at mount) so the EN/IT locale switch
 * stays correct, and it is always restored on leave/unmount — the element is
 * never left mid-scramble. A reactive text change mid-scramble (e.g. the locale
 * flips during the run) cancels the effect and keeps Vue's new text. Mutates
 * `firstChild.nodeValue` (not textContent) so the text node Vue tracks keeps
 * its identity.
 *
 * Apply ONLY to elements whose content is a single text node. No-ops on touch /
 * coarse pointers and under prefers-reduced-motion (checked per-enter, since
 * media can change at runtime). Hover-only and transient, so no sr-only
 * duplication is needed (unlike the persistent SectionHeader decode).
 */
const GLYPHS = ".·+*#@%&";
const FRAMES = 12;
const FRAME_MS = 26;

function canScramble() {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const vScramble = {
  mounted(el) {
    let timer = null;
    let original = null;

    // Stops the timer WITHOUT touching the DOM — used when Vue itself rewrote
    // the text (see the `updated` hook), where Vue's fresh value must win.
    function cancel() {
      clearInterval(timer);
      timer = null;
      original = null;
    }

    function restore() {
      if (original !== null && el.firstChild) {
        el.firstChild.nodeValue = original;
      }
      cancel();
    }

    function onEnter() {
      if (!canScramble() || !el.firstChild) return;
      restore();
      original = el.firstChild.nodeValue;
      const text = original;
      let frame = 0;
      timer = setInterval(() => {
        frame++;
        const settled = Math.floor((frame / FRAMES) * text.length);
        el.firstChild.nodeValue = text
          .split("")
          .map((ch, i) =>
            i < settled || /\s/.test(ch) ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join("");
        if (frame >= FRAMES) restore();
      }, FRAME_MS);
    }

    // A click on the label (its anchor navigates + smooth-scrolls) must not leave
    // the text frozen mid-scramble. The NavBar is position:fixed, so the cursor
    // can stay over the same link after the jump and never fire `mouseleave` —
    // restore explicitly on pointerdown/blur so the label always returns to full.
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", restore);
    el.addEventListener("pointerdown", restore);
    el.addEventListener("blur", restore, true);

    el._scrambleCancel = cancel;
    el._scrambleCleanup = () => {
      restore();
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", restore);
      el.removeEventListener("pointerdown", restore);
      el.removeEventListener("blur", restore, true);
    };
  },
  // Only cancel when Vue actually rewrote the text node (text vnode children
  // changed — that's exactly when setText ran with the new label, which must
  // be kept). Unrelated re-renders leave the DOM text alone, so an in-flight
  // scramble keeps running.
  updated(el, binding, vnode, prevVnode) {
    if (vnode.children !== prevVnode.children) el._scrambleCancel?.();
  },
  unmounted(el) {
    el._scrambleCleanup?.();
    delete el._scrambleCleanup;
    delete el._scrambleCancel;
  },
};
