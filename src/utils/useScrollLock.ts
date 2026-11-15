import { useEffect } from 'react';

let lockCount = 0;

function applyLockClass(locked: boolean) {
  if (typeof document === 'undefined') return;
  if (locked) {
    document.documentElement.classList.add('modal-scroll-lock');
    document.body.classList.add('modal-scroll-lock');
  } else {
    document.documentElement.classList.remove('modal-scroll-lock');
    document.body.classList.remove('modal-scroll-lock');
  }
}

/**
 * Reference-counted scroll lock using a CSS class (`modal-scroll-lock`)
 * so nested or sequential modals keep background scrolling disabled without
 * relying on inline style mutations (compliant with strict CSP).
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    lockCount += 1;
    if (lockCount === 1) {
      applyLockClass(true);
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        applyLockClass(false);
      }
    };
  }, [isLocked]);
}
