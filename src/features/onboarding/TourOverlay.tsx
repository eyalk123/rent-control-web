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
import { useCallback, useEffect, useRef, useState } from 'react';
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

  /** The anchor element, handed to Radix as a virtual reference. */
  const anchorRef = useRef<HTMLElement | null>(null);

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
      // Stops a click on the card from reaching the backdrop, which advances the tour.
      onClick={(e) => e.stopPropagation()}
      className="w-[min(360px,calc(100vw-2rem))] rounded-2xl p-5 shadow-2xl"
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

  return createPortal(
    <div
      // Clicking the backdrop advances rather than dismisses — a stray click should not
      // silently end a tour the user has not read. Same rule as mobile.
      onClick={handleNext}
      className="fixed inset-0 z-[1000]"
      style={{ background: anchored ? 'transparent' : SCRIM }}
    >
      {anchored && rect && (
        /* The cutout and the backdrop are one element: the shadow *is* the scrim, so it
           cannot drift out of register with the hole the way separate rects can. */
        <div
          aria-hidden
          className="pointer-events-none fixed"
          style={{
            top: rect.y - SPOTLIGHT_PAD,
            left: rect.x - SPOTLIGHT_PAD,
            width: rect.width + SPOTLIGHT_PAD * 2,
            height: rect.height + SPOTLIGHT_PAD * 2,
            borderRadius: SPOTLIGHT_RADIUS,
            boxShadow: `0 0 0 ${SCRIM_SPREAD}px ${SCRIM}`,
            outline: '2px solid var(--color-accent)',
            outlineOffset: -1,
          }}
        />
      )}

      {anchored ? (
        <Popover.Root open modal={false}>
          <Popover.Anchor virtualRef={anchorRef as React.RefObject<HTMLElement>} />
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
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <div role="dialog" aria-label={title}>
            {card}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
