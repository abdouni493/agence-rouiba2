/**
 * Détection WebGPU — utilisée pour l'amélioration progressive du hero 3D.
 * Le composant "hero-futuristic" (three/webgpu + three/tsl) ne doit être
 * monté QUE si ce test réussit ; sinon on retombe sur la scène Spline (WebGL)
 * puis sur le visuel statique. Ne jamais laisser un navigateur sans WebGPU
 * afficher un hero cassé.
 */
export async function supportsWebGPU(): Promise<boolean> {
  try {
    const gpu = (navigator as any).gpu;
    if (!gpu) return false;
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}
