import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Loader2, Pencil, RefreshCcw, Ticket, CheckCircle2, XCircle, X } from 'lucide-react';
import { useWizard } from './WizardContext';
import { SectionCard, SectionTitle, FieldLabel, inputClass, inputStyle, focusInput, blurInput, C, fromYmd } from './wizardUi';

/**
 * Étape 5 — Récapitulatif + confirmation.
 * Résumé complet, ventilation du prix (remise d'offre spéciale appliquée),
 * bouton "Modifier" pour revenir à chaque étape, et confirmation protégée
 * contre le double-clic. En cas d'erreur, les saisies sont conservées.
 */
export const StepRecap: React.FC = () => {
  const {
    lang, car, range, departureTime, returnTime,
    agencies, departureAgency, returnAgency, differentReturnAgency,
    personal, selectedServices, selectedAssurance, notes, setNotes,
    days, promo, basePrice, discount, servicesTotal, assuranceTotal, total,
    promoInput, setPromoInput, promoStatus, promoDiscountPct, promoDiscount, verifyPromo, clearPromo,
    goToStep, prev, isSubmitting, submitError, submit,
  } = useWizard();

  if (!car) return null;

  const agencyName = (id: string) => agencies.find(a => a.id === id)?.name || '—';
  const effectiveReturnAgency = differentReturnAgency ? returnAgency : departureAgency;
  const fmtDate = (s?: string) => (s ? fromYmd(s).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ') : '—');

  const EditButton: React.FC<{ step: number }> = ({ step }) => (
    <button
      onClick={() => goToStep(step)}
      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors text-vel-muted"
      style={{ border: '1px solid rgba(15,23,42,0.1)' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.accent; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.25)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.1)'; }}
    >
      <Pencil size={11} />
      {{ fr: 'Modifier', ar: 'تعديل' }[lang]}
    </button>
  );

  const summaryBlock = (title: string, editStep: number, rows: { label: string; value: string }[]) => (
    <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.06)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-vel-muted uppercase tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>{title}</p>
        <EditButton step={editStep} />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between items-baseline gap-4 text-sm">
          <span className="text-vel-muted">{r.label}</span>
          <span className="font-bold text-vel-ink text-right">{r.value}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <SectionCard>
        <SectionTitle>📋 {{ fr: 'Récapitulatif de la réservation', ar: 'ملخص الحجز' }[lang]}</SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {summaryBlock(
            lang === 'fr' ? '🚗 Véhicule & dates' : '🚗 السيارة والتواريخ', 1,
            [
              { label: lang === 'fr' ? 'Véhicule' : 'السيارة', value: `${car.brand} ${car.model}` },
              { label: lang === 'fr' ? 'Départ' : 'المغادرة', value: `${fmtDate(range.from)} · ${departureTime}` },
              { label: lang === 'fr' ? 'Retour' : 'العودة', value: `${fmtDate(range.to)} · ${returnTime}` },
              { label: lang === 'fr' ? 'Durée' : 'المدة', value: `${days} ${lang === 'fr' ? 'jour(s)' : 'يوم'}` },
            ]
          )}
          {summaryBlock(
            lang === 'fr' ? '🏢 Agences' : '🏢 الوكالات', 2,
            [
              { label: lang === 'fr' ? 'Agence de départ' : 'وكالة المغادرة', value: agencyName(departureAgency) },
              { label: lang === 'fr' ? 'Agence de retour' : 'وكالة الإرجاع', value: agencyName(effectiveReturnAgency) },
            ]
          )}
          {summaryBlock(
            lang === 'fr' ? '🛡️ Assurance de protection' : '🛡️ تأمين الحماية', 3,
            selectedAssurance
              ? [
                  { label: selectedAssurance.name, value: `${selectedAssurance.pricePerDay.toLocaleString()} ${lang === 'fr' ? 'DA/j' : 'د.ج/ي'}` },
                  ...selectedAssurance.items.map(it => ({ label: `${it.status ? '✅' : '❌'} ${it.name}`, value: '' })),
                ]
              : [{ label: lang === 'fr' ? 'Aucune assurance sélectionnée' : 'لم يتم اختيار تأمين', value: '' }]
          )}
          {summaryBlock(
            lang === 'fr' ? '🛎️ Services' : '🛎️ الخدمات', 4,
            selectedServices.length > 0
              ? selectedServices.map(s => ({ label: s.name, value: `${s.price.toLocaleString()} DA` }))
              : [{ label: lang === 'fr' ? 'Aucun service sélectionné' : 'لم يتم اختيار خدمات', value: '' }]
          )}
          {summaryBlock(
            lang === 'fr' ? '👤 Client' : '👤 العميل', 5,
            [
              { label: lang === 'fr' ? 'Nom' : 'الاسم', value: `${personal.firstName} ${personal.lastName}` },
              { label: lang === 'fr' ? 'Téléphone' : 'الهاتف', value: personal.phone },
              { label: 'Email', value: personal.email },
              { label: lang === 'fr' ? 'Wilaya' : 'الولاية', value: personal.wilaya },
            ]
          )}
        </div>
      </SectionCard>

      {/* Ventilation du prix */}
      <SectionCard>
        <SectionTitle>💰 {{ fr: 'Tarification', ar: 'التسعير' }[lang]}</SectionTitle>
        <div className="space-y-3">
          <div className="flex justify-between items-center px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(15,23,42,0.03)' }}>
            <span className="text-vel-slate">
              {days} {{ fr: 'j ×', ar: 'يوم ×' }[lang]} {car.priceDay.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}
            </span>
            <span className="font-bold text-vel-ink">{basePrice.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}</span>
          </div>

          {/* Remise offre spéciale */}
          {promo && discount > 0 && (
            <div className="flex justify-between items-center px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span className="text-vel-slate">
                🏷️ {promo.label || (lang === 'fr' ? 'Offre spéciale' : 'عرض خاص')}
                {' '}({promo.newPrice.toLocaleString()} {{ fr: 'DA/j', ar: 'د.ج/ي' }[lang]})
              </span>
              <span className="font-bold" style={{ color: '#DC2626' }}>
                −{discount.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}
              </span>
            </div>
          )}

          {/* Assurance de protection (prix/jour × durée) */}
          {selectedAssurance && assuranceTotal > 0 && (
            <div className="flex justify-between items-center px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.14)' }}>
              <span className="text-vel-slate">
                🛡️ {selectedAssurance.name} ({days} {{ fr: 'j ×', ar: 'يوم ×' }[lang]} {selectedAssurance.pricePerDay.toLocaleString()})
              </span>
              <span className="font-bold" style={{ color: C.accent }}>{assuranceTotal.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}</span>
            </div>
          )}

          {selectedServices.map(s => (
            <div key={s.id} className="flex justify-between items-center px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(217,119,6,0.05)', border: '1px solid rgba(217,119,6,0.1)' }}>
              <span className="text-vel-slate">{s.name}</span>
              <span className="font-bold" style={{ color: C.amber }}>{s.price.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}</span>
            </div>
          ))}

          {/* ── Code promo : saisie + vérification serveur + remise appliquée ── */}
          <div className="px-4 py-4 rounded-xl space-y-3"
            style={{ background: 'rgba(15,23,42,0.03)', border: '1px dashed rgba(220,38,38,0.25)' }}>
            <p className="flex items-center gap-2 text-xs font-bold text-vel-muted uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-display)' }}>
              <Ticket size={14} style={{ color: C.accent }} />
              {{ fr: 'Code promo (optionnel)', ar: 'رمز الخصم (اختياري)' }[lang]}
            </p>

            {promoStatus === 'valid' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)' }}
              >
                <span className="flex items-center gap-2 text-sm font-bold" style={{ color: '#16A34A' }}>
                  <CheckCircle2 size={16} />
                  {promoInput.trim().toUpperCase()} — −{promoDiscountPct}%
                </span>
                <button onClick={clearPromo} disabled={isSubmitting}
                  className="p-1.5 rounded-lg transition-colors text-vel-muted hover:text-vel-ink"
                  aria-label={lang === 'fr' ? 'Retirer le code' : 'إزالة الرمز'}>
                  <X size={15} />
                </button>
              </motion.div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyPromo(); } }}
                    placeholder={lang === 'fr' ? 'Ex : A7KP93QD' : 'مثال: A7KP93QD'}
                    className={`${inputClass} flex-1 font-mono font-bold tracking-widest uppercase`}
                    style={inputStyle}
                    onFocus={focusInput} onBlur={blurInput}
                    disabled={promoStatus === 'checking'}
                  />
                  <button
                    onClick={verifyPromo}
                    disabled={!promoInput.trim() || promoStatus === 'checking'}
                    className="px-5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(220,38,38,0.08)',
                      border: '1px solid rgba(220,38,38,0.3)',
                      color: C.accent,
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {promoStatus === 'checking'
                      ? <Loader2 size={15} className="animate-spin" />
                      : <>{{ fr: 'Vérifier', ar: 'تحقق' }[lang]}</>}
                  </button>
                </div>
                {promoStatus === 'invalid' && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: '#DC2626' }}
                  >
                    <XCircle size={13} />
                    {{ fr: 'Code invalide, déjà utilisé ou désactivé.', ar: 'رمز غير صالح أو مستخدم أو معطل.' }[lang]}
                  </motion.p>
                )}
              </>
            )}
          </div>

          {/* Remise du code promo */}
          {promoStatus === 'valid' && promoDiscount > 0 && (
            <div className="flex justify-between items-center px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <span className="text-vel-slate">
                🎟️ {{ fr: 'Code promo', ar: 'رمز الخصم' }[lang]} {promoInput.trim().toUpperCase()} (−{promoDiscountPct}%)
              </span>
              <span className="font-bold" style={{ color: '#16A34A' }}>
                −{promoDiscount.toLocaleString()} {{ fr: 'DA', ar: 'د.ج' }[lang]}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center px-4 py-4 rounded-2xl"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <span className="font-black text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
              {{ fr: 'TOTAL', ar: 'المجموع' }[lang]}
            </span>
            <span className="font-black text-3xl" style={{ color: C.accent, fontFamily: 'var(--font-display)', textShadow: '0 0 20px rgba(220,38,38,0.2)' }}>
              {total.toLocaleString()}
              <span className="text-base ml-1" style={{ color: 'rgba(220,38,38,0.75)' }}>{{ fr: 'DA', ar: 'د.ج' }[lang]}</span>
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Notes */}
      <SectionCard>
        <FieldLabel>{{ fr: 'Remarques (optionnel)', ar: 'ملاحظات (اختياري)' }[lang]}</FieldLabel>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          rows={3} className={`${inputClass} resize-none`} style={inputStyle}
          placeholder={lang === 'fr' ? 'Une demande particulière ?' : 'طلب خاص؟'}
          onFocus={focusInput} onBlur={blurInput} />
      </SectionCard>

      {/* Erreur de soumission — les saisies sont conservées, on peut réessayer */}
      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 flex items-start gap-3"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: '#DC2626' }}>{submitError}</p>
          </div>
        </motion.div>
      )}

      {/* Bandeau confirmation */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.16)' }}>
        <h3 className="font-black text-vel-ink text-lg mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          ✅ {{ fr: 'Prêt à confirmer ?', ar: 'جاهز للتأكيد؟' }[lang]}
        </h3>
        <p className="text-vel-muted text-sm">
          {{ fr: 'Votre demande sera enregistrée en attente de confirmation — nous vous contacterons bientôt pour la valider.', ar: 'سيتم تسجيل طلبك في انتظار التأكيد — سنتصل بك قريبًا للتحقق منه.' }[lang]}
        </p>
      </div>

      {/* Navigation finale */}
      <div className="flex gap-4">
        <button
          onClick={prev}
          disabled={isSubmitting}
          className="btn-vel-ghost flex-1 py-4 flex items-center justify-center gap-2 text-sm font-bold"
        >
          <ChevronLeft size={18} /> {{ fr: 'Précédent', ar: 'السابق' }[lang]}
        </button>
        <motion.button
          onClick={submit}
          disabled={isSubmitting}
          whileHover={isSubmitting ? {} : { scale: 1.02 }}
          whileTap={isSubmitting ? {} : { scale: 0.98 }}
          className={`btn-vel-cta flex-1 py-4 flex items-center justify-center gap-2 text-sm ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? (
            <><Loader2 size={18} className="animate-spin" /> {lang === 'fr' ? 'Enregistrement…' : 'جاري التسجيل…'}</>
          ) : submitError ? (
            <><RefreshCcw size={16} /> {{ fr: 'Réessayer', ar: 'إعادة المحاولة' }[lang]}</>
          ) : (
            <>✅ {{ fr: 'Confirmer la réservation', ar: 'تأكيد الحجز' }[lang]}</>
          )}
        </motion.button>
      </div>
    </div>
  );
};
