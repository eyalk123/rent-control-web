/**
 * Onboarding — the overlay (web).
 *
 * Draws whatever TourController says is active: a dimmed backdrop with a cutout around
 * the anchored element, and a card explaining it.
 *
 * This is where the two platforms deliberately stop sharing code. The mobile overlay
 * hand-rolls placement because it has to — four scrim rects, a measured card height, a
 * preferred/fallback/centre cascade, and a `physicalLeft` helper to undo React Native's
 * RTL swapping of `left` and `right`. None of that has a web equivalent worth writing:
 *
 *   - the cutout is one element with a very large `box-shadow` spread, so the "hole" and
 *     the backdrop are the same box and cannot drift apart;
 *   - CSS `left` is always physical and `getBoundingClientRect` always reports physical
 *     coordinates, so there is nothing to pre-compensate. The RTL bug that dominated the
 *     mobile work simply does not exist here;
 *   - Radix Popover already does collision detection, flipping and viewport clamping,
 *     which is exactly the cascade the mobile card implements by hand.
 *
 * What does need care is `side`, because Radix's sides are physical while the shared
 * schema's `start`/`end` are direction-relative. That mapping is the whole of the RTL
 * work on this platform, and `avoidCollisions` makes it forgiving if it is ever wrong.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as Popover from '@radix-ui/react-popover';
import { useTranslation } from 'react-i18next';
import { useAnchorRegistry, type AnchorRect } from './AnchorRegistry';
import { useTourController } from './TourController';
import { callbackKey, seedKey, tourStepKey, type Placement } from './types';

/** Breathing room around the highlighted element. */
const SPOTLIGHT_PAD = 8;
const SPOTLIGHT_RADIUS = 12;
/** Large enough to cover any viewport from any position — this is the backdrop. */
const SCRIM_SPREAD = 9999;
const SCRIM = 'rgba(8,14,24,0.72)';
const CARD_OFFSET = 12;
const EDGE_MARGIN = 16;

type Side = 'top' | 'right' | 'bottom' | 'left';

/** Radix sides are physical; the shared schema's `start`/`end` are not. */
function toSide(placement: Placement | undefined, isRtl: boolean): Side {
  switch (placement) {
    case 'top':
      return 'top';
    case 'start':
      return isRtl ? 'right' : 'left';
    case 'end':
      return isRtl ? 'left' : 'right';
    default:
      return 'bottom';
  }
}

