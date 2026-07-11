import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Chargé paresseusement : le runtime Spline (~1 Mo) ne rejoint jamais le bundle
// initial ; il n'est téléchargé que si une scène 3D est réellement affichée.
const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineSceneProps {
  /** URL .splinecode de la scène (ex : https://prod.spline.design/xxxx/scene.splinecode) */
  scene: string;
  className?: string;
}

/**
 * Rendu d'une scène Spline (WebGL — compatible avec la quasi-totalité des
 * navigateurs, contrairement au WebGPU). Affiche un loader discret pendant
 * le téléchargement de la scène.
 */
export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 size={28} className="animate-spin" style={{ color: 'rgba(220,38,38,0.5)' }} />
        </div>
      }
    >
      <Spline scene={scene} className={className} />
    </Suspense>
  );
}
