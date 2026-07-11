import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Check, Car as CarIcon, MapPin, User, ConciergeBell, ClipboardCheck, Shield } from 'lucide-react';
import { Language, Car, Agency, SpecialOffer, WebsiteSettings } from '../../../types';
import { ReservationWizardProvider, useWizard, WIZARD_STEP_COUNT, WizardSearchCriteria } from './WizardContext';
import { StepCarDates } from './StepCarDates';
import { StepAgencies } from './StepAgencies';
import { StepAssurance } from './StepAssurance';
import { StepPersonalInfo } from './StepPersonalInfo';
import { StepServices } from './StepServices';
import { StepRecap } from './StepRecap';
import { NavButtons, C } from './wizardUi';
import { ThankYouPage } from '../ThankYouPage';

const STEP_META = [
  { icon: CarIcon,        label: { fr: 'Voiture & Dates', ar: 'السيارة والتواريخ' } },
  { icon: MapPin,         label: { fr: 'Agences', ar: 'الوكالات' } },
  { icon: Shield,         label: { fr: 'Assurance', ar: 'التأمين' } },
  { icon: ConciergeBell,  label: { fr: 'Services', ar: 'الخدمات' } },
  { icon: User,           label: { fr: 'Informations', ar: 'المعلومات' } },
  { icon: ClipboardCheck, label: { fr: 'Récapitulatif', ar: 'الملخص' } },
];

interface ReservationWizardProps {
  lang: Language;
  cars: Car[];
  agencies: Agency[];
  isLoadingAgencies?: boolean;
  specialOffers: SpecialOffer[];
  selectedCar?: Car | null;
  /** Recherche de disponibilité lancée depuis le landing (agences + période). */
  initialSearch?: WizardSearchCriteria | null;
  websiteSettings?: WebsiteSettings | null;
  onBackHome: () => void;
}

/** Assistant de réservation public en 5 étapes guidées. */
export const ReservationWizard: React.FC<ReservationWizardProps> = ({
  lang, cars, agencies, isLoadingAgencies = false, specialOffers, selectedCar, initialSearch, websiteSettings, onBackHome,
}) => (
  <ReservationWizardProvider
    lang={lang}
    cars={cars}
    agencies={agencies}
    isLoadingAgencies={isLoadingAgencies}
    specialOffers={specialOffers}
    initialCar={selectedCar}
    initialSearch={initialSearch}
  >
    <WizardShell websiteSettings={websiteSettings} onBackHome={onBackHome} />
  </ReservationWizardProvider>
);

const WizardShell: React.FC<{ websiteSettings?: WebsiteSettings | null; onBackHome: () => void }> = ({ websiteSettings, onBackHome }) => {
  const { lang, step, goToStep, next, prev, isStepValid, submitted, car } = useWizard();
  const reduceMotion = useReducedMotion();

  if (submitted) {
    return <ThankYouPage lang={lang} websiteSettings={websiteSettings} onBackHome={onBackHome} />;
  }

  const stepVariants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 } };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8" style={{ background: C.bg }}>
      {/* Halos d'arrière-plan */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px]" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.04), transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px]" style={{ background: 'radial-gradient(circle, rgba(217,119,6,0.05), transparent 70%)', transform: 'translate(-30%, 30%)' }} />
      </div>

      <div className="relative max-w-4xl mx-auto">
        {/* ── Indicateur de progression : Étape 1..6 ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-center text-xs font-bold tracking-[0.2em] uppercase mb-5"
            style={{ color: C.accent, fontFamily: 'var(--font-display)' }}>
            {lang === 'fr' ? `Étape ${step} sur ${WIZARD_STEP_COUNT}` : `الخطوة ${step} من ${WIZARD_STEP_COUNT}`}
            {' — '}
            <span className="text-vel-slate">{STEP_META[step - 1].label[lang]}</span>
          </p>
          <div className="flex items-start justify-center gap-0">
            {STEP_META.map((meta, i) => {
              const n = i + 1;
              const isCompleted = step > n;
              const isCurrent = step === n;
              const Icon = meta.icon;
              // On peut revenir librement à une étape passée en cliquant dessus
              const clickable = n < step;
              return (
                <React.Fragment key={n}>
                  <button
                    onClick={() => clickable && goToStep(n)}
                    disabled={!clickable}
                    className={`flex flex-col items-center gap-2 ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                    aria-label={`${lang === 'fr' ? 'Étape' : 'الخطوة'} ${n} — ${meta.label[lang]}`}
                  >
                    <motion.div
                      animate={isCurrent && !reduceMotion ? { scale: [1, 1.08, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500"
                      style={{
                        background: isCompleted
                          ? 'linear-gradient(135deg, #DC2626, #B91C1C)'
                          : isCurrent
                          ? 'linear-gradient(135deg, rgba(220,38,38,0.16), rgba(217,119,6,0.18))'
                          : 'rgba(15,23,42,0.05)',
                        border: isCompleted || isCurrent ? '2px solid #DC2626' : '2px solid rgba(15,23,42,0.1)',
                        boxShadow: isCurrent ? '0 0 20px rgba(220,38,38,0.25)' : 'none',
                        color: isCompleted ? '#FFFFFF' : isCurrent ? C.accent : '#64748B',
                      }}
                    >
                      {isCompleted ? <Check size={17} /> : <Icon size={17} />}
                    </motion.div>
                    <span className="text-[10px] font-bold tracking-wider uppercase hidden sm:block"
                      style={{ color: isCurrent || isCompleted ? C.accent : '#64748B', fontFamily: 'var(--font-display)' }}>
                      {meta.label[lang]}
                    </span>
                  </button>
                  {n < WIZARD_STEP_COUNT && (
                    <div className="flex-1 max-w-16 h-0.5 mx-1.5 sm:mx-3 mt-5 rounded-full transition-all duration-700"
                      style={{ background: step > n ? 'linear-gradient(90deg, #DC2626, #B91C1C)' : 'rgba(15,23,42,0.06)' }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>

        {/* ── Contenu de l'étape ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={stepVariants.initial}
            animate={stepVariants.animate}
            exit={stepVariants.exit}
            transition={{ duration: reduceMotion ? 0.15 : 0.35, ease: 'easeOut' }}
          >
            {step === 1 && <StepCarDates />}
            {step === 2 && <StepAgencies />}
            {step === 3 && <StepAssurance />}
            {step === 4 && <StepServices />}
            {step === 5 && <StepPersonalInfo />}
            {step === 6 && <StepRecap />}
          </motion.div>
        </AnimatePresence>

        {/* ── Navigation Précédent / Suivant (l'étape 5 a ses propres boutons) ── */}
        {step < WIZARD_STEP_COUNT && (step > 1 || car) && (
          <div className="mt-6">
            <NavButtons
              lang={lang}
              onBack={step > 1 ? prev : undefined}
              onNext={next}
              nextDisabled={!isStepValid(step)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
