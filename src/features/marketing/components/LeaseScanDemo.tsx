import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, FileText, Home, Loader2, MousePointer2, TrendingUp, Upload, User } from 'lucide-react';
import { withLinks } from '@/features/legal/withLinks';

/**
 * The hero illustration: an ordinary lease turning into a property and a renter.
 *
 * It opens the way the real flow does: a file is dragged onto an empty drop zone, while the
 * property and renter cards below wait blank. Then the lease is drawn as paper — white, serif, a highlighter — so it reads as "your document"
 * against the app-styled cards below it. A scan line moves down the page, each phrase it reads
 * is highlighted, and the value flies as a chip into the card it fills. That flight is the
 * point of the whole thing: the visitor sees where every field came from.
 *
 * Built from tokens rather than shown as a screenshot, so it follows the theme, flips for RTL
 * and is translated. The Hebrew sample is a CPI-linked Israeli lease, the English one a fixed
 * yearly step, because CPI linkage is only offered in Israel. With reduced motion it shows the
 * finished state only.
 */

/** In the order they appear in the lease text, so the scan line only ever moves down. */
const FIELDS = ['renter', 'property', 'term', 'rent', 'increase'] as const;
type Field = (typeof FIELDS)[number];

const DRAG_MS = 1500;
const DRAG_MOVE_MS = 1100;
const DROP_MS = 550;
const UPLOAD_MS = 1300;
const INTRO_MS = 1000;
const STEP_MS = 900;
const FLIGHT_MS = 620;
const HOLD_MS = 4500;
const FADE_MS = 450;

/**
 * Phases: DRAG the file moving in · DROPPED landing in the zone · UPLOADING the progress
 * overlay · 0 the lease opens ·
 * 1..N extracting FIELDS[phase - 1] · DONE holding · FADING before the loop.
 */
const DRAG = -3;
const DROPPED = -2;
const UPLOADING = -1;
const DONE = FIELDS.length + 1;
const FADING = DONE + 1;

const HIGHLIGHTER = 'rgba(250, 204, 21, 0.5)';

interface Point {
  x: number;
  y: number;
}

