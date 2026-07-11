import React, { useMemo, useState } from 'react';
import { DayPicker, Matcher } from 'react-day-picker';
import { fr as frLocale, ar as arLocale } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import { motion, AnimatePresence } from 'motion/react';
import { Eraser, Loader2 } from 'lucide-react';
import { Language } from '../../../types';
import { DateRangeSel } from './WizardContext';
import { toYmd, fromYmd, C } from './wizardUi';

interface CarBookingCalendarProps {
  lang: Language;
  range: DateRangeSel;
  onRangeChange: (range: DateRangeSel) => void;
  /** Périodes déjà réservées pour CETTE voiture (YYYY-MM-DD, bornes incluses). */
  blockedRanges: { from: string; to: string }[];
  loading?: boolean;
}

/**
 * Calendrier de réservation d'une voiture :
 * - les périodes déjà réservées et les dates passées sont désactivées ;
 * - sélection en deux clics : 1er clic = départ, 2e clic = retour ;
 * - entre les deux clics, la plage survolée est surlignée ;
 * - une plage qui chevauche une période réservée est refusée avec une explication.
 */
export const CarBookingCalendar: React.FC<CarBookingCalendarProps> = ({
  lang, range, onRangeChange, blockedRanges, loading = false,
}) => {
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const disabledMatchers: Matcher[] = useMemo(() => [
    { before: today },
    ...blockedRanges.map(r => ({ from: fromYmd(r.from), to: fromYmd(r.to) })),
  ], [blockedRanges]);

  // Une plage [from, to] chevauche-t-elle une période réservée ? (comparaison YYYY-MM-DD)
  const overlapsBlocked = (from: string, to: string): boolean =>
    blockedRanges.some(b => from <= b.to && b.from <= to);

  const handleDayClick = (day: Date) => {
    setRangeError(null);
    const clicked = toYmd(day);

    // Pas de départ encore, ou plage déjà complète → ce clic (re)devient le départ
    if (!range.from || (range.from && range.to)) {
      onRangeChange({ from: clicked, to: undefined });
      return;
    }

    // Deuxième clic → borne de retour (dans l'ordre chronologique)
    const [start, end] = clicked < range.from ? [clicked, range.from] : [range.from, clicked];

    if (overlapsBlocked(start, end)) {
      setRangeError(
        lang === 'fr'
          ? 'Cette période chevauche des dates déjà réservées. Choisissez une plage entièrement libre.'
          : 'هذه الفترة تتداخل مع تواريخ محجوزة بالفعل. اختر فترة متاحة بالكامل.'
      );
      return;
    }

    onRangeChange({ from: start, to: end });
  };

  const clearDates = () => {
    setRangeError(null);
    onRangeChange({});
  };

  // Surlignage de la plage survolée entre les deux clics
  const previewMatcher: Matcher[] = useMemo(() => {
    if (!range.from || range.to || !hoveredDay) return [];
    const from = fromYmd(range.from);
    return [hoveredDay >= from ? { from, to: hoveredDay } : { from: hoveredDay, to: from }];
  }, [range.from, range.to, hoveredDay]);

  const selected = range.from
    ? { from: fromYmd(range.from), to: range.to ? fromYmd(range.to) : undefined }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="wizard-calendar relative rounded-2xl p-4 sm:p-6 flex justify-center"
        style={{ background: 'rgba(15,23,42,0.02)', border: '1px solid rgba(15,23,42,0.08)' }}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl"
            style={{ background: 'rgba(248,250,252,0.8)' }}>
            <div className="flex items-center gap-2 text-vel-slate text-sm font-bold">
              <Loader2 size={18} className="animate-spin" style={{ color: C.accent }} />
              {lang === 'fr' ? 'Chargement des disponibilités…' : 'جاري تحميل التوفر…'}
            </div>
          </div>
        )}
        <DayPicker
          mode="range"
          selected={selected}
          onDayClick={handleDayClick}
          onDayMouseEnter={day => setHoveredDay(day)}
          onDayMouseLeave={() => setHoveredDay(null)}
          disabled={disabledMatchers}
          modifiers={{
            blocked: blockedRanges.map(r => ({ from: fromYmd(r.from), to: fromYmd(r.to) })),
            preview: previewMatcher,
          }}
          modifiersClassNames={{
            blocked: 'wizard-day-blocked',
            preview: 'wizard-day-preview',
          }}
          locale={lang === 'ar' ? arLocale : frLocale}
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          numberOfMonths={1}
          showOutsideDays={false}
        />
      </div>

      {/* Légende + effacer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-vel-muted font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: C.accent }} />
            {lang === 'fr' ? 'Sélectionné' : 'محدد'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.45)' }} />
            {lang === 'fr' ? 'Déjà réservé' : 'محجوز'}
          </span>
        </div>
        <button
          onClick={clearDates}
          disabled={!range.from}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
            range.from ? 'text-vel-slate hover:text-red-400' : 'text-vel-dim cursor-not-allowed'
          }`}
          style={{ border: '1px solid rgba(15,23,42,0.1)' }}
        >
          <Eraser size={13} />
          {lang === 'fr' ? 'Effacer les dates' : 'مسح التواريخ'}
        </button>
      </div>

      {/* Aide / erreur */}
      <AnimatePresence mode="wait">
        {rangeError ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm font-bold px-4 py-3 rounded-xl"
            style={{ color: '#DC2626', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            ⚠️ {rangeError}
          </motion.p>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-vel-muted"
          >
            {!range.from
              ? (lang === 'fr' ? '1er clic : date de départ · 2e clic : date de retour' : 'النقرة الأولى: تاريخ المغادرة · النقرة الثانية: تاريخ العودة')
              : !range.to
                ? (lang === 'fr' ? 'Choisissez maintenant la date de retour' : 'اختر الآن تاريخ العودة')
                : (lang === 'fr' ? `Du ${fromYmd(range.from).toLocaleDateString('fr-FR')} au ${fromYmd(range.to).toLocaleDateString('fr-FR')}` : `من ${fromYmd(range.from).toLocaleDateString('fr-FR')} إلى ${fromYmd(range.to).toLocaleDateString('fr-FR')}`)}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
