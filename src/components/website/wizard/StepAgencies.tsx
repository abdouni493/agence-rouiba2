import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWizard } from './WizardContext';
import { SectionCard, SectionTitle, FieldLabel, inputClass, inputStyle, focusInput, blurInput, C } from './wizardUi';

/**
 * Étape 2 — Agences.
 * Par défaut, l'agence de retour = l'agence de départ ;
 * le toggle "Agence de retour différente" révèle un second select (animé).
 */
export const StepAgencies: React.FC = () => {
  const {
    lang, agencies, isLoadingAgencies,
    departureAgency, setDepartureAgency,
    differentReturnAgency, setDifferentReturnAgency,
    returnAgency, setReturnAgency,
  } = useWizard();

  const departureAgencyName = agencies.find(a => a.id === departureAgency)?.name;

  return (
    <div className="space-y-6">
      {/* Départ */}
      <SectionCard>
        <SectionTitle>🛫 {{ fr: 'Départ', ar: 'المغادرة' }[lang]}</SectionTitle>
        <div>
          <FieldLabel>{{ fr: 'Agence de départ *', ar: 'وكالة المغادرة *' }[lang]}</FieldLabel>
          <select value={departureAgency}
            onChange={e => setDepartureAgency(e.target.value)}
            disabled={isLoadingAgencies}
            className={inputClass} style={{ ...inputStyle, cursor: isLoadingAgencies ? 'wait' : 'pointer' }}
            onFocus={focusInput} onBlur={blurInput}>
            <option value="">
              {isLoadingAgencies ? (lang === 'fr' ? 'Chargement…' : 'جاري التحميل…') : (lang === 'fr' ? 'Sélectionner une agence…' : 'اختر وكالة…')}
            </option>
            {agencies.map(a => <option key={a.id} value={a.id}>{a.name} — {a.city}</option>)}
          </select>
        </div>
      </SectionCard>

      {/* Retour */}
      <SectionCard>
        <SectionTitle>🛬 {{ fr: 'Retour', ar: 'الإرجاع' }[lang]}</SectionTitle>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={differentReturnAgency}
          onClick={() => setDifferentReturnAgency(!differentReturnAgency)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <span
            className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-300"
            style={{
              background: differentReturnAgency ? C.accent : 'rgba(15,23,42,0.12)',
            }}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
              style={{ left: differentReturnAgency ? 'calc(100% - 22px)' : '2px' }}
            />
          </span>
          <span className="font-bold text-vel-slate text-sm group-hover:text-vel-ink transition-colors">
            {{ fr: 'Agence de retour différente', ar: 'وكالة إرجاع مختلفة' }[lang]}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {differentReturnAgency ? (
            <motion.div
              key="return-select"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <FieldLabel>{{ fr: 'Agence de retour *', ar: 'وكالة الإرجاع *' }[lang]}</FieldLabel>
              <select value={returnAgency}
                onChange={e => setReturnAgency(e.target.value)}
                disabled={isLoadingAgencies}
                className={inputClass} style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={focusInput} onBlur={blurInput}>
                <option value="">{lang === 'fr' ? 'Sélectionner…' : 'اختر…'}</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name} — {a.city}</option>)}
              </select>
            </motion.div>
          ) : (
            departureAgencyName && (
              <motion.p
                key="same-agency"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-vel-muted px-4 py-3 rounded-xl"
                style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.06)' }}
              >
                {lang === 'fr'
                  ? <>Le véhicule sera rendu à l'agence de départ : <span className="font-bold text-vel-slate">{departureAgencyName}</span></>
                  : <>سيتم إرجاع السيارة إلى وكالة المغادرة: <span className="font-bold text-vel-slate">{departureAgencyName}</span></>}
              </motion.p>
            )
          )}
        </AnimatePresence>
      </SectionCard>
    </div>
  );
};
