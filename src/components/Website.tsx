import React, { useState } from 'react';
import { Language, Car, Agency } from '../types';
import { motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Welcome } from './website/Welcome';
import { OffersListing } from './website/OffersListing';
import { SpecialOffersListing } from './website/SpecialOffersListing';
import { ContactsWebsite } from './website/ContactsWebsite';
import { ReservationWizard } from './website/wizard/ReservationWizard';
import { WizardSearchCriteria } from './website/wizard/WizardContext';

interface WebsiteProps {
  lang: Language;
  onLangChange?: (lang: Language) => void;
  /** Voitures visibles sur le site (les masquées sont déjà filtrées par App). */
  cars: Car[];
  agencies: Agency[];
  isLoadingAgencies?: boolean;
  specialOffers: any[];
  contactInfo: any;
  websiteSettings: any;
}

export const Website: React.FC<WebsiteProps> = ({
  lang,
  onLangChange,
  cars,
  agencies,
  isLoadingAgencies = false,
  specialOffers,
  contactInfo,
  websiteSettings,
}) => {
  const [currentPage, setCurrentPage] = useState<'home' | 'offers' | 'special' | 'contacts' | 'orders'>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  // Recherche de disponibilité lancée depuis le landing (agences + période)
  const [searchCriteria, setSearchCriteria] = useState<WizardSearchCriteria | null>(null);

  // Limit displayed agency name to first 3 words
  const shortName = (name: string | undefined) =>
    name ? name.split(/\s+/).slice(0, 3).join(' ') : 'AutoLocation';

  const handleReserveClick = (car: Car) => {
    setSelectedCar(car);
    setSearchCriteria(null);
    setCurrentPage('orders');
  };

  // Landing → wizard pré-rempli avec agences + dates, voitures filtrées par dispo
  const handleAvailabilitySearch = (criteria: WizardSearchCriteria) => {
    setSelectedCar(null);
    setSearchCriteria(criteria);
    setCurrentPage('orders');
  };

  const navItems = [
    { id: 'home', label: { fr: 'Accueil', ar: 'الرئيسية' } },
    { id: 'offers', label: { fr: 'Offres', ar: 'العروض' } },
    { id: 'special', label: { fr: 'Spéciales', ar: 'خاصة' } },
    { id: 'orders', label: { fr: 'Commander', ar: 'طلب' } },
    { id: 'contacts', label: { fr: 'Contacts', ar: 'جهات الاتصال' } },
  ];

  return (
    <div className="min-h-screen bg-vel-void" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-vel-border bg-vel-void/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => setCurrentPage('home')}
            >
              <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 transition-all duration-300"
                style={{ borderColor: 'rgba(220,38,38,0.25)', boxShadow: '0 0 16px rgba(220,38,38,0.2)' }}>
                {websiteSettings?.logo ? (
                  <img
                    src={websiteSettings.logo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-vel-void text-xl font-black"
                    style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)', fontFamily: 'var(--font-display)' }}>
                    A
                  </div>
                )}
              </div>
              <div className="hidden sm:block">
                <h1 className="font-black text-xl text-vel-ink transition-colors"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {shortName(websiteSettings?.name)}
                </h1>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase"
                  style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
                  {{ fr: 'Location de Voitures', ar: 'تأجير السيارات' }[lang]}
                </p>
              </div>
            </motion.div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item, i) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => setCurrentPage(item.id as any)}
                  className={`relative px-5 py-2 font-bold text-xs tracking-[0.15em] uppercase rounded-lg transition-all duration-300 ${
                    currentPage === item.id
                      ? ''
                      : 'text-vel-muted hover:text-vel-slate'
                  }`}
                  style={{
                    ...(currentPage === item.id ? { color: '#DC2626' } : {}),
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  {item.label[lang]}
                  {currentPage === item.id && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                      style={{ background: '#DC2626', boxShadow: '0 0 8px rgba(220,38,38,0.3)' }}
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {onLangChange && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onLangChange(lang === 'fr' ? 'ar' : 'fr')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200"
                  style={{
                    fontFamily: 'var(--font-display)',
                    color: '#DC2626',
                    border: '1px solid rgba(220,38,38,0.25)',
                    background: 'rgba(220,38,38,0.06)',
                  }}
                >
                  {lang === 'fr' ? 'عربي' : 'FR'}
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-vel-slate transition-all"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; }}
                style={{ background: isMobileMenuOpen ? 'rgba(15,23,42,0.04)' : 'transparent' }}
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </motion.button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-4 border-t border-vel-border"
            >
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setCurrentPage(item.id as any); setIsMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-3 font-bold text-xs tracking-[0.15em] uppercase transition-all ${
                    currentPage === item.id ? '' : 'text-vel-muted hover:text-vel-slate'
                  }`}
                  style={{
                    ...(currentPage === item.id ? { color: '#DC2626' } : {}),
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  {item.label[lang]}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {currentPage === 'home' && (
          <Welcome
            lang={lang}
            websiteSettings={websiteSettings}
            agencies={agencies}
            onStartRenting={() => setCurrentPage('offers')}
            onReserve={() => { setSelectedCar(null); setCurrentPage('orders'); }}
            onSearch={handleAvailabilitySearch}
            showcaseImage={cars[0]?.images?.[0]}
          />
        )}
        {currentPage === 'offers' && (
          <OffersListing lang={lang} cars={cars} specialOffers={specialOffers} onOrder={handleReserveClick} />
        )}
        {currentPage === 'special' && (
          <SpecialOffersListing lang={lang} specialOffers={specialOffers} onOrder={handleReserveClick} />
        )}
        {currentPage === 'orders' && (
          <ReservationWizard
            // Nouvelle recherche / nouvelle voiture = wizard réinitialisé
            key={searchCriteria
              ? `search-${searchCriteria.from}-${searchCriteria.to}-${searchCriteria.departureAgencyId}-${searchCriteria.returnAgencyId || ''}`
              : selectedCar ? `car-${selectedCar.id}` : 'default'}
            lang={lang}
            cars={cars}
            specialOffers={specialOffers}
            agencies={agencies}
            isLoadingAgencies={isLoadingAgencies}
            selectedCar={selectedCar}
            initialSearch={searchCriteria}
            websiteSettings={websiteSettings}
            onBackHome={() => { setSelectedCar(null); setSearchCriteria(null); setCurrentPage('home'); }}
          />
        )}
        {currentPage === 'contacts' && (
          <ContactsWebsite lang={lang} contactInfo={contactInfo} websiteSettings={websiteSettings} />
        )}
      </motion.div>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#FFFFFF', borderTop: '1px solid rgba(15,23,42,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <h3 className="font-black text-2xl text-vel-ink mb-2"
                style={{ fontFamily: 'var(--font-display)' }}>
                {shortName(websiteSettings?.name)}
              </h3>
              <div className="w-12 h-0.5 mb-4" style={{ background: '#DC2626', boxShadow: '0 0 8px rgba(220,38,38,0.35)' }} />
              <p className="text-vel-muted text-sm leading-relaxed">{websiteSettings?.description}</p>
            </div>

            {/* Nav links */}
            <div>
              <h4 className="font-bold text-xs tracking-[0.2em] uppercase mb-5" style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
                {{ fr: 'Navigation', ar: 'الملاحة' }[lang]}
              </h4>
              <ul className="space-y-3">
                {navItems.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => setCurrentPage(item.id as any)}
                      className="text-vel-muted text-sm transition-colors font-medium"
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; }}
                    >
                      {item.label[lang]}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-xs tracking-[0.2em] uppercase mb-5" style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
                {{ fr: 'Contact', ar: 'اتصل' }[lang]}
              </h4>
              <ul className="space-y-3 text-vel-muted text-sm">
                {contactInfo?.phone && (
                  <li className="flex items-center gap-2">
                    <span style={{ color: '#DC2626' }}>→</span> {contactInfo.phone}
                  </li>
                )}
                {contactInfo?.email && (
                  <li className="flex items-center gap-2">
                    <span style={{ color: '#DC2626' }}>→</span> {contactInfo.email}
                  </li>
                )}
                {contactInfo?.address && (
                  <li className="flex items-center gap-2">
                    <span style={{ color: '#DC2626' }}>→</span> {contactInfo.address}
                  </li>
                )}
              </ul>
            </div>

            {/* Social */}
            <div>
              <h4 className="font-bold text-xs tracking-[0.2em] uppercase mb-5" style={{ color: '#DC2626', fontFamily: 'var(--font-display)' }}>
                {{ fr: 'Suivez-nous', ar: 'تابعنا' }[lang]}
              </h4>
              <div className="flex flex-wrap gap-3">
                {contactInfo?.facebook && (
                  <a href={contactInfo.facebook} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 vel-glass rounded-lg flex items-center justify-center text-vel-muted transition-all text-sm font-bold"
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ''; }}>
                    f
                  </a>
                )}
                {contactInfo?.instagram && (
                  <a href={`https://instagram.com/${contactInfo.instagram}`} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 vel-glass rounded-lg flex items-center justify-center text-vel-muted hover:text-pink-600 transition-all text-sm font-bold">
                    ig
                  </a>
                )}
                {contactInfo?.tiktok && (
                  <a href={`https://tiktok.com/@${contactInfo.tiktok}`} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 vel-glass rounded-lg flex items-center justify-center text-vel-muted hover:text-vel-ink transition-all text-xs font-bold">
                    tt
                  </a>
                )}
                {contactInfo?.whatsapp && (
                  <a href={`https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 vel-glass rounded-lg flex items-center justify-center text-vel-muted hover:text-green-600 transition-all text-xs font-bold">
                    wa
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
            style={{ borderTop: '1px solid rgba(15,23,42,0.08)' }}>
            <p className="text-vel-dim text-sm">
              © {new Date().getFullYear()} {shortName(websiteSettings?.name)}.{' '}
              <span className="text-vel-muted">{{ fr: 'Tous droits réservés.', ar: 'جميع الحقوق محفوظة.' }[lang]}</span>
            </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#DC2626' }} />
              <span className="text-vel-dim text-xs tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
                POWERED BY AUTO LOCATION
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
