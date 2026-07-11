import React, { useState } from 'react';
import { Language, Car, SpecialOffer } from '../../types';
import { motion } from 'motion/react';
import { CarDetailsModal } from './CarDetailsModal';
import { isSpecialOfferCurrent } from '../../utils/specialOffers';

interface SpecialOffersListingProps {
  lang: Language;
  specialOffers: SpecialOffer[];
  onOrder: (car: Car) => void;
}

export const SpecialOffersListing: React.FC<SpecialOffersListingProps> = ({
  lang,
  specialOffers,
  onOrder,
}) => {
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Promotions affichées : actives (non masquées), dans leur période de validité,
  // et dont la voiture n'est pas masquée du site.
  const activeOffers = specialOffers.filter(
    o => isSpecialOfferCurrent(o) && o.car.isHiddenFromSite !== true
  );

  return (
    <div className="relative min-h-screen bg-vel-void py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">

      {/* Faint cyan radial glow background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(220,38,38,0.04), transparent 70%)',
      }} />

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <p className="text-vel-red font-bold text-xs tracking-[0.25em] uppercase mb-4"
            style={{ fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Durée limitée', ar: 'لوقت محدود' }[lang]}
          </p>
          <h1 className="font-black text-6xl text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Offres Limitées', ar: 'عروض محدودة' }[lang]}
          </h1>
          <p className="text-vel-muted text-lg mt-4 max-w-2xl mx-auto">
            {{ fr: 'Des réductions exceptionnelles sur nos meilleurs véhicules', ar: 'تخفيضات استثنائية على أفضل سياراتنا' }[lang]}
          </p>
        </motion.div>

        {/* Special Offers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {activeOffers.map((offer, index) => {
            const discountPercent = Math.round((1 - offer.newPrice / offer.oldPrice) * 100);
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                whileHover={{ y: -8 }}
                className="vel-glass rounded-2xl overflow-hidden group transition-all duration-500"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.25)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(220,38,38,0.06)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.08)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Image with Discount Badge */}
                <div className="relative h-64 overflow-hidden bg-vel-abyss">
                  <img
                    src={offer.car.images?.[0] || `https://picsum.photos/seed/car/400/300`}
                    alt={`${offer.car.brand} ${offer.car.model}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0" style={{
                    background: 'linear-gradient(to top, rgba(8,12,20,0.85), transparent 60%)',
                  }} />

                  {/* Discount Badge — pulsing red (kept for semantic urgency) */}
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute top-4 right-4 w-20 h-20 rounded-full flex flex-col items-center justify-center text-white"
                    style={{
                      background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                      boxShadow: '0 0 20px rgba(239,68,68,0.5)',
                    }}
                  >
                    <p className="text-xl font-black leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                      -{discountPercent}%
                    </p>
                    <p className="text-[9px] font-bold tracking-wider">
                      {{ fr: 'RÉDUIT', ar: 'خصم' }[lang]}
                    </p>
                  </motion.div>

                  {/* Label promo (optionnel) */}
                  {offer.label && (
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-lg"
                      style={{ background: 'rgba(239,68,68,0.9)', fontFamily: 'var(--font-display)' }}>
                      {offer.label}
                    </div>
                  )}

                  {/* Car name overlay on image bottom — dégradé sombre conservé, texte clair */}
                  <div className="absolute bottom-4 left-4">
                    <h3 className="font-black text-2xl text-white" style={{ fontFamily: 'var(--font-display)' }}>
                      {offer.car.brand}{' '}
                      <span style={{ color: '#F87171' }}>{offer.car.model}</span>
                    </h3>
                    <p className="text-slate-200 text-sm">{offer.car.registration} · {offer.car.color}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">

                  {/* Specs pills */}
                  <div className="flex flex-wrap gap-2">
                    {[offer.car.energy, offer.car.transmission,
                      `${offer.car.seats} ${lang === 'fr' ? 'places' : 'مقاعد'}`,
                      `${offer.car.doors} ${lang === 'fr' ? 'portes' : 'أبواب'}`,
                    ].map((spec, i) => (
                      <span key={i} className="px-3 py-1 rounded-full text-xs font-medium text-vel-slate"
                        style={{ background: '#EEF2F7', border: '1px solid rgba(15,23,42,0.08)' }}>
                        {spec}
                      </span>
                    ))}
                  </div>

                  {/* Price comparison */}
                  <div className="rounded-xl p-4 space-y-3"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    {/* Old price */}
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold line-through" style={{ color: 'rgba(239,68,68,0.6)' }}>
                        {offer.oldPrice.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}
                      </p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
                        style={{ background: '#EF4444' }}>
                        {{ fr: 'Avant', ar: 'قبل' }[lang]}
                      </span>
                    </div>

                    {/* New price */}
                    <div className="flex items-center justify-between pt-2"
                      style={{ borderTop: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="font-black text-4xl" style={{ color: '#DC2626', fontFamily: 'var(--font-display)', textShadow: '0 0 20px rgba(220,38,38,0.2)' }}>
                        {offer.newPrice.toLocaleString()}
                        <span className="text-base ml-1" style={{ color: 'rgba(220,38,38,0.75)' }}>
                          {{ fr: 'DA/j', ar: 'د.ج/ي' }[lang]}
                        </span>
                      </p>
                      <span className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ background: '#DC2626', color: '#FFFFFF' }}>
                        {{ fr: 'Maintenant', ar: 'الآن' }[lang]}
                      </span>
                    </div>

                    {/* Savings chip */}
                    <div className="vel-glass-accent rounded-lg px-3 py-2 text-center">
                      <p className="text-xs font-bold" style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
                        {{ fr: 'Économisez', ar: 'وفر' }[lang]}{' '}
                        {(offer.oldPrice - offer.newPrice).toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}
                      </p>
                    </div>
                  </div>

                  {/* Période de validité (optionnelle) */}
                  {offer.endDate && (
                    <p className="text-xs font-bold px-3 py-2 rounded-lg text-center"
                      style={{ color: '#B45309', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                      {lang === 'fr'
                        ? `Valable jusqu'au ${new Date(offer.endDate).toLocaleDateString('fr-FR')}`
                        : `صالح حتى ${new Date(offer.endDate).toLocaleDateString('fr-FR')}`}
                    </p>
                  )}

                  {/* Note */}
                  {offer.note && (
                    <p className="text-xs text-vel-muted italic px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.06)' }}>
                      {offer.note}
                    </p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setSelectedCar(offer.car); setShowDetails(true); }}
                      className="btn-vel-ghost flex-1 py-3 text-sm"
                    >
                      {{ fr: 'Détails', ar: 'التفاصيل' }[lang]}
                    </button>
                    <button
                      onClick={() => onOrder(offer.car)}
                      className="btn-vel-red flex-1 py-3 text-sm"
                    >
                      {{ fr: 'Réserver', ar: 'احجز' }[lang]}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {activeOffers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <p className="text-vel-muted text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              {{ fr: 'Aucune offre spéciale actuellement', ar: 'لا توجد عروض خاصة حالياً' }[lang]}
            </p>
          </motion.div>
        )}
      </div>

      {/* Car Details Modal */}
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
