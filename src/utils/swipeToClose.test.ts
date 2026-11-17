import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSwipeHandleClasses,
  getSwipeSheetClasses,
  getSwipeStage,
  shouldCloseOnSwipeDown,
} from './swipeToClose';

test('shouldCloseOnSwipeDown closes when dragged >= 64px regardless of speed', () => {
  assert.equal(shouldCloseOnSwipeDown(64, 600), true);
  assert.equal(shouldCloseOnSwipeDown(95, 1000), true);
  assert.equal(shouldCloseOnSwipeDown(20, 500), false);
  assert.equal(shouldCloseOnSwipeDown(-30, 100), false);
});

test('shouldCloseOnSwipeDown closes on fast downward flick (>= 24px and >= 0.45 px/ms)', () => {
  assert.equal(shouldCloseOnSwipeDown(32, 50), true);
  assert.equal(shouldCloseOnSwipeDown(18, 20), false);
});

test('getSwipeStage transitions cleanly between idle, pulling, ready, and closing', () => {
  assert.equal(getSwipeStage(0, false), 'idle');
  assert.equal(getSwipeStage(25, false), 'pulling');
  assert.equal(getSwipeStage(70, false), 'ready');
  assert.equal(getSwipeStage(10, true), 'closing');
});

test('getSwipeSheetClasses and getSwipeHandleClasses return valid Tailwind classes without inline styles', () => {
  assert.ok(getSwipeSheetClasses('closing').includes('translate-y-full'));
  assert.ok(getSwipeSheetClasses('closing').includes('sheet-dragging'));
  assert.ok(getSwipeSheetClasses('ready').includes('translate-y-12'));
  assert.ok(getSwipeSheetClasses('pulling').includes('translate-y-4'));
  assert.ok(getSwipeHandleClasses('ready').includes('bg-[#0D9488]'));
});
