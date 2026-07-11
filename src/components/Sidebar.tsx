import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X } from 'lucide-react';
import { SIDEBAR_ITEMS } from '../constants';
import { Language } from '../types';
import { DatabaseService } from '../services/DatabaseService';

interface SidebarProps {
  lang: Language;
  isVisible: boolean;
  setIsVisible: (val: boolean) => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertsCount?: number;
  /** Agency branding, already fetched once at the App level. When provided the
   *  Sidebar reads from it instead of firing its own duplicate query — which
   *  previously re-ran on every remount and made the logo re-flash. */
  websiteSettings?: { name?: string; logo?: string } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  lang, isVisible, setIsVisible, onLogout, activeTab, setActiveTab, alertsCount = 0, websiteSettings
}) => {
  const isRtl = lang === 'ar';
  const [agencyData, setAgencyData] = useState({
    name: 'AutoFutur',
    logo: '',
  });

  // Prefer the branding already loaded by App. Only fall back to a one-off fetch
  // when it wasn't provided, so we never duplicate the request or reload the logo.
  useEffect(() => {
    if (websiteSettings) {
      setAgencyData({
        name: websiteSettings.name || 'AutoFutur',
        logo: websiteSettings.logo || '',
      });
      return;
    }

    let cancelled = false;
    const loadAgencyData = async () => {
      try {
        const settings = await DatabaseService.getWebsiteSettings();
        if (cancelled) return;
        setAgencyData({
          name: settings.name || 'AutoFutur',
          logo: settings.logo || '',
        });
      } catch (error) {
        console.error('Error loading agency data:', error);
        if (!cancelled) setAgencyData({ name: 'AutoFutur', logo: '' });
      }
    };

    loadAgencyData();
    return () => { cancelled = true; };
  }, [websiteSettings]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ x: isRtl ? '100%' : '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: isRtl ? '100%' : '-100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 left-0 z-50 w-72 bg-white text-saas-text-main flex flex-col shadow-xl ltr:left-0 rtl:right-0 border-r border-saas-border lg:static lg:h-screen lg:sticky lg:top-0 lg:shadow-none"
          style={{ [isRtl ? 'right' : 'left']: 0 }}
        >
          <div className="p-8 flex items-center justify-between border-b border-saas-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-saas-border shadow-lg shadow-saas-primary-start/20 flex items-center justify-center flex-shrink-0">
                {agencyData.logo ? (
                  <img
                    src={agencyData.logo}
                    alt="Agency Logo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-white font-black text-xl italic bg-linear-to-br from-saas-primary-start to-saas-primary-end w-full h-full flex items-center justify-center">
                    A
                  </span>
                )}
              </div>
              <span className="text-xl font-black tracking-tighter uppercase">
                {agencyData.name.split(' ').slice(0, 3).join(' ').split(' ')[0]}<span className="text-saas-primary-via">{agencyData.name.split(' ').slice(0, 3).join(' ').split(' ').slice(1).join(' ')}</span>
              </span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 rounded-lg hover:bg-saas-bg text-saas-text-muted transition-colors lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-1.5 custom-scrollbar">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) {
                    setIsVisible(false);
                  }
                }}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 group relative
                  ${activeTab === item.id 
                    ? 'bg-saas-bg text-saas-primary-via shadow-sm border border-saas-border' 
                    : 'text-saas-text-muted hover:bg-saas-bg hover:text-saas-text-main'}`}
              >
                <span className={`text-xl shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110 text-saas-primary-via' : 'group-hover:scale-110 group-hover:text-saas-primary-via'}`}>
                  {item.icon}
                </span>
                <span className={`text-xs font-bold uppercase tracking-widest ${activeTab === item.id ? 'text-saas-text-main' : ''}`}>
                  {item.label[lang]}
                </span>
                
                {/* Animated alert indicator for dashboard - Modern spinning design */}
                {item.id === 'dashboard' && alertsCount > 0 && (
                  <motion.div
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 flex items-center justify-center"
                  >
                    {/* Outer rotating ring */}
                    <motion.div
                      className="absolute w-6 h-6 rounded-full border-2 border-transparent border-t-red-500 border-r-red-400"
                      animate={{ rotate: 360 }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    />
                    
                    {/* Middle pulsing ring */}
                    <motion.div
                      className="absolute w-4 h-4 rounded-full border border-red-500/50"
                      animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [1, 0.4, 1]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    
                    {/* Inner glowing dot */}
                    <motion.div
                      className="w-2.5 h-2.5 bg-gradient-to-br from-red-500 to-orange-500 rounded-full shadow-lg shadow-red-500/80"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        boxShadow: [
                          '0 0 8px rgba(239, 68, 68, 0.8)',
                          '0 0 16px rgba(239, 68, 68, 1)',
                          '0 0 8px rgba(239, 68, 68, 0.8)'
                        ]
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                )}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-saas-border bg-saas-bg/50">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-xl text-saas-danger-start hover:bg-saas-danger-start/5 transition-all font-bold uppercase tracking-widest text-xs border border-transparent hover:border-saas-danger-start/10"
            >
              <LogOut size={18} />
              <span>
                {lang === 'fr' ? 'Déconnexion' : 'تسجيل الخروج'}
              </span>
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};
