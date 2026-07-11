import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Language } from '../../types';
import { SplineScene } from '../ui/splite';
import { HERO_SPLINE_SCENE_URL } from '../../constants';

interface ShowcaseBandProps {
  lang: Language;
  onReserve: () => void;
  /** Photo d'une voiture de la flotte réelle (arrière-plan si pas de scène 3D). */
  imageUrl?: string;
}

/**
 * Bande vitrine pleine largeur (issue du prompt magic /ui, intégrée aux tokens
 * du design system) : une voiture en arrière-plan — scène Spline 3D si une URL
 * est configurée, sinon photo avec effet parallaxe — derrière un titre français.
 * La couche visuelle est décorative : pointer-events-none, aria-hidden,
 * parallaxe désactivée si prefers-reduced-motion.
 */
export const ShowcaseBand: React.FC<ShowcaseBandProps> = ({ lang, onReserve, imageUrl }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);

  const use3D = !!HERO_SPLINE_SCENE_URL && !reduceMotion;

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-28 px-4 sm:px-6 lg:px-8"
      style={{ background: '#F8FAFC' }}
    >
      {/* ── Couche visuelle d'arrière-plan (décorative, non interactive) ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {use3D ? (
          <SplineScene scene={HERO_SPLINE_SCENE_URL} className="w-full h-full" />
        ) : imageUrl ? (
          // Photo d'une voiture de la flotte réelle, avec parallaxe douce
          <motion.img
            src={imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-[130%] object-cover -mt-[15%]"
            style={reduceMotion ? {} : { y: parallaxY }}
          />
        ) : (
          // Pas d'image disponible : simple fond dégradé discret
          <div className="w-full h-full" style={{
            background: 'radial-gradient(ellipse 70% 80% at 85% 50%, rgba(220,38,38,0.08), transparent 70%)',
          }} />
        )}
        {/* Dégradé clair pour la lisibilité du texte au-dessus (la voiture reste visible à droite) */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(90deg, rgba(248,250,252,0.97) 0%, rgba(248,250,252,0.82) 40%, rgba(248,250,252,0.12) 75%, rgba(248,250,252,0) 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(248,250,252,0.85), transparent 22%, transparent 78%, rgba(248,250,252,0.85))',
        }} />
      </div>

      {/* ── Contenu ── */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="max-w-xl space-y-6"
        >
          <p className="font-bold text-xs tracking-[0.25em] uppercase"
            style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Prêt quand vous l\'êtes', ar: 'جاهزون عندما تكون جاهزًا' }[lang]}
          </p>
          <h2 className="font-black text-4xl sm:text-5xl text-vel-ink leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Une flotte entretenue, des clés en main le jour même', ar: 'أسطول مُعتنى به، ومفاتيح بين يديك في نفس اليوم' }[lang]}
          </h2>
          <p className="text-vel-slate text-lg leading-relaxed">
            {{
              fr: 'Choisissez vos dates, nous préparons le véhicule. Assurance incluse, kilométrage clair, aucune surprise.',
              ar: 'اختر تواريخك ونحن نجهّز السيارة. التأمين مشمول، عدّاد واضح، بلا مفاجآت.',
            }[lang]}
          </p>
          <motion.button
            onClick={onReserve}
            whileHover={reduceMotion ? {} : { scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-vel-cta px-8 py-4 text-sm"
          >
            {{ fr: 'Voir les voitures disponibles', ar: 'عرض السيارات المتاحة' }[lang]}
            <ArrowRight size={17} />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};
