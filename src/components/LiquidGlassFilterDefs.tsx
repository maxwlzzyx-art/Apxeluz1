import React, { useEffect, useState } from 'react';
import {
  LIQUID_GLASS_PRESETS,
  LiquidGlassPresetKey,
  createDisplacementDataUrl,
  getLiquidGlassAberrationScales,
} from '../utils/liquidGlassEngine';

const PRESET_ORDER: LiquidGlassPresetKey[] = ['navbar', 'card', 'button', 'panel'];

export const LiquidGlassFilterDefs: React.FC = () => {
  const [maps, setMaps] = useState<Partial<Record<LiquidGlassPresetKey, string>>>({});

  useEffect(() => {
    const generated: Partial<Record<LiquidGlassPresetKey, string>> = {};
    for (const key of PRESET_ORDER) {
      const url = createDisplacementDataUrl(LIQUID_GLASS_PRESETS[key]);
      if (url) {
        generated[key] = url;
      }
    }
    setMaps(generated);

    // Chromium supports SVG url(#...) displacement filters inside backdrop-filter;
    // Firefox/Safari keep crisp CSS backdrop-filter blur + specular rim without dropping the rule.
    const ua = navigator.userAgent.toLowerCase();
    const isFirefox = ua.includes('firefox');
    const isChromium = ua.includes('chrome') || ua.includes('edg') || ua.includes('crios');
    if (!isFirefox && isChromium && Object.keys(generated).length > 0) {
      document.documentElement.classList.add('lg-refract-ready');
      return () => {
        document.documentElement.classList.remove('lg-refract-ready');
      };
    }
  }, []);

  return (
    <>
      {/* Subtle Ambient Refraction Orbs (Solid 5-Role Palette Only, Zero Gradients) */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none"
        aria-hidden="true"
      >
        <div className="liquid-glass-orb liquid-glass-orb-primary" />
        <div className="liquid-glass-orb liquid-glass-orb-secondary" />
        <div className="liquid-glass-orb liquid-glass-orb-calm" />
        <div className="liquid-glass-orb liquid-glass-orb-warm" />
      </div>

      {/* SVG Optical Refraction & Chromatic Aberration Filter Definitions (rdev/liquid-glass-react engine) */}
      {Object.keys(maps).length > 0 && (
        <svg
          className="fixed w-0 h-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <defs>
            {PRESET_ORDER.map((key) => {
              const mapUrl = maps[key];
              if (!mapUrl) return null;
              const preset = LIQUID_GLASS_PRESETS[key];
              const scales = getLiquidGlassAberrationScales(preset);

              return (
                <filter
                  key={preset.id}
                  id={preset.id}
                  x="0%"
                  y="0%"
                  width="100%"
                  height="100%"
                  colorInterpolationFilters="sRGB"
                >
                  <feImage
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    result="DISPLACEMENT_MAP"
                    href={mapUrl}
                    preserveAspectRatio="none"
                  />
                  <feColorMatrix
                    in="DISPLACEMENT_MAP"
                    type="matrix"
                    values="0.3 0.3 0.3 0 0
                            0.3 0.3 0.3 0 0
                            0.3 0.3 0.3 0 0
                            0 0 0 1 0"
                    result="EDGE_INTENSITY"
                  />
                  <feComponentTransfer in="EDGE_INTENSITY" result="EDGE_MASK">
                    <feFuncA
                      type="discrete"
                      tableValues={`0 ${preset.aberrationIntensity * 0.05} 1`}
                    />
                  </feComponentTransfer>
                  <feOffset in="SourceGraphic" dx="0" dy="0" result="CENTER_ORIGINAL" />

                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="DISPLACEMENT_MAP"
                    scale={scales.redScale}
                    xChannelSelector="R"
                    yChannelSelector="B"
                    result="RED_DISPLACED"
                  />
                  <feColorMatrix
                    in="RED_DISPLACED"
                    type="matrix"
                    values="1 0 0 0 0
                            0 0 0 0 0
                            0 0 0 0 0
                            0 0 0 1 0"
                    result="RED_CHANNEL"
                  />

                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="DISPLACEMENT_MAP"
                    scale={scales.greenScale}
                    xChannelSelector="R"
                    yChannelSelector="B"
                    result="GREEN_DISPLACED"
                  />
                  <feColorMatrix
                    in="GREEN_DISPLACED"
                    type="matrix"
                    values="0 0 0 0 0
                            0 1 0 0 0
                            0 0 0 0 0
                            0 0 0 1 0"
                    result="GREEN_CHANNEL"
                  />

                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="DISPLACEMENT_MAP"
                    scale={scales.blueScale}
                    xChannelSelector="R"
                    yChannelSelector="B"
                    result="BLUE_DISPLACED"
                  />
                  <feColorMatrix
                    in="BLUE_DISPLACED"
                    type="matrix"
                    values="0 0 0 0 0
                            0 0 0 0 0
                            0 0 1 0 0
                            0 0 0 1 0"
                    result="BLUE_CHANNEL"
                  />

                  <feBlend in="GREEN_CHANNEL" in2="BLUE_CHANNEL" mode="screen" result="GB_COMBINED" />
                  <feBlend in="RED_CHANNEL" in2="GB_COMBINED" mode="screen" result="RGB_COMBINED" />
                  <feGaussianBlur
                    in="RGB_COMBINED"
                    stdDeviation={scales.edgeBlurStdDev}
                    result="ABERRATED_BLURRED"
                  />
                  <feComposite
                    in="ABERRATED_BLURRED"
                    in2="EDGE_MASK"
                    operator="in"
                    result="EDGE_ABERRATION"
                  />
                  <feComponentTransfer in="EDGE_MASK" result="INVERTED_MASK">
                    <feFuncA type="table" tableValues="1 0" />
                  </feComponentTransfer>
                  <feComposite
                    in="CENTER_ORIGINAL"
                    in2="INVERTED_MASK"
                    operator="in"
                    result="CENTER_CLEAN"
                  />
                  <feComposite in="EDGE_ABERRATION" in2="CENTER_CLEAN" operator="over" />
                </filter>
              );
            })}
          </defs>
        </svg>
      )}
    </>
  );
};