interface Flight {
  index: number;
  from: Point;
  to: Point;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function centre(el: Element, origin: DOMRect): Point {
  const r = el.getClientRects()[0] ?? el.getBoundingClientRect();
  return { x: r.left + r.width / 2 - origin.left, y: r.top + r.height / 2 - origin.top };
}

export function LeaseScanDemo() {
  const { t } = useTranslation();
  const [reduced] = useState(prefersReducedMotion);
  const [phase, setPhase] = useState(() => (reduced ? DONE : DRAG));
  const [landed, setLanded] = useState(0);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [lineY, setLineY] = useState(0);
  const [drag, setDrag] = useState<{ from: Point; to: Point } | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<Partial<Record<Field, HTMLSpanElement | null>>>({});
  const targetRefs = useRef<Partial<Record<Field, HTMLSpanElement | null>>>({});

  // The loop itself.
  useEffect(() => {
    if (reduced) return;
    const delay =
      phase === DRAG
        ? DRAG_MS
        : phase === DROPPED
          ? DROP_MS
          : phase === UPLOADING
            ? UPLOAD_MS
          : phase === 0
            ? INTRO_MS
            : phase === DONE
              ? HOLD_MS
              : phase === FADING
                ? FADE_MS
                : STEP_MS;
    const id = window.setTimeout(() => {
      if (phase === FADING) {
        setLanded(0);
        setPhase(DRAG);
      } else {
        setPhase(phase + 1);
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [phase, reduced]);

  // The drag starts just outside the card, on the side facing the page, and ends on the zone.
  useLayoutEffect(() => {
    if (phase !== DRAG) return;
    const root = rootRef.current;
    const paper = paperRef.current;
    if (!root || !paper) return;
    const origin = root.getBoundingClientRect();
    const rtl = getComputedStyle(root).direction === 'rtl';
    setDrag({
      from: { x: rtl ? origin.width + 120 : -120, y: 20 },
      to: centre(paper, origin),
    });
  }, [phase]);

  // Each extraction step: move the scan line to the phrase and launch its chip.
  useLayoutEffect(() => {
    if (reduced || phase < 1 || phase > FIELDS.length) {
      setFlight(null);
      return;
    }
    const index = phase - 1;
    const field = FIELDS[index];
    const mark = markRefs.current[field];
    const target = targetRefs.current[field];
    const root = rootRef.current;
    const paper = paperRef.current;
    if (!mark || !target || !root || !paper) return;

    // Just under the phrase's first line, so the line underlines what it reads rather than striking it out.
    const first = mark.getClientRects()[0] ?? mark.getBoundingClientRect();
    setLineY(first.bottom - paper.getBoundingClientRect().top + 2);
    const origin = root.getBoundingClientRect();
    setFlight({ index, from: centre(mark, origin), to: centre(target, origin) });
  }, [phase, reduced]);

  const dropping = phase === DRAG || phase === DROPPED || phase === UPLOADING;
  const active = phase === DROPPED || phase === UPLOADING;
  // Still true while the zone fades out at phase 0, so it doesn't flash back to the drop hint.
  const uploading = phase === UPLOADING || phase === 0;
  const scanning = phase >= 1 && phase <= FIELDS.length;
  const finished = phase >= DONE;
  // `landed` is set when a chip arrives; the phase check covers a background tab, where the
  // transition never runs and so never ends.
  const filled = (i: number) => landed > i || phase > i + 1;

  const value = (field: Field) => (
    <span ref={(el) => void (targetRefs.current[field] = el)} className="relative inline-block max-w-full align-top">
      <span
        className="block truncate"
        style={{ opacity: filled(FIELDS.indexOf(field)) ? 1 : 0, transition: 'opacity 250ms ease' }}
      >
        {t(`marketing.scanDemo.fields.${field}.value`)}
      </span>
      {!filled(FIELDS.indexOf(field)) && (
        <span
          className="absolute inset-y-0 start-0 my-auto h-2 w-20 rounded-full"
          style={{ background: 'var(--color-input-filled-background)' }}
        />
      )}
    </span>
  );

  const marks = Object.fromEntries(
    FIELDS.map((field, i) => [
      field,
      <span
        ref={(el) => void (markRefs.current[field] = el)}
        className="rounded-[3px] px-[2px] -mx-[2px]"
        style={{
          background: phase > i ? HIGHLIGHTER : 'transparent',
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
          transition: 'background-color 300ms ease',
        }}
      >
        {t(`marketing.scanDemo.lease.phrases.${field}`)}
      </span>,
    ]),
  );

  return (
    <div
      className="w-full max-w-[420px] rounded-[16px]"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-outline)',
        boxShadow: '0 24px 60px -20px rgba(0,0,0,0.45)',
      }}
      aria-hidden="true"
    >
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--color-subtle-outline)' }}>
        <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {t('documentScan.scanLease')}
        </p>
      </div>

      <div
        ref={rootRef}
        className="relative px-5 pt-4 pb-5 flex flex-col gap-3"
        style={{ opacity: phase === FADING ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}
      >
        {/* The uploaded file */}
        <div
          className="flex items-center gap-2 text-[12.5px]"
          style={{ color: 'var(--color-text-primary)', opacity: dropping ? 0 : 1, transition: 'opacity 300ms ease' }}
        >
          <FileText size={15} className="shrink-0" style={{ color: 'var(--color-primary)' }} />
          {/* A file name reads left to right even on a Hebrew page — otherwise ".pdf" lands first */}
          <span className="flex-1 min-w-0 truncate">
            <span dir="ltr">{t('marketing.scanDemo.fileName')}</span>
          </span>
          {finished ? (
            <span className="flex items-center gap-1 shrink-0" style={{ color: 'var(--color-success)' }}>
              <Check size={14} strokeWidth={2.5} />
              {t('marketing.scanDemo.done')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
              <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              {t('marketing.scanDemo.reading')}
            </span>
          )}
        </div>

        {/* The lease itself, as paper */}
        <div
          ref={paperRef}
          className="relative rounded-[6px] px-4 pt-3.5 pb-4"
          style={{
            background: '#FFFFFF',
            color: '#334155',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
            fontFamily: "Georgia, 'David', 'Times New Roman', serif",
          }}
        >
          <p className="text-center text-[12px] font-bold" style={{ color: '#0F172A' }}>
            {t('marketing.scanDemo.lease.title')}
          </p>
          <p className="mt-2 text-[11.5px] leading-[1.7]">{withLinks(t('marketing.scanDemo.lease.body'), marks)}</p>
          <div className="mt-2.5 flex flex-col gap-[7px]">
            <span className="block h-[5px] rounded-full" style={{ background: 'rgba(15, 23, 42, 0.08)' }} />
            <span className="block h-[5px] w-3/4 rounded-full" style={{ background: 'rgba(15, 23, 42, 0.08)' }} />
          </div>

          {/* The drop zone, as the real scan drawer draws it, covering the page until the file lands */}
          <div
            className="pointer-events-none absolute -inset-px flex flex-col items-center justify-center gap-2 rounded-[12px] border-2 border-dashed"
            style={{
              fontFamily: "'Rubik', system-ui, sans-serif",
              borderColor: active ? 'var(--color-primary)' : 'var(--color-input-border)',
              background:
                active
                  ? 'color-mix(in srgb, var(--color-primary) 7%, var(--color-surface))'
                  : 'var(--color-surface)',
              opacity: dropping ? 1 : 0,
              transition: 'opacity 350ms ease, border-color 200ms ease, background-color 200ms ease',
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('documentScan.progress.uploading')}
                </span>
              </>
            ) : (
              <>
                <Upload size={20} style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)' }} />
                <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {t('marketing.scanDemo.dropHint')}
                </span>
              </>
            )}
            {/* Always rendered, so the jump from empty to full can transition */}
            <span
              className="mt-1 h-1 w-32 overflow-hidden rounded-full"
              style={{
                background: 'var(--color-input-filled-background)',
                opacity: uploading ? 1 : 0,
              }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  background: 'var(--color-primary)',
                  width: uploading ? '100%' : '0%',
                  transition: uploading ? `width ${UPLOAD_MS - 200}ms ease-out` : 'none',
                }}
              />
            </span>
          </div>

          {/* Scan line */}
          <span
            className="pointer-events-none absolute inset-x-2 h-[2px] rounded-full"
            style={{
              top: lineY,
              background: 'var(--color-primary)',
              boxShadow: '0 0 10px 1px var(--color-primary)',
              opacity: scanning ? 0.85 : 0,
              transition: 'top 450ms ease, opacity 250ms ease',
            }}
          />
        </div>

        {/* What the app builds from it */}
        <div className="grid grid-cols-2 gap-2.5">
          <ResultCard icon={Home} label={t('marketing.scanDemo.fields.property.label')}>
            <span className="block text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {value('property')}
            </span>
            <span
              className="mt-1 flex items-baseline gap-1 text-[12px]"
              style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}
            >
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {value('rent')}
              </span>
              {filled(FIELDS.indexOf('rent')) && <span className="shrink-0">{t('marketing.scanDemo.perMonth')}</span>}
            </span>
          </ResultCard>
          <ResultCard icon={User} label={t('marketing.scanDemo.fields.renter.label')}>
            <span className="block text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {value('renter')}
            </span>
            <span
              className="mt-1 block text-[12px]"
              style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {value('term')}
            </span>
          </ResultCard>
        </div>

