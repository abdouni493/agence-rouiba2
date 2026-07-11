import React from 'react';
import { motion } from 'motion/react';
import { Car, Language } from '../types';
import { X } from 'lucide-react';

interface CarDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: Car;
  lang: Language;
}

export const CarDetailsModal: React.FC<CarDetailsModalProps> = ({ isOpen, onClose, car, lang }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-saas-border"
      >
        <div className="p-8 border-b border-saas-border flex items-center justify-between bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              👁️ Détails du Véhicule: {car.brand} {car.model}
            </h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
              {lang === 'fr' ? 'Fiche technique complète' : 'المواصفات الفنية الكاملة'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-saas-bg">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Images Gallery */}
            <div className="p-8 space-y-6 bg-white border-r border-saas-border">
              <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white group">
                <img 
                  src={car.images[0] || 'https://picsum.photos/seed/car/800/600'} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {car.images.slice(1).map((img, idx) => (
                  <div key={idx} className="aspect-video rounded-2xl overflow-hidden shadow-lg border-2 border-white group">
                    <img 
                      src={img} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Information Details */}
            <div className="p-8 space-y-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-saas-text-muted tracking-widest">Marque & Modèle</p>
                  <p className="text-xl font-black text-saas-text-main uppercase tracking-tighter">{car.brand} {car.model}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-saas-text-muted tracking-widest">Immatriculation</p>
                  <p className="text-xl font-black text-saas-primary-via tracking-tighter">{car.registration}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-saas-text-muted tracking-widest">Année</p>
                  <p className="text-xl font-black text-saas-text-main">{car.year}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-saas-text-muted tracking-widest">Couleur</p>
                  <p className="text-xl font-black text-saas-text-main uppercase tracking-tighter">{car.color}</p>
                </div>
              </div>

              <div className="h-[1px] bg-saas-border" />

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl text-center border border-saas-border shadow-sm">
                  <p className="text-[9px] uppercase font-bold text-saas-text-muted tracking-widest mb-1.5">Énergie</p>
                  <p className="text-xs font-black text-saas-text-main uppercase">⛽ {car.energy}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl text-center border border-saas-border shadow-sm">
                  <p className="text-[9px] uppercase font-bold text-saas-text-muted tracking-widest mb-1.5">Boîte</p>
                  <p className="text-xs font-black text-saas-text-main uppercase">⚙️ {car.transmission}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl text-center border border-saas-border shadow-sm">
                  <p className="text-[9px] uppercase font-bold text-saas-text-muted tracking-widest mb-1.5">Places</p>
                  <p className="text-xs font-black text-saas-text-main uppercase">👥 {car.seats}</p>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-[10px] font-black text-saas-primary-via uppercase tracking-[0.3em]">💰 Tarification (DZD)</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex flex-col p-5 bg-white rounded-2xl border border-saas-border shadow-sm">
                    <span className="text-[9px] font-bold text-saas-text-muted uppercase tracking-widest mb-1.5">Prix/Jour</span>
                    <span className="text-2xl font-black text-saas-text-main tracking-tighter">{car.priceDay.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col p-5 bg-white rounded-2xl border border-saas-border shadow-sm">
                    <span className="text-[9px] font-bold text-saas-text-muted uppercase tracking-widest mb-1.5">Prix/Semaine</span>
                    <span className="text-2xl font-black text-saas-text-main tracking-tighter">{car.priceWeek?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col p-5 bg-white rounded-2xl border border-saas-border shadow-sm">
                    <span className="text-[9px] font-bold text-saas-text-muted uppercase tracking-widest mb-1.5">Prix/Mois</span>
                    <span className="text-2xl font-black text-saas-text-main tracking-tighter">{car.priceMonth?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col p-5 bg-white rounded-2xl border border-saas-border shadow-sm">
                    <span className="text-[9px] font-bold text-saas-text-muted uppercase tracking-widest mb-1.5">Caution</span>
                    <span className="text-2xl font-black text-saas-primary-via tracking-tighter">{car.deposit.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-saas-primary-start/5 rounded-2xl border border-saas-primary-via/10">
                <p className="text-[9px] uppercase font-bold text-saas-primary-via tracking-widest mb-1.5">Numéro de Châssis (VIN)</p>
                <p className="text-sm font-mono font-black text-saas-text-main tracking-wider">{car.vin}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-saas-border flex items-center justify-end bg-white">
          <button onClick={onClose} className="btn-saas-primary px-12">
            {lang === 'fr' ? 'Fermer' : 'إغلاق'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
