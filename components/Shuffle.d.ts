import type { CSSProperties } from 'react';

/**
 * Types for the JS component in Shuffle.jsx (React Bits).
 * Declared here so consumers get correctly optional props — TS otherwise infers
 * the params that have no default value (onShuffleComplete, colorFrom, colorTo)
 * as required.
 */
export interface ShuffleProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  shuffleDirection?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  maxDelay?: number;
  ease?: string | ((progress: number) => number);
  threshold?: number;
  rootMargin?: string;
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  textAlign?: CSSProperties['textAlign'];
  onShuffleComplete?: () => void;
  shuffleTimes?: number;
  animationMode?: 'evenodd' | 'random';
  loop?: boolean;
  loopDelay?: number;
  stagger?: number;
  scrambleCharset?: string;
  colorFrom?: string;
  colorTo?: string;
  triggerOnce?: boolean;
  respectReducedMotion?: boolean;
  triggerOnHover?: boolean;
}

declare const Shuffle: (props: ShuffleProps) => JSX.Element;
export default Shuffle;
