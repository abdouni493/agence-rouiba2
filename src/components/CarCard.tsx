import React from 'react';
import { Car, Language } from '../types';
import { motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';

interface CarCardProps {
  car: Car;
  lang: Language;
  // Actions admin — optionnelles : chaque bouton n'apparaît que si son callback est fourni,
  // ce qui permet de réutiliser la même carte dans l'interface Offres.
  onDelete?: (id: string) => void;
  onEdit?: (car: Car) => void;
  onViewDetails?: (car: Car) => void;
  onHistory?: (car: Car) => void;
  onExpenses?: (car: Car) => void;
  onReports?: (car: Car) => void;
  onStatusChange?: (carId: string, newStatus: string) => void;
  /** Toggle masquer/afficher la voiture sur le site public (interface Offres). */
  onToggleVisibility?: (car: Car) => void;
  /** Réservation en cours pour ce véhicule (si louer/reserve) */
  activeReservationInfo?: { clientName: string; departureDate: string; returnDate: string } | null;
}

export const CarCard: React.FC<CarCardProps> = ({
  car,
  lang,
  onDelete,
  onEdit,
  onViewDetails,
  onHistory,
  onExpenses,
  onReports,
  onStatusChange,
  onToggleVisibility,
  activeReservationInfo,
}) => {
  // 4 statuts : disponible · reserve · louer · maintenance
  const getStatusColor = (status?: string) => {
    switch(status) {
      case 'louer':       return 'bg-red-100 text-red-800 border-red-300';
      case 'reserve':     return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'maintenance': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'disponible':
      default:            return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch(status) {
      case 'louer':       return lang === 'fr' ? 'En Location'      : 'في الإيجار';
      case 'reserve':     return lang === 'fr' ? 'Réservé'          : 'محجوز';
      case 'maintenance': return lang === 'fr' ? 'En Maintenance'   : 'في الصيانة';
      case 'disponible':
      default:            return lang === 'fr' ? 'Disponible'       : 'متاح';
    }
  };

  const isMaintenance = car.status === 'maintenance';
  const isHidden = car.isHiddenFromSite === true;
  const hasAdminActions = !!(onViewDetails || onEdit || onHistory || onExpenses || onReports || onDelete);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isHidden ? 0.6 : 1, scale: isHidden ? 0.98 : 1 }}
      transition={{ duration: 0.3 }}
      className="glass-card overflow-hidden bg-white flex flex-col group"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={car.images[0] || 'https://picsum.photos/seed/car/400/300'}
          alt={`${car.brand} ${car.model}`}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isHidden ? 'grayscale' : ''}`}
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2 right-2 bg-saas-primary-start/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm shadow-lg">
          {car.year}
        </div>
        {isHidden && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-800/85 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-lg"
          >
            <EyeOff size={12} />
            {lang === 'fr' ? 'Masqué' : 'مخفي'}
          </motion.div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-black text-saas-text-main uppercase tracking-tighter">
            {car.brand} {car.model}
          </h3>
          <p className="text-[10px] text-saas-primary-via font-bold uppercase tracking-widest">{car.registration}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-saas-text-muted uppercase tracking-tight">
          <div className="flex items-center gap-1.5">
            <span className="text-saas-primary-via">⛽</span> {car.energy}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-saas-primary-via">⚙️</span> {car.transmission}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-saas-primary-via">👥</span> {car.seats} Places
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-saas-primary-via">🎨</span> {car.color}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center justify-between">
            <div className={`text-[9px] font-bold px-3 py-1.5 rounded-lg border ${getStatusColor(car.status)}`}>
              {getStatusLabel(car.status)}
            </div>
            {/* Bouton maintenance uniquement (pas de toggle disponible ↔ louer) */}
            {onStatusChange && (
              <button
                onClick={() => onStatusChange(car.id, isMaintenance ? 'disponible' : 'maintenance')}
                className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-colors ${
                  isMaintenance
                    ? 'bg-green-100 hover:bg-green-200 text-green-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
                title={isMaintenance
                  ? (lang === 'fr' ? 'Fin de maintenance' : 'إنهاء الصيانة')
                  : (lang === 'fr' ? 'Mettre en maintenance' : 'وضع في الصيانة')}
              >
                {isMaintenance
                  ? (lang === 'fr' ? '✓ Fin maintenance' : '✓ إنهاء الصيانة')
                  : (lang === 'fr' ? '🔧 Maintenance' : '🔧 صيانة')}
              </button>
            )}
          </div>

          {/* Infos client quand louer / reserve */}
          {activeReservationInfo && (car.status === 'louer' || car.status === 'reserve') && (
            <div className="text-[9px] text-saas-text-muted bg-saas-bg rounded-lg px-2 py-1.5 border border-saas-border">
              <span className="font-bold text-saas-text-main">{activeReservationInfo.clientName}</span>
              {' · '}
              {new Date(activeReservationInfo.departureDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
              {' → '}
              {new Date(activeReservationInfo.returnDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-saas-border flex items-center justify-between">
          <div className="text-saas-primary-via font-black text-lg tracking-tighter">
            {car.priceDay.toLocaleString()} <span className="text-[9px] text-saas-text-muted uppercase">DZD / JOUR</span>
          </div>
          <div className="text-[9px] text-saas-text-muted font-bold uppercase tracking-widest">
            {car.mileage.toLocaleString()} KM
          </div>
        </div>

        {/* Toggle visibilité site (interface Offres) */}
        {onToggleVisibility && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onToggleVisibility(car)}
            className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 border ${
              isHidden
                ? 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-saas-border'
            }`}
            title={isHidden
              ? (lang === 'fr' ? 'Afficher sur le site' : 'إظهار على الموقع')
              : (lang === 'fr' ? 'Masquer du site' : 'إخفاء من الموقع')}
          >
            {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
            {isHidden
              ? (lang === 'fr' ? 'Afficher sur le site' : 'إظهار على الموقع')
              : (lang === 'fr' ? 'Masquer du site' : 'إخفاء من الموقع')}
          </motion.button>
        )}

        {hasAdminActions && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {onViewDetails && (
          <button
            onClick={() => onViewDetails(car)}
            className="p-2.5 rounded-xl bg-saas-bg hover:bg-saas-secondary-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-secondary-start/20"
            title="Détails"
          >
            <span className="text-lg">👁️</span>
            <span className="text-[8px] uppercase font-bold">Détails</span>
          </button>
          )}
          {onEdit && (
          <button
            onClick={() => onEdit(car)}
            className="p-2.5 rounded-xl bg-saas-bg hover:bg-saas-secondary-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-secondary-start/20"
            title="Modifier"
          >
            <span className="text-lg">✏️</span>
            <span className="text-[8px] uppercase font-bold">Edit</span>
          </button>
          )}
          {onHistory && (
          <button
            onClick={() => onHistory(car)}
            className="p-2.5 rounded-xl bg-saas-bg hover:bg-saas-secondary-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-secondary-start/20"
            title="Historique"
          >
            <span className="text-lg">📜</span>
            <span className="text-[8px] uppercase font-bold">History</span>
          </button>
          )}
          {onExpenses && (
          <button
            onClick={() => onExpenses(car)}
            className="p-2.5 rounded-xl bg-saas-bg hover:bg-saas-success-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-success-start/20"
            title="Dépenses"
          >
            <span className="text-lg">📉</span>
            <span className="text-[8px] uppercase font-bold text-saas-success-start">Expences</span>
          </button>
          )}
          {onReports && (
          <button
            onClick={() => onReports(car)}
            className="p-2.5 rounded-xl bg-saas-bg hover:bg-saas-warning-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-warning-start/20"
            title="Rapports"
          >
            <span className="text-lg">📄</span>
            <span className="text-[8px] uppercase font-bold text-saas-warning-start">Reports</span>
          </button>
          )}
          {onDelete && (
          <button
            onClick={() => onDelete(car.id)}
            className="p-2.5 rounded-xl bg-saas-danger-start/5 hover:bg-saas-danger-start hover:text-white text-saas-danger-start transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-danger-start/10"
            title="Supprimer"
          >
            <span className="text-lg">🗑️</span>
            <span className="text-[8px] uppercase font-bold">Delete</span>
          </button>
          )}
        </div>
        )}
      </div>
    </motion.div>
  );
};
