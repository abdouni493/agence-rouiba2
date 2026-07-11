import React from 'react';
import { Language } from '../../types';
import { motion } from 'motion/react';
import { Phone, Mail, MapPin, ExternalLink } from 'lucide-react';

interface ContactsWebsiteProps {
  lang: Language;
  contactInfo: any;
  websiteSettings: any;
}

export const ContactsWebsite: React.FC<ContactsWebsiteProps> = ({
  lang,
  contactInfo,
  websiteSettings,
}) => {
  const contactMethods = [
    {
      show: !!contactInfo?.phone,
      icon: Phone,
      label: { fr: 'Téléphone', ar: 'الهاتف' },
      value: contactInfo?.phone,
      href: `tel:${contactInfo?.phone}`,
    },
    {
      show: !!contactInfo?.email,
      icon: Mail,
      label: { fr: 'E-mail', ar: 'البريد الإلكتروني' },
      value: contactInfo?.email,
      href: `mailto:${contactInfo?.email}`,
    },
    {
      show: !!contactInfo?.address,
      icon: MapPin,
      label: { fr: 'Adresse', ar: 'العنوان' },
      value: contactInfo?.address,
      href: undefined,
    },
  ];

  const socials = [
    {
      show: !!contactInfo?.facebook,
      label: 'Facebook',
      shortLabel: 'fb',
      href: contactInfo?.facebook,
      hoverColor: '#1877F2',
    },
    {
      show: !!contactInfo?.instagram,
      label: 'Instagram',
      shortLabel: 'ig',
      href: contactInfo?.instagram ? `https://instagram.com/${contactInfo.instagram}` : undefined,
      hoverColor: '#E1306C',
    },
    {
      show: !!contactInfo?.tiktok,
      label: 'TikTok',
      shortLabel: 'tt',
      href: contactInfo?.tiktok ? `https://tiktok.com/@${contactInfo.tiktok}` : undefined,
      hoverColor: '#F8FAFC',
    },
    {
      show: !!contactInfo?.whatsapp,
      label: 'WhatsApp',
      shortLabel: 'wa',
      href: contactInfo?.whatsapp ? `https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}` : undefined,
      hoverColor: '#25D366',
    },
  ].filter(s => s.show && s.href);

  return (
    <div className="min-h-screen bg-vel-void py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20"
        >
          <p className="font-bold text-xs tracking-[0.25em] uppercase mb-4"
            style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Parlons', ar: 'لنتحدث' }[lang]}
          </p>
          <h1 className="font-black text-6xl text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Nous Contacter', ar: 'اتصل بنا' }[lang]}
          </h1>
          <p className="text-vel-muted text-lg mt-4 max-w-2xl mx-auto">
            {{ fr: 'Notre équipe est disponible pour répondre à vos questions', ar: 'فريقنا متاح للرد على أسئلتك' }[lang]}
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">

          {/* LEFT — Agency Info + Contact Methods */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="vel-glass rounded-2xl p-8 space-y-8"
          >
            <div>
              <h2 className="font-black text-3xl text-vel-ink mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                {websiteSettings?.name || 'AutoLocation'}
              </h2>
              <div className="w-10 h-0.5 mb-4"
                style={{ background: '#DC2626', boxShadow: '0 0 8px rgba(220,38,38,0.35)' }} />
              {websiteSettings?.description && (
                <p className="text-vel-muted leading-relaxed">{websiteSettings.description}</p>
              )}
            </div>

            <div className="space-y-4">
              {contactMethods.filter(m => m.show).map((method, i) => {
                const content = (
                  <div className="flex items-center gap-4 p-4 rounded-xl transition-all duration-300 group/item cursor-pointer"
                    style={{
                      background: 'rgba(220,38,38,0.04)',
                      border: '1px solid rgba(15,23,42,0.08)',
                      borderLeftWidth: '2px',
                      borderLeftColor: '#DC2626',
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg vel-glass-accent flex items-center justify-center flex-shrink-0">
                      <method.icon size={18} style={{ color: '#DC2626' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-vel-muted mb-0.5">{method.label[lang]}</p>
                      <p className="text-vel-ink font-bold truncate transition-colors"
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; }}>
                        {method.value}
                      </p>
                    </div>
                    {method.href && <ExternalLink size={14} className="text-vel-dim ml-auto flex-shrink-0" />}
                  </div>
                );

                return method.href ? (
                  <motion.a key={i} href={method.href} whileHover={{ x: 4 }} className="block">
                    {content}
                  </motion.a>
                ) : (
                  <motion.div key={i} whileHover={{ x: 4 }}>
                    {content}
                  </motion.div>
                );
              })}

              {contactInfo?.whatsapp && (
                <motion.a
                  href={`https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-4 p-4 rounded-xl block transition-all duration-300"
                  style={{
                    background: 'rgba(37,211,102,0.05)',
                    border: '1px solid rgba(15,23,42,0.08)',
                    borderLeftWidth: '2px',
                    borderLeftColor: '#25D366',
                  }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#25D366]"
                    style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)' }}>
                    wa
                  </div>
                  <div>
                    <p className="text-xs font-bold text-vel-muted mb-0.5">WhatsApp</p>
                    <p className="text-vel-ink font-bold">{contactInfo.whatsapp}</p>
                  </div>
                  <ExternalLink size={14} className="text-vel-dim ml-auto" />
                </motion.a>
              )}
            </div>
          </motion.div>

          {/* RIGHT — Social Media */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="vel-glass rounded-2xl p-8 space-y-8"
          >
            <div>
              <h3 className="font-black text-2xl text-vel-ink" style={{ fontFamily: 'var(--font-display)' }}>
                {{ fr: 'Suivez-nous', ar: 'تابعنا' }[lang]}
              </h3>
              <div className="w-10 h-0.5 mt-2 mb-6" style={{ background: '#DC2626' }} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {socials.map((social, i) => (
                <motion.a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  className="vel-glass rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300"
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${social.hoverColor}30`;
                    (e.currentTarget as HTMLElement).style.borderColor = `${social.hoverColor}40`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(15,23,42,0.08)';
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black"
                    style={{
                      background: `${social.hoverColor}15`,
                      border: `1px solid ${social.hoverColor}30`,
                      color: social.hoverColor,
                      fontFamily: 'var(--font-display)',
                    }}>
                    {social.shortLabel}
                  </div>
                  <p className="font-bold text-vel-slate text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                    {social.label}
                  </p>
                </motion.a>
              ))}
            </div>

            {socials.length === 0 && (
              <p className="text-vel-dim text-sm text-center py-8">
                {{ fr: 'Aucun réseau social configuré', ar: 'لا توجد شبكات اجتماعية مضافة' }[lang]}
              </p>
            )}
          </motion.div>
        </div>

        {/* Contact Form */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="vel-glass rounded-2xl p-8 max-w-2xl mx-auto"
        >
          <h3 className="font-black text-2xl text-vel-ink mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            {{ fr: 'Envoyez-nous un message', ar: 'أرسل لنا رسالة' }[lang]}
          </h3>
          <div className="w-10 h-0.5 mb-8" style={{ background: '#DC2626' }} />

          <form className="space-y-5" onSubmit={e => e.preventDefault()}>
            {[
              { type: 'text', labelFr: 'Votre nom', labelAr: 'اسمك', placeholder: { fr: 'Jean Dupont', ar: 'محمد علي' } },
              { type: 'email', labelFr: 'Votre e-mail', labelAr: 'بريدك الإلكتروني', placeholder: { fr: 'email@example.com', ar: 'email@example.com' } },
              { type: 'text', labelFr: 'Sujet', labelAr: 'الموضوع', placeholder: { fr: 'Comment puis-je vous aider ?', ar: 'كيف يمكنني مساعدتك؟' } },
            ].map((field, i) => (
              <div key={i}>
                <label className="block text-xs font-bold text-vel-muted mb-2 uppercase tracking-wider"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {lang === 'fr' ? field.labelFr : field.labelAr}
                </label>
                <input
                  type={field.type}
                  className="w-full rounded-xl px-4 py-3 outline-none transition-all text-vel-ink placeholder:text-vel-dim font-medium"
                  style={{ background: '#EEF2F7', border: '1px solid rgba(15,23,42,0.08)' }}
                  placeholder={field.placeholder[lang]}
                  onFocus={e => {
                    (e.target as HTMLElement).style.borderColor = '#DC2626';
                    (e.target as HTMLElement).style.boxShadow = '0 0 0 1px rgba(220,38,38,0.25)';
                  }}
                  onBlur={e => {
                    (e.target as HTMLElement).style.borderColor = 'rgba(15,23,42,0.08)';
                    (e.target as HTMLElement).style.boxShadow = 'none';
                  }}
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold text-vel-muted mb-2 uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-display)' }}>
                {{ fr: 'Message', ar: 'الرسالة' }[lang]}
              </label>
              <textarea
                rows={4}
                className="w-full rounded-xl px-4 py-3 outline-none transition-all text-vel-ink placeholder:text-vel-dim font-medium resize-none"
                style={{ background: '#EEF2F7', border: '1px solid rgba(15,23,42,0.08)' }}
                placeholder={{ fr: 'Votre message...', ar: 'رسالتك...' }[lang]}
                onFocus={e => {
                  (e.target as HTMLElement).style.borderColor = '#DC2626';
                  (e.target as HTMLElement).style.boxShadow = '0 0 0 1px rgba(220,38,38,0.25)';
                }}
                onBlur={e => {
                  (e.target as HTMLElement).style.borderColor = 'rgba(15,23,42,0.08)';
                  (e.target as HTMLElement).style.boxShadow = 'none';
                }}
              />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-vel-cta w-full py-4"
            >
              {{ fr: 'Envoyer le message', ar: 'إرسال الرسالة' }[lang]}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
