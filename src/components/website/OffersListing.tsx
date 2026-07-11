import React, { useState } from 'react';
import { Language, Car, SpecialOffer } from '../../types';
import { motion, useReducedMotion } from 'motion/react';
import { Fuel, Settings, Users, DoorOpen, Gauge } from 'lucide-react';
import { CarDetailsModal } from './CarDetailsModal';
import { getCurrentSpecialOfferForCar } from '../../utils/specialOffers';

interface OffersListingProps {
  lang: Language;
  /** Voitures visibles sur le site (les masquées sont déjà exclues en amont). */
  cars: Car[];
  specialOffers: SpecialOffer[];
  onOrder: (car: Car) => void;
}

/**
 * Grille publique dense : jusqu'à 4 cartes par rangée sur desktop, 2 sur téléphone.
 * Toute la carte est cliquable (→ détails) ; le bouton Réserver lance le wizard
 * avec la voiture présélectionnée (stopPropagation pour ne pas ouvrir les détails).
 */
export const OffersListing: React.FC<OffersListingProps> = ({ lang, cars, specialOffers, onOrder }) => {
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const reduceMotion = useReducedMotion();

  const openDetails = (car: Car) => {
    setSelectedCar(car);
    setShowDetails(true);
  };

  return (
    <div className="min-h-screen bg-vel-void py-20 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <p className="font-bold text-xs tracking-[0.25em] uppercase mb-4"
            style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Nos Véhicules', ar: 'سياراتنا' }[lang]}
          </p>
          <h1 className="font-black text-5xl sm:text-6xl text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
            {{ fr: 'La Flotte', ar: 'الأسطول' }[lang]}
          </h1>
          <p className="text-vel-muted text-lg mt-4 max-w-2xl mx-auto">
            {{ fr: 'Découvrez notre sélection de véhicules premium avec les meilleures offres', ar: 'اكتشف تشكيلتنا من السيارات الفاخرة مع أفضل العروض' }[lang]}
          </p>
        </motion.div>

        {/* Grille compacte : 1 (<360px) / 2 (téléphone) / 3 (tablette) / 4 (desktop) */}
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {cars.map((car, index) => {
            const promo = getCurrentSpecialOfferForCar(car.id, specialOffers);
            const specs = [
              { icon: Fuel, value: car.energy },
              { icon: Settings, value: car.transmission },
              { icon: Users, value: `${car.seats}` },
              { icon: DoorOpen, value: `${car.doors}` },
              { icon: Gauge, value: `${(car.mileage / 1000).toFixed(0)}k km` },
            ];
            return (
              <motion.div
                key={car.id}
                role="button"
                tabIndex={0}
                aria-label={lang === 'fr' ? `Voir les détails de ${car.brand} ${car.model}` : `عرض تفاصيل ${car.brand} ${car.model}`}
                onClick={() => openDetails(car)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDetails(car);
                  }
                }}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: reduceMotion ? 0 : Math.min(index % 8, 6) * 0.05, duration: 0.45 }}
                whileHover={reduceMotion ? {} : { y: -4 }}
                className="vel-glass rounded-xl overflow-hidden group cursor-pointer transition-shadow duration-300 flex flex-col outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.25)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(220,38,38,0.09)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.08)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Image compacte */}
                <div className="relative aspect-[4/3] overflow-hidden bg-vel-abyss">
                  <img
                    src={car.images?.[0] || 'https://picsum.photos/seed/car/400/300'}
                    alt={`${car.brand} ${car.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,12,20,0.7), transparent 55%)' }} />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm"
                    style={{ color: '#DC2626', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', fontFamily: 'var(--font-display)' }}>
                    {car.year}
                  </div>
                  {promo && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow"
                      style={{ background: '#EF4444', fontFamily: 'var(--font-display)' }}>
                      {promo.label || `-${Math.round((1 - promo.newPrice / promo.oldPrice) * 100)}%`}
                    </div>
                  )}
                </div>

                {/* Contenu compact */}
                <div className="p-3 flex flex-col gap-2.5 flex-1">
                  {/* Nom */}
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-vel-ink truncate" style={{ fontFamily: 'var(--font-display)' }}>
                      {car.brand} <span style={{ color: '#DC2626' }}>{car.model}</span>
                    </h3>
                    <p className="text-vel-muted text-[10px] truncate">{car.registration} · {car.color}</p>
                  </div>

                  {/* Specs : tous les détails en micro-puces */}
                  <div className="flex flex-wrap gap-1">
                    {specs.map((s, i) => (
                      <span key={i}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-vel-slate"
                        style={{ background: '#EEF2F7', border: '1px solid rgba(15,23,42,0.07)' }}>
                        <s.icon size={9} style={{ color: 'rgba(220,38,38,0.55)' }} />
                        {s.value}
                      </span>
                    ))}
                  </div>

                  {/* Tous les tarifs, en rangées compactes */}
                  <div className="rounded-lg px-2.5 py-2 space-y-1 mt-auto"
                    style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.1)' }}>
                    <div className="flex justify-between items-baseline text-[10px]">
                      <span className="text-vel-muted">{{ fr: 'Jour', ar: 'يوم' }[lang]}</span>
                      {promo ? (
                        <span className="font-black text-xs" style={{ color: '#DC2626' }}>
                          <span className="line-through mr-1 font-medium" style={{ color: 'rgba(148,163,184,0.7)' }}>
                            {car.priceDay.toLocaleString()}
                          </span>
                          {promo.newPrice.toLocaleString()} DA
                        </span>
                      ) : (
                        <span className="font-black text-xs" style={{ color: '#DC2626' }}>{car.priceDay.toLocaleString()} DA</span>
                      )}
                    </div>
                    <div className="flex justify-between items-baseline text-[10px]">
                      <span className="text-vel-muted">{{ fr: 'Semaine', ar: 'أسبوع' }[lang]}</span>
                      <span className="font-bold text-vel-slate">{car.priceWeek.toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between items-baseline text-[10px]">
                      <span className="text-vel-muted">{{ fr: 'Mois', ar: 'شهر' }[lang]}</span>
                      <span className="font-bold text-vel-slate">{car.priceMonth.toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between items-baseline text-[10px] pt-1" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
                      <span className="text-vel-muted">{{ fr: 'Caution', ar: 'الكفالة' }[lang]}</span>
                      <span className="font-bold" style={{ color: 'rgba(248,113,113,0.9)' }}>{car.deposit.toLocaleString()} DA</span>
                    </div>
                  </div>

                  {/* Réserver — stopPropagation pour ne pas ouvrir les détails */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onOrder(car);
                    }}
                    className="btn-vel-cta w-full py-2 text-xs"
                  >
                    {{ fr: 'Réserver', ar: 'احجز' }[lang]}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {cars.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <p className="text-vel-muted text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              {{ fr: 'Aucun véhicule disponible actuellement', ar: 'لا توجد سيارات متاحة حالياً' }[lang]}
            </p>
          </motion.div>
        )}
      </div>

      {/* Détails : ouverts par un clic n'importe où sur la carte */}
      {showDetails && selectedCar && (
        <CarDetailsModal
          lang={lang}
          car={selectedCar}
          onClose={() => setShowDetails(false)}
          onOrder={onOrder}
        />
      )}
    </div>
  );
};
