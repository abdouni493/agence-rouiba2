import { SpecialOffer } from '../types';

/**
 * Une offre spéciale est "en cours" si elle est affichée (isActive)
 * et que la date du jour est dans sa fenêtre de validité (bornes optionnelles).
 */
export function isSpecialOfferCurrent(offer: SpecialOffer, referenceDate?: string): boolean {
  if (!offer.isActive) return false;
  const today = referenceDate || new Date().toISOString().substring(0, 10);
  if (offer.startDate && today < offer.startDate.substring(0, 10)) return false;
  if (offer.endDate && today > offer.endDate.substring(0, 10)) return false;
  return true;
}

/** Retourne la promo en cours pour une voiture donnée, s'il y en a une. */
export function getCurrentSpecialOfferForCar(
  carId: string,
  offers: SpecialOffer[],
  referenceDate?: string
): SpecialOffer | undefined {
  return offers.find(o => o.carId === carId && isSpecialOfferCurrent(o, referenceDate));
}
