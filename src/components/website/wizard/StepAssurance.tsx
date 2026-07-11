import React from 'react';
import { motion } from 'motion/react';
import { Check, X, Shield, Loader2 } from 'lucide-react';
import { useWizard } from './WizardContext';
import { SectionCard, SectionTitle, C } from './wizardUi';

/**
 * Étape 3 — Assurance de protection (optionnel).
 * Cartes sélectionnables (même design que les cartes de voitures) affichant,
 * pour chaque forfait, la liste complète des éléments avec leur statut vrai/faux.
 * Le prix (par jour) s'ajoute au total selon la durée.
 */
export const StepAssurance: React.FC = () => {
  const { lang, availableAssurances, loadingAssurances, selectedAssurance, setSelectedAssurance, days } = useWizard();

  const DA = { fr: 'DA', ar: 'د.ج' }[lang];

  return (
    <div className="space-y-6">
      <SectionCard>
        <SectionTitle>🛡️ {{ fr: 'Assurance de protection (optionnel)', ar: 'تأمين الحماية (اختياري)' }[lang]}</SectionTitle>
        <p className="text-vel-muted text-sm -mt-2">
          {{ fr: 'Choisissez un forfait de protection — vous pouvez aussi passer cette étape', ar: 'اختر باقة حماية — يمكنك أيضًا تخطي هذه الخطوة' }[lang]}
        </p>

        {loadingAssurances ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin" style={{ color: C.accent }} />
          </div>
        ) : availableAssurances.length === 0 ? (
          <div className="text-center py-12 text-vel-dim">
            <span className="text-5xl block mb-3">🛡️</span>
            <p className="font-bold">{{ fr: 'Aucune assurance disponible', ar: 'لا يوجد تأمين متاح' }[lang]}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {availableAssurances.map((a, i) => {
              const isSelected = selectedAssurance?.id === a.id;
              return (
                <motion.button
                  key={a.id}
                  type="button"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.05, duration: 0.4 }}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedAssurance(isSelected ? null : a)}
                  className="text-left rounded-2xl overflow-hidden transition-all duration-300 group cursor-pointer flex flex-col"
                  style={{
                    background: C.elevated,
                    border: isSelected ? '1px solid rgba(220,38,38,0.5)' : '1px solid rgba(15,23,42,0.06)',
                    boxShadow: isSelected ? '0 0 30px rgba(220,38,38,0.1)' : 'none',
                  }}
                >
                  {/* En-tête : icône + nom + prix/jour */}
                  <div className="p-5 flex items-start justify-between gap-3"
                    style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(220,38,38,0.09)', border: '1px solid rgba(220,38,38,0.2)' }}>
                        <Shield size={20} style={{ color: C.accent }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-vel-ink text-base truncate" style={{ fontFamily: 'var(--font-display)' }}>
                          {a.name}
                        </h3>
                        <p className="font-black text-sm" style={{ color: C.accent, fontFamily: 'var(--font-display)' }}>
                          {a.pricePerDay.toLocaleString()}
                          <span className="text-xs ml-1" style={{ color: 'rgba(220,38,38,0.75)' }}>
                            {{ fr: 'DA/j', ar: 'د.ج/ي' }[lang]}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        background: isSelected ? C.accent : 'transparent',
                        border: isSelected ? `2px solid ${C.accent}` : '2px solid rgba(15,23,42,0.15)',
                      }}>
                      {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Liste des éléments avec statut vrai/faux */}
                  <div className="p-5 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-vel-muted mb-2.5"
                      style={{ fontFamily: 'var(--font-display)' }}>
                      {{ fr: 'Éléments couverts', ar: 'العناصر المشمولة' }[lang]}
                    </p>
                    {a.items.length === 0 ? (
                      <p className="text-vel-dim text-xs italic">{{ fr: 'Aucun élément', ar: 'لا عناصر' }[lang]}</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {a.items.map(item => (
                          <li key={item.linkId || item.itemId} className="flex items-center gap-2 text-sm">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              item.status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                            }`}>
                              {item.status ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
                            </span>
                            <span className={item.status ? 'text-vel-slate' : 'text-vel-dim line-through'}>
                              {item.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Pied : coût total pour la durée */}
                  {days > 0 && (
                    <div className="px-5 py-3 flex items-center justify-between text-xs"
                      style={{ background: 'rgba(220,38,38,0.04)', borderTop: '1px solid rgba(15,23,42,0.06)' }}>
                      <span className="text-vel-muted">{days} {{ fr: 'jour(s)', ar: 'يوم' }[lang]}</span>
                      <span className="font-black" style={{ color: C.accent }}>
                        {(a.pricePerDay * days).toLocaleString()} {DA}
                      </span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Résumé assurance sélectionnée */}
      {selectedAssurance && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 flex justify-between items-center"
          style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.16)' }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-vel-muted">{{ fr: 'Assurance choisie', ar: 'التأمين المختار' }[lang]}</p>
            <p className="font-black text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>{selectedAssurance.name}</p>
          </div>
          <span className="font-black text-base" style={{ color: C.accent }}>
            {(selectedAssurance.pricePerDay * days).toLocaleString()} {DA}
          </span>
        </motion.div>
      )}
    </div>
  );
};
