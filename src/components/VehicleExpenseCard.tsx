import React from 'react';
import { VehicleExpense, Language, Car } from '../types';
import { motion } from 'motion/react';

interface VehicleExpenseCardProps {
  expense: VehicleExpense;
  car?: Car;
  index: number;
  lang: Language;
  onEdit: () => void;
  onDelete: () => void;
}

const EXPENSE_TYPE_LABELS = {
  vidange: { fr: 'Vidange', ar: 'تغيير الزيت' },
  assurance: { fr: 'Assurance', ar: 'التأمين' },
  controle: { fr: 'Contrôle', ar: 'الفحص' },
  chaine: { fr: 'Chaîne', ar: 'السلسلة' },
  autre: { fr: 'Autre', ar: 'آخر' },
};

const EXPENSE_TYPE_ICONS = {
  vidange: '🛢️',
  assurance: '🛡️',
  controle: '🛠️',
  chaine: '⛓️',
  autre: '❓',
};

export const VehicleExpenseCard: React.FC<VehicleExpenseCardProps> = ({
  expense,
  car,
  index,
  lang,
  onEdit,
  onDelete,
}) => {
  // Calculate expiration status
  const getExpirationStatus = () => {
    if (!expense.expirationDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expDate = new Date(expense.expirationDate);
    expDate.setHours(0, 0, 0, 0);
    
    const daysLeft = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      daysLeft,
      isExpired: daysLeft < 0,
      isWarning: daysLeft >= 0 && daysLeft <= 30,
      isOk: daysLeft > 30,
    };
  };

  const expirationStatus = getExpirationStatus();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-[2rem] shadow-lg hover:shadow-xl transition-all border overflow-hidden group ${
        expirationStatus?.isExpired 
          ? 'bg-red-50 border-red-300' 
          : expirationStatus?.isWarning 
          ? 'bg-amber-50 border-amber-300'
          : 'bg-white border-saas-border'
      }`}
    >
      {/* Header with Car Image */}
      <div className="relative h-48 overflow-hidden">
        {car && car.images && car.images.length > 0 ? (
          <img
            src={car.images[0] || 'https://picsum.photos/seed/car/400/300'}
            alt={`${car.brand} ${car.model}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="text-5xl">🚗</span>
        )}
        {car && (
          <div className="absolute top-2 right-2 bg-saas-primary-start/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm shadow-lg">
            {car.year}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-3">
        {/* Car Info */}
        {car && (
          <div className="pb-3 border-b border-saas-border">
            <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">🚗 {{fr: 'Véhicule', ar: 'المركبة'}[lang]}</p>
            <p className="text-lg font-black text-saas-text-main">{car.brand} {car.model}</p>
            <p className="text-xs text-saas-text-muted font-bold">{car.registration}</p>
          </div>
        )}

        {/* Expense Type */}
        <div>
          <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">{EXPENSE_TYPE_ICONS[expense.type]} {{fr: 'Type', ar: 'النوع'}[lang]}</p>
          <p className="text-sm font-black text-saas-text-main">{EXPENSE_TYPE_LABELS[expense.type][lang]}</p>
        </div>

        {/* Current Mileage - for Vidange */}
        {expense.type === 'vidange' && expense.currentMileage && (
          <div>
            <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">🚗 {{fr: 'Kilométrage', ar: 'المسافة'}[lang]}</p>
            <p className="text-sm font-black text-saas-text-main">{expense.currentMileage.toLocaleString('fr-FR')} KM</p>
          </div>
        )}

        {/* Expense Name - for Autre */}
        {expense.type === 'autre' && expense.expenseName && (
          <div>
            <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">📝 {{fr: 'Nom', ar: 'الاسم'}[lang]}</p>
            <p className="text-sm font-black text-saas-text-main">{expense.expenseName}</p>
          </div>
        )}

        {/* Expiration Date - for Assurance and Contrôle */}
        {(expense.type === 'assurance' || expense.type === 'controle') && expense.expirationDate && (
          <div className={`p-3 rounded-lg ${
            expirationStatus?.isExpired 
              ? 'bg-red-100 border border-red-300'
              : expirationStatus?.isWarning
              ? 'bg-amber-100 border border-amber-300'
              : 'bg-green-50 border border-green-200'
          }`}>
            <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">{expense.type === 'assurance' ? '🛡️' : '🛠️'} {{fr: 'Expiration', ar: 'الانتهاء'}[lang]}</p>
            <p className={`text-sm font-black ${
              expirationStatus?.isExpired 
                ? 'text-red-700'
                : expirationStatus?.isWarning
                ? 'text-amber-700'
                : 'text-green-700'
            }`}>
              {expense.expirationDate}
              {expirationStatus && (
                <span className="text-xs font-bold ml-2">
                  {expirationStatus.isExpired 
                    ? `❌ ${lang === 'fr' ? 'Expiré' : 'منتهي الصلاحية'}`
                    : expirationStatus.isWarning
                    ? `⚠️ ${expirationStatus.daysLeft} ${lang === 'fr' ? 'jours' : 'أيام'}`
                    : `✅ ${lang === 'fr' ? 'Actif' : 'نشط'}`
                  }
                </span>
              )}
            </p>
          </div>
        )}

        {/* Cost */}
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-2xl font-black text-green-600">{expense.cost.toLocaleString('fr-FR')} DZ</p>
        </div>

        {/* Date */}
        <div>
          <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">📅 {{fr: 'Date', ar: 'التاريخ'}[lang]}</p>
          <p className="text-sm font-bold text-saas-text-main">{expense.date}</p>
        </div>

        {/* Next Vidange */}
        {expense.nextVidangeKm && (
          <div>
            <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">⏱️ {{fr: 'Prochaine vidange', ar: 'التغيير التالي'}[lang]}</p>
            <p className="text-sm font-bold text-saas-text-main">{expense.nextVidangeKm.toLocaleString('fr-FR')} km</p>
          </div>
        )}

        {/* Filter Tracking - for Vidange */}
        {expense.type === 'vidange' && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
            <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">🔧 {{fr: 'Filtres changés', ar: 'الفلاتر المتغيرة'}[lang]}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                {(expense as any).oilFilterChanged ? (
                  <span className="text-green-600 font-bold">✅</span>
                ) : (
                  <span className="text-gray-400">☐</span>
                )}
                <span className="text-xs font-semibold">🛢️ {{fr: 'Huile', ar: 'الزيت'}[lang]}</span>
              </div>
              <div className="flex items-center gap-2">
                {(expense as any).airFilterChanged ? (
                  <span className="text-green-600 font-bold">✅</span>
                ) : (
                  <span className="text-gray-400">☐</span>
                )}
                <span className="text-xs font-semibold">💨 {{fr: 'Air', ar: 'هواء'}[lang]}</span>
              </div>
              <div className="flex items-center gap-2">
                {(expense as any).fuelFilterChanged ? (
                  <span className="text-green-600 font-bold">✅</span>
                ) : (
                  <span className="text-gray-400">☐</span>
                )}
                <span className="text-xs font-semibold">⛽ {{fr: 'Carburant', ar: 'وقود'}[lang]}</span>
              </div>
              <div className="flex items-center gap-2">
                {(expense as any).acFilterChanged ? (
                  <span className="text-green-600 font-bold">✅</span>
                ) : (
                  <span className="text-gray-400">☐</span>
                )}
                <span className="text-xs font-semibold">❄️ {{fr: 'Clim', ar: 'تكييف'}[lang]}</span>
              </div>
            </div>
          </div>
        )}

        {/* Note */}
        {expense.note && (
          <div className="pt-2 border-t border-saas-border">
            <p className="text-sm text-saas-text-muted font-bold uppercase tracking-wider">📝 {{fr: 'Note', ar: 'ملاحظة'}[lang]}</p>
            <p className="text-sm text-saas-text-main">{expense.note}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-saas-border bg-saas-bg flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
        >
          ✏️ {{fr: 'Modifier', ar: 'تعديل'}[lang]}
        </button>
        <button
          onClick={onDelete}
          className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        >
          🗑️ {{fr: 'Supprimer', ar: 'حذف'}[lang]}
        </button>
      </div>
    </motion.div>
  );
};
