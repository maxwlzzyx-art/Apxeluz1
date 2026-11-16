export type SwipeStage = 'idle' | 'pulling' | 'ready' | 'closing';

export const SWIPE_CLOSE_DISTANCE_PX = 64;
export const SWIPE_CLOSE_VELOCITY_PX_MS = 0.45;
export const SWIPE_MIN_FLICK_DISTANCE_PX = 24;

export function getSwipeStage(deltaY: number, isClosing: boolean): SwipeStage {
  if (isClosing) return 'closing';
  if (deltaY >= SWIPE_CLOSE_DISTANCE_PX) return 'ready';
  if (deltaY > 8) return 'pulling';
  return 'idle';
}

export function shouldCloseOnSwipeDown(
  deltaY: number,
  elapsedMs: number
): boolean {
  if (!Number.isFinite(deltaY) || deltaY <= 0) return false;
  if (deltaY >= SWIPE_CLOSE_DISTANCE_PX) return true;

  const safeElapsed = Math.max(1, Number.isFinite(elapsedMs) ? elapsedMs : 1);
  const velocity = deltaY / safeElapsed;
  return (
    deltaY >= SWIPE_MIN_FLICK_DISTANCE_PX &&
    velocity >= SWIPE_CLOSE_VELOCITY_PX_MS
  );
}

export function getSwipeSheetClasses(stage: SwipeStage): string {
  switch (stage) {
    case 'closing':
      return 'translate-y-full opacity-0 transition-all duration-200 ease-in';
    case 'ready':
      return 'translate-y-8 opacity-95 scale-[0.985] transition-transform duration-100 ease-out';
    case 'pulling':
      return 'translate-y-2.5 scale-[0.995] transition-transform duration-75 ease-out';
    case 'idle':
    default:
      return 'translate-y-0 opacity-100 transition-all duration-200 ease-out';
  }
}

export function getSwipeHandleClasses(stage: SwipeStage): string {
  if (stage === 'ready' || stage === 'closing') {
    return 'w-14 h-1.5 rounded-full bg-[#0D9488] transition-all duration-150';
  }
  if (stage === 'pulling') {
    return 'w-12 h-1.5 rounded-full bg-[#0D9488]/70 transition-all duration-100';
  }
  return 'w-10 h-1.5 rounded-full bg-[#10242E]/20 transition-all duration-150';
}
