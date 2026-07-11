import React, { useEffect } from 'react';
import { Language, WebsiteSettings } from '../../types';
import { motion } from 'motion/react';
import { CheckCircle, Car, Home, PhoneCall } from 'lucide-react';

interface ThankYouPageProps {
  lang: Language;
  onBackHome: () => void;
  /** Paramètres du site : logo et nom de l'agence affichés sur l'écran de remerciement. */
  websiteSettings?: WebsiteSettings | null;
}

export const ThankYouPage: React.FC<ThankYouPageProps> = ({ lang, onBackHome, websiteSettings }) => {
  // Retour automatique à l'accueil après 20 s si l'utilisateur n'agit pas
  useEffect(() => {
    const timer = setTimeout(onBackHome, 20000);
    return () => clearTimeout(timer);
  }, [onBackHome]);

  const agencyName = websiteSettings?.name || 'AutoLocation';

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 overflow-hidden"
      style={{ background: '#F8FAFC' }}>

      {/* Halos d'arrière-plan */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.09), transparent 60%)' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.08), transparent 60%)' }} />
      </div>

      {/* Carte de contenu */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
        className="relative z-10 text-center max-w-lg w-full rounded-3xl p-10 space-y-6"
        style={{
          background: 'rgba(255,255,255,0.97)',
          border: '1px solid rgba(220,38,38,0.2)',
          boxShadow: '0 20px 60px rgba(15,23,42,0.1)',
        }}
      >
        {/* Logo + nom de l'agence */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)' }}>
            {websiteSettings?.logo ? (
              <img src={websiteSettings.logo} alt={agencyName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              // TODO: remplacer par le vrai logo de l'agence quand il sera disponible
              <Car size={36} style={{ color: '#DC2626' }} />
            )}
          </div>
          <h2 className="font-black text-xl text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
            {agencyName}
          </h2>
        </div>

        {/* Coche de succès */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 18 }}
          className="flex justify-center"
        >
          <CheckCircle size={56} style={{ color: '#DC2626', filter: 'drop-shadow(0 0 16px rgba(220,38,38,0.35))' }} />
        </motion.div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="font-black text-2xl sm:text-3xl text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Merci !', ar: 'شكراً لك!' }[lang]}
          </h1>
          <p className="text-vel-slate leading-relaxed">
            {{
              fr: 'Votre demande de réservation a bien été enregistrée. Nous vous contacterons bientôt pour la confirmer.',
              ar: 'تم تسجيل طلب الحجز الخاص بك بنجاح. سنتصل بك قريباً لتأكيده.',
            }[lang]}
          </p>
          <p className="flex items-center justify-center gap-2 text-sm text-vel-muted">
            <PhoneCall size={14} style={{ color: '#DC2626' }} />
            {{ fr: 'Gardez votre téléphone à portée de main', ar: 'أبقِ هاتفك في متناول اليد' }[lang]}
          </p>
        </div>

        {/* Retour à l'accueil */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onBackHome}
          className="btn-vel-cta w-full py-4 flex items-center justify-center gap-2 text-sm"
        >
          <Home size={16} />
          {{ fr: "Retour à l'accueil", ar: 'العودة إلى الرئيسية' }[lang]}
        </motion.button>
      </motion.div>
    </div>
  );
};
