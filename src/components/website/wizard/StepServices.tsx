import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2 } from 'lucide-react';
import { useWizard } from './WizardContext';
import { SectionCard, SectionTitle, C } from './wizardUi';

/**
 * Étape 4 — Services (optionnel).
 * Cartes sélectionnables depuis les services existants ; n'en choisir aucun est permis.
 * Les services choisis s'ajoutent au total de l'étape 5.
 */
export const StepServices: React.FC = () => {
  const { lang, availableServices, loadingServices, selectedServices, toggleService } = useWizard();

  return (
    <div className="space-y-6">
      <SectionCard>
        <SectionTitle>🛎️ {{ fr: 'Services supplémentaires (optionnel)', ar: 'الخدمات الإضافية (اختياري)' }[lang]}</SectionTitle>
        <p className="text-vel-muted text-sm -mt-2">
          {{ fr: 'Sélectionnez les services que vous souhaitez ajouter — vous pouvez aussi passer cette étape', ar: 'اختر الخدمات التي تريد إضافتها — يمكنك أيضًا تخطي هذه الخطوة' }[lang]}
        </p>

        {loadingServices ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin" style={{ color: C.accent }} />
          </div>
        ) : availableServices.length === 0 ? (
          <div className="text-center py-12 text-vel-dim">
            <p className="font-bold">{{ fr: 'Aucun service disponible', ar: 'لا توجد خدمات' }[lang]}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableServices.map((service, i) => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => toggleService({
                    id: service.id,
                    name: service.name || service.service_name,
                    price: service.price,
                    description: service.description,
                    category: service.category || 'service',
                    selected: false,
                  })}
                  className="rounded-2xl p-5 cursor-pointer transition-all duration-300 relative overflow-hidden"
                  style={{
                    background: isSelected ? 'rgba(220,38,38,0.05)' : C.elevated,
                    border: isSelected ? '1px solid rgba(220,38,38,0.25)' : '1px solid rgba(15,23,42,0.06)',
                    boxShadow: isSelected ? '0 0 20px rgba(220,38,38,0.08)' : 'none',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-vel-ink text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                        {service.name || service.service_name}
                      </h4>
                      {service.description && (
                        <p className="text-vel-muted text-xs mt-1 leading-relaxed">{service.description}</p>
                      )}
                      <p className="font-black text-base mt-2" style={{ color: C.accent }}>
                        {service.price.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}
                      </p>
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                      style={{
                        background: isSelected ? C.accent : 'transparent',
                        border: isSelected ? `2px solid ${C.accent}` : '2px solid rgba(15,23,42,0.15)',
                      }}>
                      {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Résumé services sélectionnés */}
      <AnimatePresence>
        {selectedServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="rounded-2xl p-6 space-y-3"
            style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.16)' }}
          >
            <h4 className="font-black text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
              🛒 {{ fr: 'Services sélectionnés', ar: 'الخدمات المختارة' }[lang]}
            </h4>
            {selectedServices.map(s => (
              <div key={s.id} className="flex justify-between items-center text-sm">
                <span className="text-vel-slate">{s.name}</span>
                <span className="font-bold" style={{ color: C.accent }}>{s.price.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}</span>
              </div>
            ))}
            <div className="pt-3 flex justify-between items-center font-black text-base" style={{ borderTop: '1px solid rgba(220,38,38,0.16)' }}>
              <span className="text-vel-ink">{{ fr: 'Total services', ar: 'إجمالي الخدمات' }[lang]}</span>
              <span style={{ color: C.accent }}>{selectedServices.reduce((s, x) => s + x.price, 0).toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
