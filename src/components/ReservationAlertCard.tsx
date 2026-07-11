import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ReservationAlert } from '../utils/reservationAlerts';
import { motion } from 'motion/react';
import { Calendar, User, Phone, DollarSign, ArrowRight } from 'lucide-react';

interface ReservationAlertCardProps {
  alert: ReservationAlert;
  onAlertClick?: (alert: ReservationAlert) => void;
}

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case 'low':
      return {
        bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
        border: 'border-emerald-300',
        text: 'text-emerald-900',
        statusBg: 'bg-emerald-100',
        statusText: 'text-emerald-700',
        headerBg: 'from-emerald-400 to-teal-500'
      };
    case 'medium':
      return {
        bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
        border: 'border-amber-300',
        text: 'text-amber-900',
        statusBg: 'bg-amber-100',
        statusText: 'text-amber-700',
        headerBg: 'from-amber-400 to-yellow-500'
      };
    case 'high':
      return {
        bg: 'bg-gradient-to-br from-orange-50 to-red-50',
        border: 'border-orange-300',
        text: 'text-orange-900',
        statusBg: 'bg-orange-100',
        statusText: 'text-orange-700',
        headerBg: 'from-orange-400 to-red-500'
      };
    case 'critical':
      return {
        bg: 'bg-gradient-to-br from-red-50 to-rose-50',
        border: 'border-red-400',
        text: 'text-red-900',
        statusBg: 'bg-red-100',
        statusText: 'text-red-700',
        headerBg: 'from-red-500 to-rose-600'
      };
    default:
      return {
        bg: 'bg-gradient-to-br from-slate-50 to-gray-50',
        border: 'border-slate-300',
        text: 'text-slate-900',
        statusBg: 'bg-slate-100',
        statusText: 'text-slate-700',
        headerBg: 'from-slate-400 to-gray-500'
      };
  }
};