        {/* The next rent change — where the increase clause lands */}
        <div
          className="flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5"
          style={{
            background: 'var(--color-primary-container)',
            opacity: filled(FIELDS.indexOf('increase')) ? 1 : 0,
            transition: 'opacity 400ms ease',
          }}
        >
          <TrendingUp size={15} strokeWidth={2.5} style={{ color: 'var(--color-on-primary-container)', flexShrink: 0 }} />
          <span
            ref={(el) => void (targetRefs.current.increase = el)}
            className="text-[12.5px] leading-snug"
            style={{ color: 'var(--color-on-primary-container)' }}
          >
            {t('marketing.scanDemo.next')}
          </span>
        </div>

        {drag && (phase === DRAG || phase === DROPPED) && (
          <DraggedFile
            from={drag.from}
            to={drag.to}
            dropped={phase === DROPPED}
            name={t('marketing.scanDemo.fileName')}
          />
        )}

        {flight && (
          <FlyingChip
            key={`${flight.index}-${flight.from.x}-${flight.from.y}`}
            from={flight.from}
            to={flight.to}
            label={t(`marketing.scanDemo.fields.${FIELDS[flight.index]}.value`)}
            onLanded={() => setLanded((n) => Math.max(n, flight.index + 1))}
          />
        )}
      </div>
    </div>
  );
}

