import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { SplineScene } from '../ui/splite';

/**
 * Couche 3D du hero — chaîne de repli : Spline (WebGL) → visuel statique.
 *
 * Garde-fous :
 * - `prefers-reduced-motion` → pas de 3D du tout (fallback statique) ;
 * - pas d'URL de scène configurée → fallback statique ;
 * - erreur de chargement Spline → fallback statique (ErrorBoundary) ;
 * - la scène n'est montée que lorsqu'elle entre dans le viewport (lazy),
 *   et démontée si elle en sort largement (économie GPU/batterie) ;
 * - `pointer-events: none` : la 3D reste décorative, les CTA/nav au-dessus
 *   restent cliquables.
 *
 * Amélioration progressive WebGPU : quand le composant "hero-futuristic"
 * (three/webgpu + three/tsl) sera fourni, le monter ici derrière
 * `supportsWebGPU()` (src/utils/webgpu.ts) AVANT le palier Spline.
 */

class SplineErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('Hero 3D failed to load, falling back to static visual:', error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

interface Hero3DProps {
  /** URL .splinecode de la scène de voiture ; vide = visuel statique. */
  sceneUrl?: string;
  /** Visuel statique affiché tant que/si la 3D n'est pas disponible. */
  fallback: React.ReactNode;
  className?: string;
}

export const Hero3D: React.FC<Hero3DProps> = ({ sceneUrl, fallback, className = '' }) => {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Monte/démonte la scène selon la visibilité (marge large pour éviter le clignotement)
  useEffect(() => {
    if (!sceneUrl || reduceMotion) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sceneUrl, reduceMotion]);

  const use3D = !!sceneUrl && !reduceMotion;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {use3D && inView ? (
        <SplineErrorBoundary fallback={<>{fallback}</>}>
          {/* pointer-events-none : la 3D est décorative, tout reste cliquable au-dessus */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <SplineScene scene={sceneUrl!} className="w-full h-full" />
          </div>
          {/* Réserve la hauteur du bloc (la scène est en position absolue) */}
          <div className="w-full h-[500px]" />
        </SplineErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
};
