import React from 'react';
import { Language, Car } from '../../types';
import { motion } from 'motion/react';
import { X, Fuel, Settings, Users, DoorOpen, Palette, Gauge } from 'lucide-react';

interface CarDetailsModalProps {
  lang: Language;
  car: Car;
  onClose: () => void;
  onOrder: (car: Car) => void;
}

export const CarDetailsModal: React.FC<CarDetailsModalProps> = ({ lang, car, onClose, onOrder }) => {
  const specs = [
    { icon: Fuel, label: { fr: 'Énergie', ar: 'الوقود' }, value: car.energy },
    { icon: Settings, label: { fr: 'Boîte', ar: 'علبة التروس' }, value: car.transmission },
    { icon: Users, label: { fr: 'Places', ar: 'مقاعد' }, value: `${car.seats} ${lang === 'fr' ? 'places' : 'مقاعد'}` },
    { icon: DoorOpen, label: { fr: 'Portes', ar: 'أبواب' }, value: `${car.doors} ${lang === 'fr' ? 'portes' : 'أبواب'}` },
    { icon: Palette, label: { fr: 'Couleur', ar: 'اللون' }, value: car.color },
    { icon: Gauge, label: { fr: 'Kilométrage', ar: 'الكيلومترات' }, value: `${car.mileage.toLocaleString()} km` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(12px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={e => e.stopPropagation()}
        className="relative rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          background: '#FFFFFF',
          border: '1px solid rgba(220,38,38,0.2)',
          boxShadow: '0 0 60px rgba(220,38,38,0.06), 0 25px 50px rgba(15,23,42,0.15)',
        }}
      >
        {/* Close Button */}
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 right-4 z-20 rounded-xl p-2 transition-all duration-200 text-vel-muted"
          style={{
            background: 'rgba(15,23,42,0.06)',
            border: '1px solid rgba(15,23,42,0.1)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; }}
        >
          <X size={20} />
        </motion.button>

        {/* Car Image */}
        <div className="relative h-80 overflow-hidden rounded-t-3xl bg-vel-abyss">
          {car.images?.[0] ? (
            <img
              src={car.images[0]}
              alt={`${car.brand} ${car.model}`}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-vel-dim text-6xl">🚗</div>
          )}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to top, rgba(13,18,32,0.95) 0%, rgba(13,18,32,0.3) 50%, transparent 100%)',
          }} />

          {/* Car name on image — le dégradé sombre reste, donc texte clair */}
          <div className="absolute bottom-6 left-6">
            <h2 className="font-black text-4xl text-white leading-none" style={{ fontFamily: 'var(--font-display)' }}>
              {car.brand}{' '}
              <span style={{ color: '#F87171' }}>{car.model}</span>
            </h2>
            <p className="text-slate-200 mt-1">
              {car.registration} · {car.year}
              {car.vin && ` · ${car.vin}`}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">

          {/* Specs Grid */}
          <div>
            <h3 className="font-bold text-xs tracking-[0.2em] uppercase mb-4"
              style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
              {{ fr: 'Caractéristiques', ar: 'الخصائص' }[lang]}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {specs.map((spec, i) => (
                <div key={i} className="vel-glass rounded-xl p-4 flex items-center gap-3">
                  <spec.icon size={16} className="flex-shrink-0" style={{ color: '#DC2626' }} />
                  <div className="min-w-0">
                    <p className="text-vel-muted text-xs">{spec.label[lang]}</p>
                    <p className="text-vel-ink font-bold text-sm truncate">{spec.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Section */}
          <div>
            <h3 className="font-bold text-xs tracking-[0.2em] uppercase mb-4"
              style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
              {{ fr: 'Tarifs', ar: 'الأسعار' }[lang]}
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="vel-glass-accent rounded-xl p-4 text-center">
                <p className="font-black text-2xl" style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
                  {car.priceDay.toLocaleString()}
                </p>
                <p className="text-vel-muted text-xs mt-1">
                  {{ fr: 'DA / jour', ar: 'د.ج / يوم' }[lang]}
                </p>
              </div>
              <div className="vel-glass rounded-xl p-4 text-center">
                <p className="font-black text-2xl text-vel-slate" style={{ fontFamily: 'var(--font-display)' }}>
                  {car.priceWeek.toLocaleString()}
                </p>
                <p className="text-vel-muted text-xs mt-1">
                  {{ fr: 'DA / semaine', ar: 'د.ج / أسبوع' }[lang]}
                </p>
              </div>
              <div className="vel-glass rounded-xl p-4 text-center">
                <p className="font-black text-2xl text-vel-slate" style={{ fontFamily: 'var(--font-display)' }}>
                  {car.priceMonth.toLocaleString()}
                </p>
                <p className="text-vel-muted text-xs mt-1">
                  {{ fr: 'DA / mois', ar: 'د.ج / شهر' }[lang]}
                </p>
              </div>
            </div>

            {/* Deposit */}
            <div className="rounded-xl p-4 flex items-center justify-between"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
              <div>
                <p className="text-xs text-vel-muted mb-0.5">{{ fr: 'Caution requise', ar: 'الكفالة المطلوبة' }[lang]}</p>
                <p className="font-black text-2xl text-vel-red" style={{ fontFamily: 'var(--font-display)' }}>
                  {car.deposit.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-vel-red text-lg"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                🏦
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-2" style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }}>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 btn-vel-ghost py-4"
            >
              {{ fr: 'Fermer', ar: 'إغلاق' }[lang]}
            </motion.button>
            <motion.button
              onClick={() => { onOrder(car); onClose(); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 btn-vel-cta py-4"
            >
              {{ fr: 'Réserver Maintenant', ar: 'احجز الآن' }[lang]}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
