import React, { useMemo } from 'react';
import { GRID_H, GRID_W, generateBuddy, type Emotion } from './spriteGen';

/**
 * Buddy-Renderer: prozedural generierte Pixel → crisp SVG.
 * stage: 1..9 (Evolutionsstufe), emotion: Mimik.
 */
export function Buddy({ stage, emotion = 'neutral', size = 96, animate = true }: {
  stage: number;
  emotion?: Emotion;
  size?: number;
  animate?: boolean;
}) {
  const pixels = useMemo(() => generateBuddy(stage, emotion), [stage, emotion]);

  return (
    <svg
      viewBox={`0 0 ${GRID_W} ${GRID_H}`}
      width={size}
      height={(size / GRID_W) * GRID_H}
      shapeRendering="crispEdges"
      className={animate ? 'anim-bob' : ''}
      role="img"
      aria-label={`Buddy – Stufe ${stage}`}
    >
      {pixels.map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width={1.02}
          height={1.02}
          fill={p.color}
          className={p.sparkle ? 'sprite-sparkle' : undefined}
          style={p.sparkle ? { animationDelay: `${((p.x * 7 + p.y * 13) % 18) / 10}s` } : undefined}
        />
      ))}
    </svg>
  );
}

export type { Emotion };