function ResultCard({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Home;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-w-0 rounded-[12px] p-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex items-center justify-center rounded-[7px] shrink-0"
          style={{
            width: 22,
            height: 22,
            background: 'var(--color-primary-container)',
            color: 'var(--color-on-primary-container)',
          }}
        >
          <Icon size={13} strokeWidth={2.4} />
        </span>
        <span className="text-[11.5px]" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
      </div>
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}

/** One extracted value, travelling from the lease to the field it fills. */
function FlyingChip({
  from,
  to,
  label,
  onLanded,
}: {
  from: Point;
  to: Point;
  label: string;
  onLanded: () => void;
}) {
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    // Two frames: the chip has to be painted at its start before the move can transition.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setMoved(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  const at = moved ? to : from;
  return (
    <span
      className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
      style={{
        background: 'var(--color-primary)',
        color: 'var(--color-on-primary)',
        boxShadow: '0 6px 16px -4px rgba(37, 99, 235, 0.55)',
        transform: `translate(${at.x}px, ${at.y}px) translate(-50%, -50%) scale(${moved ? 0.9 : 1})`,
        transition: `transform ${FLIGHT_MS}ms cubic-bezier(0.5, 0, 0.2, 1)`,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName === 'transform') onLanded();
      }}
    >
      {label}
    </span>
  );
}

/** The lease file on its way into the drop zone, with the pointer carrying it. */
function DraggedFile({ from, to, dropped, name }: { from: Point; to: Point; dropped: boolean; name: string }) {
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    // A beat at the start so the visitor sees where it comes from.
    const id = window.setTimeout(() => setMoved(true), 150);
    return () => window.clearTimeout(id);
  }, []);

  const at = moved ? to : from;
  const transform = `translate(${at.x}px, ${at.y}px) translate(-50%, -50%) rotate(${moved ? -2 : -7}deg) scale(${dropped ? 0.7 : 1})`;
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-10"
      style={{
        transform,
        opacity: dropped ? 0 : 1,
        transition: dropped
          ? `transform ${DROP_MS - 150}ms ease, opacity ${DROP_MS - 150}ms ease`
          : `transform ${DRAG_MOVE_MS}ms cubic-bezier(0.45, 0, 0.2, 1)`,
      }}
    >
      <div
        className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12px] font-medium whitespace-nowrap"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-outline)',
          boxShadow: '0 14px 30px -8px rgba(0, 0, 0, 0.35)',
        }}
      >
        <FileText size={16} style={{ color: 'var(--color-primary)' }} />
        <span dir="ltr">{name}</span>
      </div>
      <MousePointer2
        size={20}
        className="absolute"
        style={{
          insetInlineEnd: -6,
          bottom: -12,
          color: '#0F172A',
          fill: '#FFFFFF',
          filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))',
        }}
      />
    </div>
  );
}
