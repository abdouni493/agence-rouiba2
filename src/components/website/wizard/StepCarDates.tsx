import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Search, CalendarCheck, Loader2 } from 'lucide-react';
import { Car } from '../../../types';
import { useWizard } from './WizardContext';
import { CarBookingCalendar } from './CarBookingCalendar';
import { SectionCard, SectionTitle, FieldLabel, inputClass, inputStyle, focusInput, blurInput, C, fromYmd } from './wizardUi';

/**
 * Étape 1 — Choisir une voiture + dates.
 * Sans voiture choisie : grille de sélection (avec recherche).
 * Si une recherche de disponibilité vient du landing : seules les voitures
 * DISPONIBLES sur la période choisie sont proposées (dates pré-remplies).
 * Avec voiture : calendrier aux dates réservées bloquées + heures de départ/retour.
 */
export const StepCarDates: React.FC = () => {
  const {
    lang, car, selectCar, range, setRange,
    departureTime, setDepartureTime, returnTime, setReturnTime,
    blockedRanges, loadingBlocked, days, promo, total,
    search, availableCars, loadingAvailability, agencies,
  } = useWizard();

  const [searchQuery, setSearchQuery] = useState('');

  const filteredCars = searchQuery.trim()
    ? availableCars.filter(c =>
        c.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.registration.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : availableCars;

  const fmt = (s: string) => fromYmd(s).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ');
  const agencyName = (id?: string) => agencies.find(a => a.id === id)?.name;

  // ─── Sélection de voiture ────────────────────────────────────────────────────
  if (!car) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="font-black text-3xl sm:text-4xl text-vel-ink mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {search
              ? { fr: 'Voitures disponibles', ar: 'السيارات المتاحة' }[lang]
              : { fr: 'Choisissez votre voiture', ar: 'اختر سيارتك' }[lang]}
          </h1>
          <p className="text-vel-muted">
            {{ fr: 'Cliquez sur un véhicule pour commencer votre réservation', ar: 'انقر على سيارة لبدء الحجز' }[lang]}
          </p>
        </div>

        {/* Bandeau récapitulatif de la recherche lancée depuis l'accueil */}
        {search && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 py-3.5 rounded-2xl text-sm"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.16)' }}
          >
            <span className="flex items-center gap-2 font-bold" style={{ color: C.accent }}>
              <CalendarCheck size={15} />
              {fmt(search.from)} → {fmt(search.to)}
            </span>
            {agencyName(search.departureAgencyId) && (
              <span className="text-vel-slate">
                🛫 {agencyName(search.departureAgencyId)}
                {search.returnAgencyId && search.returnAgencyId !== search.departureAgencyId && (
                  <> · 🛬 {agencyName(search.returnAgencyId)}</>
                )}
              </span>
            )}
            <span className="text-vel-muted text-xs">
              {loadingAvailability
                ? { fr: 'Vérification des disponibilités…', ar: 'جاري التحقق من التوفر…' }[lang]
                : `${filteredCars.length} ${{ fr: 'voiture(s) disponible(s)', ar: 'سيارة متاحة' }[lang]}`}
            </span>
          </motion.div>
        )}

        {/* Recherche */}
        <div className="relative flex items-center max-w-xl mx-auto">
          <Search size={18} className="absolute left-4 text-vel-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === 'fr' ? 'Rechercher par marque, modèle, immatriculation…' : 'ابحث بالماركة أو الموديل…'}
            className="w-full pl-12 pr-4 py-3.5 text-base rounded-2xl outline-none transition-all text-vel-ink placeholder:text-vel-dim font-medium"
            style={{ background: C.elevated, border: '1px solid rgba(220,38,38,0.16)' }}
            onFocus={focusInput} onBlur={blurInput}
          />
        </div>

        {loadingAvailability ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={30} className="animate-spin" style={{ color: C.accent }} />
          </div>
        ) : filteredCars.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-5xl block mb-4">🚗</span>
            <p className="text-vel-muted font-bold">
              {search
                ? { fr: 'Aucune voiture disponible sur cette période — modifiez vos dates', ar: 'لا توجد سيارات متاحة في هذه الفترة — غيّر التواريخ' }[lang]
                : { fr: 'Aucun véhicule disponible', ar: 'لا توجد سيارات متاحة' }[lang]}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCars.map((c, i) => (
              <motion.button
                key={c.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.4 }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => selectCar(c)}
                className="text-left rounded-2xl overflow-hidden transition-all duration-400 group cursor-pointer"
                style={{ background: C.elevated, border: '1px solid rgba(15,23,42,0.06)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.28)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 30px rgba(220,38,38,0.08)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.06)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <div className="h-40 overflow-hidden relative" style={{ background: C.surface }}>
                  {c.images?.[0] ? (
                    <img src={c.images[0]} alt={c.model} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-600"
                      referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🚗</div>
                  )}
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: C.accent, fontFamily: 'var(--font-display)' }}>
                    {c.year}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-black text-vel-ink text-base mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>
                    {c.brand} <span style={{ color: C.accent }}>{c.model}</span>
                  </h3>
                  <p className="text-vel-muted text-xs mb-3">{c.registration} · {c.color}</p>
                  <div className="flex items-center justify-between">
                    <p className="font-black text-lg" style={{ color: C.accent, fontFamily: 'var(--font-display)' }}>
                      {c.priceDay.toLocaleString()}
                      <span className="text-xs ml-1" style={{ color: 'rgba(220,38,38,0.75)' }}>
                        {{ fr: 'DA/j', ar: 'د.ج/ي' }[lang]}
                      </span>
                    </p>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(220,38,38,0.09)', border: '1px solid rgba(220,38,38,0.25)' }}>
                      <ChevronRight size={15} style={{ color: C.accent }} />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Calendrier + heures pour la voiture choisie ────────────────────────────
  return (
    <div className="space-y-6">
      {/* Bandeau voiture sélectionnée */}
      <div className="rounded-2xl flex gap-4 p-5 items-center"
        style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.16)' }}>
        <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: C.surface }}>
          {car.images?.[0]
            ? <img src={car.images[0]} alt={car.model} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">🚗</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-xl text-vel-ink truncate" style={{ fontFamily: 'var(--font-display)' }}>
            {car.brand} <span style={{ color: C.accent }}>{car.model}</span>
          </h2>
          <p className="text-vel-muted text-sm">
            {car.registration} · {promo
              ? <>
                  <span className="line-through">{car.priceDay.toLocaleString()}</span>{' '}
                  <span className="font-bold" style={{ color: C.accent }}>{promo.newPrice.toLocaleString()} DA/j</span>
                </>
              : <>{car.priceDay.toLocaleString()} DA/j</>}
          </p>
        </div>
        <button
          onClick={() => selectCar(null)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-vel-slate transition-colors"
          style={{ border: '1px solid rgba(15,23,42,0.12)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.accent; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.25)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.12)'; }}
        >
          <ChevronLeft size={14} />
          {{ fr: 'Choisir une autre voiture', ar: 'اختيار سيارة أخرى' }[lang]}
        </button>
      </div>

      {/* Calendrier */}
      <SectionCard>
        <SectionTitle>📅 {{ fr: 'Dates de location', ar: 'تواريخ الإيجار' }[lang]}</SectionTitle>
        <CarBookingCalendar
          lang={lang}
          range={range}
          onRangeChange={setRange}
          blockedRanges={blockedRanges}
          loading={loadingBlocked}
        />
      </SectionCard>

      {/* Heures */}
      <SectionCard>
        <SectionTitle>🕒 {{ fr: 'Heures', ar: 'الساعات' }[lang]}</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>{{ fr: 'Heure de départ *', ar: 'ساعة المغادرة *' }[lang]}</FieldLabel>
            <input type="time" value={departureTime}
              onChange={e => setDepartureTime(e.target.value)}
              className={inputClass} style={inputStyle}
              onFocus={focusInput} onBlur={blurInput} />
          </div>
          <div>
            <FieldLabel>{{ fr: 'Heure de retour *', ar: 'ساعة العودة *' }[lang]}</FieldLabel>
            <input type="time" value={returnTime}
              onChange={e => setReturnTime(e.target.value)}
              className={inputClass} style={inputStyle}
              onFocus={focusInput} onBlur={blurInput} />
          </div>
        </div>

        {/* Aperçu durée + prix */}
        {days > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.1)' }}
          >
            <span className="text-xl">📅</span>
            <span className="text-vel-slate font-bold text-sm">
              {days} {{ fr: 'jour(s)', ar: 'يوم' }[lang]} ·{' '}
              <span style={{ color: C.accent }}>{total.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}</span>
              {promo && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded font-bold text-white" style={{ background: '#EF4444' }}>
                  {promo.label || (lang === 'fr' ? 'Promo' : 'عرض')}
                </span>
              )}
            </span>
          </motion.div>
        )}
      </SectionCard>
    </div>
  );
};
