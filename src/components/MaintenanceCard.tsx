import React from 'react';
import { motion } from 'motion/react';
import { Car, Language } from '../types';
import { MaintenanceStatus, getStatusColor, getStatusEmoji } from '../services/maintenanceService';
import { Edit2 } from 'lucide-react';

interface MaintenanceCardProps {
  maintenance: MaintenanceStatus;
  lang: Language;
  onEditCar: (car: Car) => void;
  onVidangeClick: (car: Car, expenseId?: string) => void;
  onChaineClick: (car: Car, expenseId?: string) => void;
  onAssuranceClick: (car: Car, expenseId?: string) => void;
  onControleClick: (car: Car, expenseId?: string) => void;
}

export const MaintenanceCard: React.FC<MaintenanceCardProps> = ({
  maintenance,
  lang,
  onEditCar,
  onVidangeClick,
  onChaineClick,
  onAssuranceClick,
  onControleClick,
}) => {
  const { car, vidange, chaine, assurance, controleTechnique } = maintenance;

  const getMaintenanceItems = () => {
    return [
      {
        type: 'vidange',
        icon: '🛢️',
        label: lang === 'fr' ? 'Vidange' : 'تغيير الزيت',
        status: vidange,
        statusValue: vidange.kmRemaining,
        threshold: 1000,
        suffix: lang === 'fr' ? ' KM' : ' كم',
        onClick: () => onVidangeClick(car, vidange.expense?.id),
        color: getStatusColor('vidange', vidange.kmRemaining),
        hoverColor: 'hover:bg-blue-100',
        borderColor: 'border-blue-200 hover:border-blue-400',
      },
      {
        type: 'chaine',
        icon: '⛓️',
        label: lang === 'fr' ? 'Chaîne' : 'السلسلة',
        status: chaine,
        statusValue: chaine.kmRemaining,
        threshold: 1000,
        suffix: lang === 'fr' ? ' KM' : ' كم',
        onClick: () => onChaineClick(car, chaine.expense?.id),
        color: getStatusColor('chaine', chaine.kmRemaining),
        hoverColor: 'hover:bg-purple-100',
        borderColor: 'border-purple-200 hover:border-purple-400',
      },
      {
        type: 'assurance',
        icon: '🛡️',
        label: lang === 'fr' ? 'Assurance' : 'التأمين',
        status: assurance,
        statusValue: assurance.daysRemaining,
        threshold: 30,
        suffix: lang === 'fr' ? ' Jours' : ' أيام',
        onClick: () => onAssuranceClick(car, assurance.expense?.id),
        color: getStatusColor('assurance', assurance.daysRemaining),
        hoverColor: 'hover:bg-green-100',
        borderColor: 'border-green-200 hover:border-green-400',
      },
      {
        type: 'controle',
        icon: '🛠️',
        label: lang === 'fr' ? 'Contrôle' : 'الفحص الفني',
        status: controleTechnique,
        statusValue: controleTechnique.daysRemaining,
        threshold: 30,
        suffix: lang === 'fr' ? ' Jours' : ' أيام',
        onClick: () => onControleClick(car, controleTechnique.expense?.id),
        color: getStatusColor('controle', controleTechnique.daysRemaining),
        hoverColor: 'hover:bg-orange-100',
        borderColor: 'border-orange-200 hover:border-orange-400',
      },
    ];
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="glass-card overflow-hidden bg-white flex flex-col group"
    >
      {/* Car Header Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={car.images[0] || 'https://picsum.photos/seed/car/400/300'}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Year Badge */}
        <div className="absolute top-2 right-2 bg-saas-primary-start/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg backdrop-blur-sm shadow-lg">
          {car.year}
        </div>

        {/* Edit Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onEditCar(car)}
          className="absolute top-3 left-3 p-2.5 bg-white/95 hover:bg-white text-saas-primary-via rounded-xl transition-all shadow-lg hover:shadow-xl"
        >
          <Edit2 size={18} />
        </motion.button>
      </div>

      {/* Car Info */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-black text-saas-text-main uppercase tracking-tighter">
            {car.brand} {car.model}
          </h3>
          <p className="text-[10px] text-saas-primary-via font-bold uppercase tracking-widest">{car.registration}</p>
        </div>

        {/* Current Mileage */}
        <div className="bg-saas-bg rounded-xl p-3 border border-saas-border">
          <p className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest mb-1">📍 Kilométrage Actuel</p>
          <p className="text-2xl font-black text-saas-primary-via tracking-tighter">{car.mileage.toLocaleString()} KM</p>
        </div>

        {/* Maintenance Items Grid */}
        <div className="space-y-2.5">
          {getMaintenanceItems().map((item) => {
            const isExpired = item.statusValue !== null && (
              (item.type === 'vidange' || item.type === 'chaine') 
                ? item.statusValue <= 0 
                : item.statusValue < 0
            );

            const statusBgColor =
              item.color === 'critical'
                ? 'bg-red-50 border-red-200'
                : item.color === 'warning'
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200';

            const statusTextColor =
              item.color === 'critical'
                ? 'text-red-700'
                : item.color === 'warning'
                ? 'text-amber-700'
                : 'text-green-700';

            return (
              <motion.button
                key={item.type}
                onClick={item.onClick}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full p-3.5 rounded-xl border-2 transition-all ${statusBgColor} hover:shadow-md flex items-center justify-between group/item`}
              >
                <div className="flex items-center gap-3 text-left flex-1">
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className={`text-xs font-bold uppercase tracking-widest ${statusTextColor}`}>
                      {item.label}
                    </p>
                    {item.status.lastDate && (
                      <div className="text-[9px] opacity-60 mt-0.5 space-y-0.5">
                        <p>
                          {lang === 'fr' ? 'Dernier:' : 'آخر:'} {new Date(item.status.lastDate).toLocaleDateString(
                            lang === 'fr' ? 'fr-FR' : 'ar-SA'
                          )}
                        </p>
                        {item.status.lastMileage !== null && item.status.lastMileage !== undefined && (
                          <p>
                            {lang === 'fr' ? 'À' : 'في'} {item.status.lastMileage.toLocaleString()} km
                          </p>
                        )}
                        {item.status.nextMileage !== null && item.status.nextMileage !== undefined && (
                          <p className={`font-bold ${statusTextColor}`}>
                            {lang === 'fr' ? 'Prochain à' : 'القادم في'} {item.status.nextMileage.toLocaleString()} km
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-black">
                      {getStatusEmoji(item.color)}
                    </span>
                    <div>
                      <p className={`text-xs font-bold uppercase tracking-widest ${statusTextColor} opacity-70 mb-0.5`}>
                        {lang === 'fr' ? 'Restant' : 'متبقي'}
                      </p>
                      <p className={`text-lg font-black ${statusTextColor} tracking-tighter`}>
                        {item.statusValue !== null && item.statusValue !== undefined
                          ? Math.abs(item.statusValue).toLocaleString()
                          : '—'}
                      </p>
                      <p className={`text-[8px] font-bold uppercase tracking-widest ${statusTextColor} opacity-60`}>
                        {item.suffix}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-5 py-4 border-t border-saas-border bg-saas-bg/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">{car.transmission}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">⛽</span>
          <span className="text-[10px] font-bold text-saas-text-muted uppercase tracking-widest">{car.energy}</span>
        </div>
      </div>
    </motion.div>
  );
};
