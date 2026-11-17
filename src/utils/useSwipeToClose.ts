import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  getSwipeHandleClasses,
  getSwipeSheetClasses,
  getSwipeStage,
  shouldCloseOnSwipeDown,
} from './swipeToClose';

export function useSwipeToClose(onClose: () => void, isOpen = true) {
  const startYRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const deltaYRef = useRef<number>(0);
  const [deltaY, setDeltaY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      startYRef.current = null;
      deltaYRef.current = 0;
      setDeltaY(0);
      setIsClosing(false);
    }
  }, [isOpen]);

  const triggerClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      deltaYRef.current = 0;
      setDeltaY(0);
      setIsClosing(false);
      onClose();
    }, 170);
  }, [onClose]);

  const beginDrag = useCallback((clientY: number, target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (el && el.closest('button, a, input, select, textarea')) {
      return false;
    }
    startYRef.current = clientY;
    startTimeRef.current = Date.now();
    deltaYRef.current = 0;
    return true;
  }, []);

  const moveDrag = useCallback((clientY: number) => {
    if (startYRef.current === null) return;
    const diff = clientY - startYRef.current;
    const nextDelta = diff > 0 ? diff : 0;
    deltaYRef.current = nextDelta;
    setDeltaY(nextDelta);
  }, []);

  const endDrag = useCallback(() => {
    if (startYRef.current === null) return;
    const elapsed = Date.now() - startTimeRef.current;
    const currentDelta = deltaYRef.current;
    startYRef.current = null;

    if (shouldCloseOnSwipeDown(currentDelta, elapsed)) {
      triggerClose();
    } else {
      deltaYRef.current = 0;
      setDeltaY(0);
    }
  }, [triggerClose]);

  // Attach non-passive window touchmove/touchend guards while dragging so touch
  // gestures starting on the top handle never get hijacked by browser pull-to-refresh
  useEffect(() => {
    if (!isOpen) return;

    const onWindowTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || e.touches.length !== 1) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      moveDrag(e.touches[0].clientY);
    };

    const onWindowTouchEnd = () => {
      if (startYRef.current === null) return;
      endDrag();
    };

    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowTouchEnd);
    window.addEventListener('touchcancel', onWindowTouchEnd);

    return () => {
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('touchcancel', onWindowTouchEnd);
    };
  }, [isOpen, moveDrag, endDrag]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    beginDrag(e.touches[0].clientY, e.target);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null || e.touches.length !== 1) return;
    moveDrag(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    endDrag();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    const started = beginDrag(e.clientY, e.target);
    if (started) {
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignore capture failure on synthetic events
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch' || startYRef.current === null) return;
    moveDrag(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'touch') return;
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }
    } catch {
      // Ignore release failure
    }
    endDrag();
  };

  const stage = getSwipeStage(deltaY, isClosing);

  return {
    stage,
    sheetMotionClass: getSwipeSheetClasses(stage),
    handleBarClass: getSwipeHandleClasses(stage),
    dragHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    },
  };
}
