import { useCallback, useRef } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE_PX = 10;

/**
 * Fires `onLongPress` after holding a pointer down for ~500ms without moving.
 * Returns pointer handlers to spread onto a touchable element. Used to enter
 * select mode on touch devices, matching the mobile long-press affordance.
 *
 * Only reacts to touch/pen pointers so a normal mouse click is unaffected.
 */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    start.current = null;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      onLongPress();
      clear();
    }, LONG_PRESS_MS);
  }, [onLongPress, clear]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = Math.abs(e.clientX - start.current.x);
    const dy = Math.abs(e.clientY - start.current.y);
    if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) clear();
  }, [clear]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
  };
}
