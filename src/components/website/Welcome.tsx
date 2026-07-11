import React, { useRef, useState } from 'react';
import { Language, Agency } from '../../types';
import { motion, useScroll, useTransform } from 'motion/react';
import { ChevronDown, Shield, Zap, Star, ArrowRight, Trophy, Car as CarIcon, MapPin, CalendarDays, Search } from 'lucide-react';
import { Hero3D } from './Hero3D';
import { ShowcaseBand } from './ShowcaseBand';
import { HERO_SPLINE_SCENE_URL } from '../../constants';
import { WizardSearchCriteria } from './wizard/WizardContext';
import { toYmd } from './wizard/wizardUi';

// ─── Colour tokens for this page ───────────────────────────────────────────
const C = {
  accent:    '#DC2626',
  amber:     '#D97706',
  accentDim: 'rgba(220,38,38,0.1)',
  amberDim:  'rgba(217,119,6,0.1)',
  bg:        '#F8FAFC',
  surface:   '#FFFFFF',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const shortName = (name: string | undefined) =>
  name ? name.split(/\s+/).slice(0, 3).join(' ') : 'AutoLocation';

// ─── Pure CSS + Framer Motion hero visual ───────────────────────────────────
function HeroVisual({ lang, logo }: { lang: Language; logo?: string }) {
  const floatingCards = [
    {
      icon: Trophy,
      value: '#1',
      label: { fr: 'en Algérie', ar: 'في الجزائر' },
      delay: 0,
      className: 'top-6 right-0',
    },
    {
      icon: Star,
      value: '4.9/5',
      label: { fr: 'Note moyenne', ar: 'التقييم' },
      delay: 0.8,
      className: 'top-1/2 -left-2',
    },
    {
      icon: Zap,
      value: '< 5 min',
      label: { fr: 'Réservation', ar: 'وقت الحجز' },
      delay: 1.6,
      className: 'bottom-10 right-6',
    },
  ];

  return (
    <div className="relative w-full h-[500px] flex items-center justify-center">

      {/* Outer slow rotating ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{ border: '1px solid rgba(220,38,38,0.09)' }}
      >
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
          style={{ background: C.accent, boxShadow: `0 0 14px ${C.accent}` }} />
      </motion.div>

      {/* Middle violet counter-ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute w-[290px] h-[290px] rounded-full"
        style={{ border: '1px dashed rgba(217,119,6,0.2)' }}
      >
        <div className="absolute top-0 right-6 w-2 h-2 rounded-full"
          style={{ background: C.amber, boxShadow: `0 0 10px ${C.amber}` }} />
      </motion.div>

      {/* Inner pulsing ring */}
      <motion.div
        animate={{ scale: [1, 1.07, 1], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute w-[180px] h-[180px] rounded-full"
        style={{ border: '1px solid rgba(220,38,38,0.3)' }}
      />

      {/* Center glowing element */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-32 h-32 rounded-3xl flex items-center justify-center z-10"
        style={{
          background: `linear-gradient(135deg, rgba(220,38,38,0.09), rgba(217,119,6,0.1))`,
          border: `1px solid rgba(220,38,38,0.3)`,
          boxShadow: `0 0 50px rgba(220,38,38,0.16), 0 0 100px rgba(220,38,38,0.06)`,
        }}
      >
        {logo ? (
          <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-3xl" referrerPolicy="no-referrer" />
        ) : (
          <CarIcon size={56} style={{ color: C.accent }} />
        )}
      </motion.div>

      {/* Floating stat cards */}
      {floatingCards.map((card, i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -7, 0] }}
          transition={{ delay: card.delay, duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute ${card.className} px-4 py-3 rounded-2xl z-20`}
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(220,38,38,0.14)',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 8px 32px rgba(15,23,42,0.08)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <card.icon size={20} style={{ color: C.amber }} />
            <div>
              <p className="font-black text-base leading-none mb-0.5"
                style={{ color: C.accent, fontFamily: 'var(--font-display)' }}>
                {card.value}
              </p>
              <p className="text-vel-muted text-[11px]">{card.label[lang]}</p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* Corner accent dots */}
      <div className="absolute top-8 left-8 w-1.5 h-1.5 rounded-full opacity-60"
        style={{ background: C.amber }} />
      <div className="absolute bottom-12 left-12 w-1 h-1 rounded-full opacity-40"
        style={{ background: C.accent }} />
      <div className="absolute top-16 right-16 w-1 h-1 rounded-full opacity-50"
        style={{ background: C.accent }} />
    </div>
  );
}

// ─── Widget de réservation du hero (agences + période → voitures dispo) ─────
function BookingSearchPanel({ lang, agencies, onSearch, hasBg }: {
  lang: Language;
  agencies: Agency[];
  onSearch: (criteria: WizardSearchCriteria) => void;
  hasBg?: boolean;
}) {
  const today = toYmd(new Date());
  const [departureAgencyId, setDepartureAgencyId] = useState('');
  const [returnAgencyId, setReturnAgencyId] = useState('');   // '' = même agence
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const isValid = !!departureAgencyId && !!from && !!to && from <= to && from >= today;

  const selectClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 outline-none hover:border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all duration-200 cursor-pointer shadow-sm";
  const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 outline-none hover:border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all duration-200 shadow-sm";

  const fields: { label: string; icon: React.ReactNode; el: React.ReactNode }[] = [
    {
      label: { fr: 'Agence de départ', ar: 'وكالة المغادرة' }[lang],
      icon: <MapPin size={13} className="text-red-500" />,
      el: (
        <select value={departureAgencyId} onChange={e => setDepartureAgencyId(e.target.value)}
          className={selectClass}>
          <option value="">{{ fr: 'Sélectionner…', ar: 'اختر…' }[lang]}</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name} — {a.city}</option>)}
        </select>
      ),
    },
    {
      label: { fr: 'Agence de retour', ar: 'وكالة الإرجاع' }[lang],
      icon: <MapPin size={13} className="text-red-500" />,
      el: (
        <select value={returnAgencyId} onChange={e => setReturnAgencyId(e.target.value)}
          className={selectClass}>
          <option value="">{{ fr: 'Même agence', ar: 'نفس الوكالة' }[lang]}</option>
          {agencies.map(a => <option key={a.id} value={a.id}>{a.name} — {a.city}</option>)}
        </select>
      ),
    },
    {
      label: { fr: 'Date de départ', ar: 'تاريخ البدء' }[lang],
      icon: <CalendarDays size={13} className="text-red-500" />,
      el: (
        <input type="date" value={from} min={today}
          onChange={e => { setFrom(e.target.value); if (to && e.target.value > to) setTo(''); }}
          className={inputClass} />
      ),
    },
    {
      label: { fr: 'Date de retour', ar: 'تاريخ الإرجاع' }[lang],
      icon: <CalendarDays size={13} className="text-red-500" />,
      el: (
        <input type="date" value={to} min={from || today}
          onChange={e => setTo(e.target.value)}
          className={inputClass} />
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.75 }}
      className="relative z-20 rounded-3xl p-6 sm:p-8"
      style={{
        background: 'rgba(255, 255, 255, 0.94)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(24px)',
        boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      }}
    >
      <p className="text-xs font-bold tracking-[0.2em] uppercase mb-5 flex items-center gap-2"
        style={{ color: C.accent, fontFamily: 'var(--font-display)' }}>
        <Search size={14} className="animate-pulse" />
        {{ fr: 'Trouvez votre voiture disponible', ar: 'اعثر على سيارتك المتاحة' }[lang]}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 items-end">
        {fields.map((f, i) => (
          <div key={i}>
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2"
              style={{ fontFamily: 'var(--font-display)' }}>
              {f.icon} {f.label}
            </label>
            {f.el}
          </div>
        ))}

        <motion.button
          onClick={() => isValid && onSearch({
            from, to,
            departureAgencyId,
            returnAgencyId: returnAgencyId || undefined,
          })}
          disabled={!isValid}
          whileHover={isValid ? { scale: 1.03, y: -1 } : {}}
          whileTap={isValid ? { scale: 0.97 } : {}}
          className={`px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap transition-all ${!isValid ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg hover:shadow-red-500/20'}`}
          style={{
            fontFamily: 'var(--font-display)',
            background: `linear-gradient(135deg, ${C.accent}, #B91C1C)`,
            color: '#FFFFFF',
            boxShadow: isValid ? '0 6px 20px rgba(220,38,38,0.25)' : 'none',
          }}
        >
          {{ fr: 'Suivant', ar: 'التالي' }[lang]} <ArrowRight size={16} />
        </motion.button>
      </div>

      <p className="text-slate-400 text-[11px] mt-4 font-medium">
        {{ fr: 'Nous afficherons uniquement les voitures disponibles sur la période choisie.',
           ar: 'سنعرض فقط السيارات المتاحة في الفترة المختارة.' }[lang]}
      </p>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
interface WelcomeProps {
  lang: Language;
  websiteSettings: any;
  /** Agences pour le widget de recherche de disponibilité. */
  agencies: Agency[];
  /** Ouvre la grille des voitures ("Voir les voitures"). */
  onStartRenting: () => void;
  /** Lance le wizard de réservation ("Réserver"). */
  onReserve: () => void;
  /** Recherche de disponibilité : ouvre le wizard pré-rempli (agences + dates). */
  onSearch: (criteria: WizardSearchCriteria) => void;
  /** Photo d'une voiture de la flotte pour la bande vitrine. */
  showcaseImage?: string;
}

export const Welcome: React.FC<WelcomeProps> = ({ lang, websiteSettings, agencies, onStartRenting, onReserve, onSearch, showcaseImage }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.4], [0, -80]);

  const hasBg = !!websiteSettings?.landing_background;

  const stats = [
    { num: '#1', label: { fr: 'en Algérie', ar: 'في الجزائر' } },
    { num: '10K+', label: { fr: 'Clients', ar: 'عملاء' } },
    { num: '99%',  label: { fr: 'Satisfaction', ar: 'رضا العملاء' } },
  ];

  const features = [
    {
      icon: Shield,
      title: { fr: 'Assurance incluse', ar: 'التأمين مشمول' },
      desc:  { fr: 'Tous nos véhicules sont assurés et couverts', ar: 'جميع سياراتنا مؤمنة ومغطاة' },
    },
    {
      icon: Zap,
      title: { fr: 'Réservation rapide', ar: 'حجز سريع' },
      desc:  { fr: 'En 3 étapes simples, réservez votre véhicule', ar: 'في 3 خطوات بسيطة احجز سيارتك' },
    },
    {
      icon: Star,
      title: { fr: 'Flotte premium', ar: 'أسطول فاخر' },
      desc:  { fr: 'Véhicules récents, propres et bien entretenus', ar: 'سيارات حديثة ونظيفة وجيدة الصيانة' },
    },
  ];

  return (
    <div ref={containerRef} className="relative overflow-hidden" style={{ background: C.bg }}>

      {/* ══ HERO SECTION ══ */}
      <section className="relative min-h-screen flex items-center">

        {/* Background image — subtle blur + cinematic dark overlay for readability */}
        {websiteSettings?.landing_background && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <motion.img
              src={websiteSettings.landing_background}
              alt=""
              className="w-full h-full object-cover"
              style={{ transform: 'scale(1.05)' }}
              animate={{ scale: [1.05, 1.10, 1.05] }}
              transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
              referrerPolicy="no-referrer"
            />
            {/* Multi-layer overlay: dark bottom for readability, lighter top to show image */}
            <div className="absolute inset-0" style={{
              background: `linear-gradient(180deg,
                rgba(15,23,42,0.3) 0%,
                rgba(15,23,42,0.2) 30%,
                rgba(15,23,42,0.35) 60%,
                rgba(15,23,42,0.7) 100%)`,
            }} />
            {/* Left-side text protection gradient */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.1) 55%, transparent 100%)',
            }} />
          </div>
        )}

        {/* Fine diagonal grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `linear-gradient(${C.accent} 1px, transparent 1px), linear-gradient(90deg, ${C.accent} 1px, transparent 1px)`,
          backgroundSize: '70px 70px',
        }} />

        {/* Cyan top glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 75% 55% at 60% -10%, ${C.accentDim}, transparent)`,
        }} />

        {/* Violet bottom-left blob */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] pointer-events-none" style={{
          background: `radial-gradient(circle, ${C.amberDim}, transparent 70%)`,
          transform: 'translate(-30%, 30%)',
        }} />

        {/* Horizontal accent line */}
        <div className="absolute top-[48%] left-0 right-0 h-px pointer-events-none" style={{
          background: `linear-gradient(90deg, transparent, ${C.accent}22, ${C.amber}33, transparent)`,
        }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-28 pb-10">

            {/* LEFT: Text */}
            <motion.div style={{ opacity: heroOpacity, y: heroY }} className="space-y-8">

              {/* Badge pill */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300"
                style={{
                  borderColor: hasBg ? 'rgba(255, 255, 255, 0.25)' : `${C.accent}40`,
                  background: hasBg ? 'rgba(255, 255, 255, 0.12)' : `${C.accent}10`,
                  backdropFilter: hasBg ? 'blur(8px)' : 'none',
                }}
              >
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: hasBg ? '#FFFFFF' : C.accent }} />
                <span className="text-xs font-bold tracking-[0.2em] uppercase"
                  style={{ color: hasBg ? '#FFFFFF' : C.accent, fontFamily: 'var(--font-display)' }}>
                  {{ fr: 'Location Premium · Algérie', ar: 'تأجير فاخر · الجزائر' }[lang]}
                </span>
              </motion.div>

              {/* Agency name */}
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-sm font-bold tracking-[0.3em] uppercase"
                style={{ color: hasBg ? '#FBBF24' : C.amber, fontFamily: 'var(--font-display)' }}
              >
                {shortName(websiteSettings?.name)}
              </motion.p>

              {/* Main headline */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.2 }}
              >
                <h1 className="font-black leading-[0.92]" style={{ fontFamily: 'var(--font-display)' }}>
                  <span className={`block text-5xl sm:text-6xl xl:text-7xl mb-1 ${hasBg ? 'text-white' : 'text-vel-ink'}`}>
                    {{ fr: 'Vitesse', ar: 'سرعة' }[lang]}
                  </span>
                  <span className="block text-5xl sm:text-6xl xl:text-7xl" style={{ color: C.accent }}>
                    {{ fr: '& Prestige', ar: '& فخامة' }[lang]}
                  </span>
                </h1>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.38 }}
                className={`text-base leading-relaxed max-w-md ${hasBg ? 'text-slate-200' : 'text-vel-slate'}`}
              >
                {websiteSettings?.description || (lang === 'fr'
                  ? "Des véhicules d'exception pour des expériences inoubliables. Réservez en quelques clics."
                  : 'مركبات استثنائية لتجارب لا تُنسى. احجز بنقرات قليلة.'
                )}
              </motion.p>

              {/* CTA — un seul bouton : voir les voitures disponibles (la réservation
                  démarre après avoir choisi une voiture, plus de réservation directe). */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-wrap gap-4"
              >
                <motion.button
                  onClick={onStartRenting}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="btn-vel-cta px-8 py-4 text-sm"
                >
                  {{ fr: 'Voir les voitures disponibles', ar: 'عرض السيارات المتاحة' }[lang]}
                  <ArrowRight size={17} />
                </motion.button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.65 }}
                className="flex gap-8 pt-4"
                style={{ borderTop: hasBg ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(15,23,42,0.07)' }}
              >
                {stats.map((s, i) => (
                  <div key={i}>
                    <p className="font-black text-2xl" style={{ color: hasBg ? '#FFFFFF' : C.accent, fontFamily: 'var(--font-display)' }}>
                      {s.num}
                    </p>
                    <p className={hasBg ? "text-slate-300 text-xs" : "text-vel-muted text-xs"}>{s.label[lang]}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* RIGHT: 3D (Spline) avec repli sur le visuel CSS statique */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, delay: 0.25, ease: 'easeOut' }}
              className="relative"
            >
              {/* Glow halo */}
              <div className="absolute inset-0 pointer-events-none rounded-full" style={{
                background: `radial-gradient(ellipse at center, ${C.accentDim}, transparent 68%)`,
              }} />
              <Hero3D
                sceneUrl={HERO_SPLINE_SCENE_URL}
                fallback={<HeroVisual lang={lang} logo={websiteSettings?.logo} />}
              />
            </motion.div>
          </div>

          {/* ── Recherche de disponibilité : agences + période → étape suivante ── */}
          <div className="pb-24">
            <BookingSearchPanel lang={lang} agencies={agencies} onSearch={onSearch} hasBg={hasBg} />
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ color: C.accent }}
        >
          <span className="text-xs tracking-widest uppercase opacity-60" style={{ fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Défiler', ar: 'مرر' }[lang]}
          </span>
          <ChevronDown size={18} />
        </motion.div>
      </section>

      {/* ══ FEATURES SECTION ══ */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8" style={{
        background: '#FFFFFF',
        borderTop: '1px solid rgba(15,23,42,0.06)',
        borderBottom: '1px solid rgba(15,23,42,0.06)',
      }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <p className="font-bold text-xs tracking-[0.25em] uppercase mb-4"
              style={{ color: C.accent, fontFamily: 'var(--font-display)' }}>
              {{ fr: 'Pourquoi nous choisir', ar: 'لماذا تختارنا' }[lang]}
            </p>
            <h2 className="font-black text-4xl text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
              {{ fr: "L'expérience automobile premium", ar: 'تجربة السيارات الفاخرة' }[lang]}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                whileHover={{ y: -6 }}
                className="rounded-2xl p-8 space-y-4 transition-all duration-300 cursor-default"
                style={{
                  background: 'rgba(220,38,38,0.04)',
                  border: '1px solid rgba(220,38,38,0.09)',
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${C.accent}35`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${C.accent}12`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.09)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${C.accent}14`, border: `1px solid ${C.accent}35` }}>
                  <f.icon size={22} style={{ color: C.accent }} />
                </div>
                <h3 className="font-bold text-lg text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
                  {f.title[lang]}
                </h3>
                <p className="text-vel-muted text-sm leading-relaxed">{f.desc[lang]}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SHOWCASE BAND (voiture en arrière-plan + titre) ══ */}
      <ShowcaseBand lang={lang} onReserve={onStartRenting} imageUrl={showcaseImage} />

      {/* ══ CTA BANNER ══ */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: C.bg }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse at center, ${C.accentDim}, transparent 65%)`,
        }} />

        <div className="absolute top-1/2 left-0 right-0 flex items-center justify-center gap-4 pointer-events-none">
          <div className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${C.accent}22)` }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.accent }} />
          <div className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${C.accent}22)` }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <h2 className="font-black text-5xl text-vel-ink mb-6" style={{ fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Prêt à prendre la route ?', ar: 'مستعد للانطلاق؟' }[lang]}
          </h2>
          <p className="text-vel-slate text-lg mb-10">
            {{ fr: "Réservez votre véhicule dès aujourd'hui et vivez l'expérience.", ar: 'احجز سيارتك اليوم وعش التجربة.' }[lang]}
          </p>
          <motion.button
            onClick={onStartRenting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 text-lg px-12 py-5 rounded-xl font-bold transition-all duration-300"
            style={{
              fontFamily: 'var(--font-display)',
              background: `linear-gradient(135deg, ${C.accent}, #B91C1C)`,
              color: '#FFFFFF',
              boxShadow: `0 6px 18px rgba(220,38,38,0.28)`,
            }}
          >
            <CarIcon size={20} /> {{ fr: 'Voir tous les véhicules', ar: 'عرض جميع السيارات' }[lang]}
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
};