export const ReservationAlertCard: React.FC<ReservationAlertCardProps> = ({
  alert,
  onAlertClick
}) => {
  const navigate = useNavigate();
  const styles = getSeverityStyles(alert.severity);
  const car = alert.car;
  const reservation = alert.reservation;
  const client = reservation.client;

  const getAlertTypeInfo = () => {
    switch (alert.type) {
      case 'pre_start':
        return {
          icon: '🚗',
          label: 'Départ Demain',
          color: 'from-blue-400 to-cyan-500'
        };
      case 'pre_end':
        return {
          icon: '📅',
          label: 'Retour Demain',
          color: 'from-green-400 to-emerald-500'
        };
      case 'expiring_today':
        return {
          icon: '🚨',
          label: 'Expire Aujourd\'hui',
          color: 'from-red-600 to-rose-700'
        };
      case 'expiring_tomorrow':
        return {
          icon: '🔔',
          label: 'Expire Demain',
          color: 'from-orange-400 to-red-500'
        };
      case 'not_closed':
        return {
          icon: '⏰',
          label: 'Non Fermée',
          color: 'from-red-500 to-rose-600'
        };
      case 'late_activation':
        return {
          icon: '⚠️',
          label: 'Activation Retardée',
          color: 'from-red-600 to-rose-700'
        };
      default:
        return {
          icon: '🔔',
          label: 'Alerte',
          color: 'from-blue-500 to-purple-600'
        };
    }
  };

  const typeInfo = getAlertTypeInfo();

  const handleNavigateToPlannerDetails = () => {
    // Navigate to planner and set state to show details view
    navigate('/planificateur', {
      state: {
        selectedReservationId: alert.reservation.id,
        viewMode: 'details',
        shouldOpenDetailsView: true
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{
        scale: 1.02,
        y: -5,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)'
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAlertClick?.(alert)}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-2xl border-2 ${styles.border} ${styles.bg} shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer`}
    >
      {/* Header gradient bar */}
      <div className={`relative h-1.5 bg-gradient-to-r ${typeInfo.color}`}></div>

      <div className="relative p-6 space-y-5">
        {/* Title and Type Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-2xl">{typeInfo.icon}</div>
            <div className="flex-1">
              <h4 className={`font-black text-base uppercase tracking-tight ${styles.text}`}>
                {alert.title}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {car?.brand} {car?.model}
              </p>
            </div>
          </div>
          
          {/* Severity badge */}
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${styles.statusBg} ${styles.statusText} whitespace-nowrap`}
          >
            {alert.severity === 'critical' ? '🔴' : alert.severity === 'high' ? '🟠' : alert.severity === 'medium' ? '🟡' : '🟢'} {alert.daysOverdue ? `${alert.daysOverdue}j` : 'Alerte'}
          </motion.div>
        </div>

        {/* Car Info with Image */}
        <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-white/80">
          {/* Car Image Circle */}
          <motion.div
            animate={{ rotate: alert.severity === 'critical' ? [0, 8, -8, 0] : 0 }}
            transition={{ duration: 2, repeat: alert.severity === 'critical' ? Infinity : 0 }}
            className="relative flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full border-3 border-red-400 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-md">
              {car?.images && car.images.length > 0 ? (
                <img
                  src={car.images[0]}
                  alt={`${car.brand} ${car.model}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🚗</div>
              )}
            </div>
            {alert.severity === 'critical' && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs"
              >
                !
              </motion.div>
            )}
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">
              {car?.brand} {car?.model}
            </p>
            <p className="text-xs text-gray-600 font-semibold">
              {car?.registration}
            </p>
            <p className={`text-xs font-bold mt-1 ${styles.text}`}>
              {alert.message}
            </p>
          </div>
        </div>

        {/* Client Information */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 p-3 bg-white/40 rounded-lg border border-white/60">
            <User className="w-4 h-4 text-gray-700 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-600 font-bold uppercase">Client</p>
              <p className="text-xs font-bold text-gray-900 truncate">
                {client.firstName} {client.lastName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-white/40 rounded-lg border border-white/60">
            <Phone className="w-4 h-4 text-gray-700 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-600 font-bold uppercase">Contact</p>
              <p className="text-xs font-bold text-gray-900 truncate">
                {client.phone}
              </p>
            </div>
          </div>
        </div>

        {/* Reservation Timeline */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-white/40 rounded-lg border border-white/60 text-center">
            <p className="text-xs text-gray-600 font-bold uppercase">Départ</p>
            <p className="text-sm font-black text-blue-700 mt-1">
              {new Date(reservation.step1.departureDate).toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: 'short' 
              })}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {new Date(reservation.step1.departureDate).toLocaleDateString('fr-FR', { 
                weekday: 'short'
              })}
            </p>
          </div>
          <div className="p-3 bg-white/40 rounded-lg border border-white/60 text-center">
            <p className="text-xs text-gray-600 font-bold uppercase">Durée</p>
            <p className="text-sm font-black text-purple-700 mt-1">
              {reservation.totalDays}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">jour(s)</p>
          </div>
          <div className="p-3 bg-white/40 rounded-lg border border-white/60 text-center">
            <p className="text-xs text-gray-600 font-bold uppercase">Retour</p>
            <p className="text-sm font-black text-green-700 mt-1">
              {new Date(reservation.step1.returnDate).toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: 'short'
              })}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {new Date(reservation.step1.returnDate).toLocaleDateString('fr-FR', { 
                weekday: 'short'
              })}
            </p>
          </div>
        </div>

        {/* Price Information */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-bold text-gray-700">Montant Total</span>
            </div>
            <span className="text-lg font-black text-blue-700">
              {(reservation.totalPrice).toLocaleString('fr-FR')} DA
            </span>
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            handleNavigateToPlannerDetails();
          }}
          className={`w-full py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            alert.severity === 'critical'
              ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg'
              : alert.severity === 'high'
              ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
          }`}
          type="button"
        >
          <span>Voir Détails de la Réservation</span>
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};
