import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIQUID_GLASS_PRESETS,
  computeLiquidGlassUV,
  generateDisplacementPixels,
  getLiquidGlassAberrationScales,
  roundedRectSDF,
  smoothStep,
} from './liquidGlassEngine';

test('smoothStep clamps smoothly between 0 and 1', () => {
  assert.equal(smoothStep(0, 1, -0.5), 0);
  assert.equal(smoothStep(0, 1, 0.5), 0.5);
  assert.equal(smoothStep(0, 1, 1.5), 1);
  assert.equal(smoothStep(1, 1, 1), 1);
});

test('roundedRectSDF returns negative inside and positive outside', () => {
  assert.ok(roundedRectSDF(0, 0, 0.3, 0.2, 0.1) < 0);
  assert.ok(roundedRectSDF(0.8, 0.8, 0.3, 0.2, 0.1) > 0);
});

test('computeLiquidGlassUV stays bounded in [0, 1] and leaves center stable', () => {
  const center = computeLiquidGlassUV(0.5, 0.5, 0.2);
  assert.equal(center.x, 0.5);
  assert.equal(center.y, 0.5);

  const edge = computeLiquidGlassUV(0.1, 0.1, 0.2);
  assert.ok(edge.x >= 0 && edge.x <= 1);
  assert.ok(edge.y >= 0 && edge.y <= 1);
});

test('getLiquidGlassAberrationScales halves displacement when overLight is true', () => {
  const lightScales = getLiquidGlassAberrationScales(LIQUID_GLASS_PRESETS.card);
  assert.equal(lightScales.effectiveScale, LIQUID_GLASS_PRESETS.card.displacementScale * 0.5);
  assert.equal(lightScales.redScale, -12);
  assert.ok(lightScales.greenScale > lightScales.redScale);
  assert.ok(lightScales.blueScale > lightScales.greenScale);

  const darkScales = getLiquidGlassAberrationScales({
    displacementScale: 40,
    aberrationIntensity: 2,
    overLight: false,
  });
  assert.equal(darkScales.effectiveScale, 40);
  assert.equal(darkScales.redScale, -40);
});

test('generateDisplacementPixels emits valid opaque RGBA displacement field', () => {
  const pixels = generateDisplacementPixels(16, 16, 0.2);
  assert.equal(pixels.length, 16 * 16 * 4);
  for (let i = 3; i < pixels.length; i += 4) {
    assert.equal(pixels[i], 255);
  }
});