function sameRect(a: AnchorRect | null, b: AnchorRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/**
 * The part of an anchor that is actually on screen.
 *
 * An anchor can be far taller than the viewport — a table of two hundred properties, a
 * month-grouped transaction list — and using its raw rect breaks the step twice over. The
 * cutout becomes larger than the screen, so the `9999px` shadow lands entirely outside it
 * and nothing looks dimmed at all; and Radix positions the card against a box whose top
 * and bottom are both off-screen. Its `shift()` only clamps the *main* axis, which for a
 * bottom-placed card is horizontal, so nothing pulls the card back into view vertically
 * and it is simply not on screen.
 *
 * Clamping to the intersection with the viewport fixes both: the highlight tracks the
 * visible slice, and the card is placed against something that exists. It is a no-op for
 * any anchor that already fits, which is nearly all of them. Mobile solves the same
 * problem with its own clamp — see its TourOverlay.
 */
function clampToViewport(rect: AnchorRect): AnchorRect {
  const top = Math.max(rect.y, 0);
  const left = Math.max(rect.x, 0);
  const bottom = Math.min(rect.y + rect.height, window.innerHeight);
  const right = Math.min(rect.x + rect.width, window.innerWidth);
  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function TourOverlay() {
  const controller = useTourController();
  const registry = useAnchorRegistry();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  /**
   * Where the cutout goes. Held in state so the very first render already places it —
   * an earlier version positioned it from a per-frame loop instead, which was wrong twice
   * over: driving state from that loop re-rendered the overlay sixty times a second and
   * left the tab unresponsive, and writing the style from the loop meant the spotlight was
   * unplaced on the frame it mounted and stayed that way wherever the browser throttles
   * animation frames.
   */
  const [rect, setRect] = useState<AnchorRect | null>(null);

  const active = controller?.active ?? null;
  const step = controller?.step ?? null;
  const anchorKey = step?.anchor ?? null;

  /** The live anchor element. */
  const anchorRef = useRef<HTMLElement | null>(null);

  /**
   * What Radix actually positions against: the anchor's *visible slice*, not the element.
   *
   * Handing it the element directly means an over-tall anchor pushes the card off-screen
   * entirely (see `clampToViewport`).
   *
   * The identity has to change with the rect, and that is not a detail. Radix's own
   * reposition loop only follows an anchor it can *find* scroll ancestors for, and a
   * virtual anchor has no DOM node to walk up from — so it listens to the window, which
   * in this app never scrolls (the only scroller is a div inside AppShell). Left stable,
   * the card is positioned once and then stays where it was: on the last step of the home
   * sweep, which scrolls the page to reach its anchor, it landed 200px below the fold with
   * the spotlight correctly on target, because the spotlight follows this component's
   * state and the card followed Radix's. Rebuilding the object whenever the measured rect
   * changes is what makes Radix re-measure. `useMemo` on the values, not the object, so a
   * render that changed nothing does not trigger a reposition loop.
   */
  const virtualAnchor = useMemo(
    () => ({
      getBoundingClientRect: () => {
        const el = anchorRef.current;
        if (!el) return new DOMRect(0, 0, 0, 0);
        const box = el.getBoundingClientRect();
        const c = clampToViewport({ x: box.x, y: box.y, width: box.width, height: box.height });
        return new DOMRect(c.x, c.y, c.width, c.height);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rect?.x, rect?.y, rect?.width, rect?.height],
  );

  // Follow the anchor for as long as the tour is on screen. One measurement was enough on
  // mobile, where a tour covers a static screen; here the page underneath can still move —
  // the user scrolls, the window is resized, a font swaps and the nav item changes width —
  // and a spotlight that has drifted off its target is worse than no spotlight at all.
  //
  // Event-driven rather than polled. Each of these fires only when something could
  // actually have moved, so an idle tour costs nothing, and `sameRect` keeps a scroll that
  // does not move the anchor from re-rendering anything. The scroll listener is on the
  // capture phase because the page scrolls inside AppShell's own container, not the
  // window, so a bubbling listener would never hear it.
  useEffect(() => {
    if (!anchorKey || !registry) {
      anchorRef.current = null;
      setRect(null);
      return;
    }
    const sync = () => {
      anchorRef.current = registry.get(anchorKey);
      const next = registry.measure(anchorKey);
      setRect((prev) => (sameRect(prev, next) ? prev : next));
    };
    sync();

    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    const observer = new ResizeObserver(sync);
    observer.observe(document.documentElement);
    const el = registry.get(anchorKey);
    if (el) observer.observe(el);

    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
      observer.disconnect();
    };
  }, [anchorKey, registry, active?.tour.id, active?.stepIndex]);

  const handleNext = useCallback(() => controller?.next(), [controller]);
  const handleBack = useCallback(() => controller?.back(), [controller]);
  const handleSkip = useCallback(() => controller?.skip(), [controller]);

  // Escape ends the tour, and ending it counts as seen — the web equivalent of Android's
  // back button. Handled here rather than on the popover so the centred, unanchored step
  // (which has no popover at all) behaves the same way.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSkip();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, handleSkip]);

  /**
   * Swallow every click outside the card, without blocking scrolling.
   *
   * Those two requirements pull against each other for a single full-screen backdrop: one
   * that receives pointer events stops the page scrolling (the backdrop is fixed on
   * `body`, and a wheel over it chains to `documentElement`, which is `overflow-hidden` —
   * the real scroller is a container inside AppShell, so the event never reaches it),
   * while one that ignores them lets clicks straight through to the app underneath.
   *
   * So they are separated: the backdrop ignores pointer events, and clicks are cancelled
   * here instead. Capture on `document` runs before React's root listener, so this stops
   * React `onClick` handlers on the page as well as native activation.
   */
  useEffect(() => {
    if (!active) return;
    const swallow = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('[data-tour-card]')) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const events = ['pointerdown', 'mousedown', 'click'] as const;
    events.forEach((type) => document.addEventListener(type, swallow, true));
    return () => events.forEach((type) => document.removeEventListener(type, swallow, true));
  }, [active]);

  /**
   * Bring the anchor into view when a step opens.
   *
   * Without this a step opens against wherever the user happened to be scrolled — the
   * spotlight is then somewhere off-screen and the step looks broken. `scrollIntoView`
   * walks up to AppShell's scroller on its own, so nothing here needs to know about it.
   *
   * `nearest` for an anchor that already fits, so a visible one does not jump; `start` for
   * one that is taller than the viewport or begins above the fold, since the top is the
   * part worth reading. The capture-phase listener above re-measures once the scroll
   * settles, so the spotlight follows without any extra work.
   */
  useEffect(() => {
    if (!active || !anchorKey || !registry) return;
    const el = registry.get(anchorKey);
    if (!el) return;
    const box = el.getBoundingClientRect();
    const tooTall = box.height > window.innerHeight;
    el.scrollIntoView({
      block: tooTall || box.top < 0 ? 'start' : 'nearest',
      behavior: 'smooth',
    });
  }, [active?.tour.id, active?.stepIndex, anchorKey, registry, active]);

  if (!active || !step) return null;

  const tourId = active.tour.id;
  const title = t(tourStepKey(tourId, step.id, 'title'));
  const body = t(tourStepKey(tourId, step.id, 'body'));
  const seedText = step.seed ? t(seedKey(step.seed.id)) : null;
  // Only on the first step, and only when the user actually saw the seed that sent them.
  const callback =
    active.arrivedFrom && active.stepIndex === 0 ? t(callbackKey(active.arrivedFrom)) : null;

  const total = active.tour.steps.length;
  const current = active.stepIndex + 1;

  const card = (
    <div
      // The one region clicks are not swallowed in — see the swallow effect above, which
      // looks for this attribute.
      data-tour-card
      className="pointer-events-auto w-[min(360px,calc(100vw-2rem))] rounded-2xl p-5 shadow-2xl"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-outline)',
      }}
    >
      {callback && (
        <p className="mb-1 text-[11.5px] font-semibold" style={{ color: 'var(--color-accent)' }}>
          {callback}
        </p>
      )}

      <h2 className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        {body}
      </p>

      {/* The seed. Visually a tier below the step's own copy: it is an invitation to
          something elsewhere, not an instruction about what is on screen. */}
      {seedText && (
        <div
          className="mt-3 rounded-[10px] p-2.5 text-[12px]"
          style={{
            background: 'var(--color-background)',
            // Logical, so the accent bar sits on the leading edge in both directions
            // without anything here having to know which one that is.
            borderInlineStartWidth: 3,
            borderInlineStartStyle: 'solid',
            borderInlineStartColor: 'var(--color-accent)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {seedText}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          {t('onboarding.ui.stepOf', { current, total })}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={controller?.isFirst ? handleSkip : handleBack}
            className="rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-[var(--color-input-filled-background)]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {controller?.isFirst ? t('onboarding.ui.skip') : t('onboarding.ui.back')}
          </button>
          <button
            type="button"
            onClick={handleNext}
            autoFocus
            className="rounded-lg px-4 py-2 text-[13px] font-bold transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}
          >
            {controller?.isLast ? t('onboarding.ui.done') : t('onboarding.ui.next')}
          </button>
        </div>
      </div>
    </div>
  );

  // A step with no anchor is a statement about the product rather than about a control,
  // so it gets no cutout and no positioning — just the card, centred.
  const anchored = anchorKey !== null && rect !== null;
  const visible = anchored && rect ? clampToViewport(rect) : null;

  return createPortal(
    <div
      // Ignores pointer events on purpose: that is what lets the page underneath scroll
      // (see the swallow effect above, which cancels the clicks instead). Clicking outside
      // the card does nothing at all — it does not advance, and it does not dismiss. A
      // stray click should neither skip a step the user has not read nor end the tour.
      className="pointer-events-none fixed inset-0 z-[1000]"
      style={{ background: anchored ? 'transparent' : SCRIM }}
    >
      {anchored && visible && (
        /* The cutout and the backdrop are one element: the shadow *is* the scrim, so it
           cannot drift out of register with the hole the way separate rects can. */
        <div
          aria-hidden
          // Identified by attribute rather than by class: the backdrop above is also a
          // `pointer-events-none fixed` div, so a class selector picks the wrong one.
          data-tour-spotlight
          className="pointer-events-none fixed"
          style={{
            top: visible.y - SPOTLIGHT_PAD,
            left: visible.x - SPOTLIGHT_PAD,
            width: visible.width + SPOTLIGHT_PAD * 2,
            height: visible.height + SPOTLIGHT_PAD * 2,
            borderRadius: SPOTLIGHT_RADIUS,
            boxShadow: `0 0 0 ${SCRIM_SPREAD}px ${SCRIM}`,
            outline: '2px solid var(--color-accent)',
            outlineOffset: -1,
          }}
        />
      )}

      {anchored ? (
        <Popover.Root open modal={false}>
          <Popover.Anchor virtualRef={{ current: virtualAnchor }} />
          <Popover.Portal>
            <Popover.Content
              side={toSide(step.placement, isRtl)}
              align="center"
              sideOffset={CARD_OFFSET}
              collisionPadding={EDGE_MARGIN}
              avoidCollisions
              role="dialog"
              aria-label={title}
              style={{ zIndex: 1001 }}
              // The overlay owns dismissal. Radix's own dismiss paths would end the tour
              // on a stray click or a blur, which is the behaviour we explicitly do not
              // want. Escape is handled once, above, for both branches.
              onPointerDownOutside={(e) => e.preventDefault()}
              onFocusOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              {card}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-4">
          <div className="pointer-events-auto" role="dialog" aria-label={title}>
            {card}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
