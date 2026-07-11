import React, { useState, useMemo, useEffect } from 'react';
import { Language, ReservationDetails } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, User, Car as CarIcon, Phone, Mail, Fuel, Wrench, ChevronDown, ChevronUp, Image as ImageIcon, X, LayoutGrid, AlertTriangle, CheckCircle, CalendarDays } from 'lucide-react';

interface ReservationTimelineViewProps {
  lang: Language;
  reservations: ReservationDetails[];
  onSelectReservation: (reservation: ReservationDetails) => void;
}

const COLORS = [
  { bg: 'from-blue-400 to-blue-600', text: 'text-blue-900', light: 'bg-blue-50', border: 'border-blue-200' },
  { bg: 'from-purple-400 to-purple-600', text: 'text-purple-900', light: 'bg-purple-50', border: 'border-purple-200' },
  { bg: 'from-pink-400 to-pink-600', text: 'text-pink-900', light: 'bg-pink-50', border: 'border-pink-200' },
  { bg: 'from-green-400 to-green-600', text: 'text-green-900', light: 'bg-green-50', border: 'border-green-200' },
  { bg: 'from-orange-400 to-orange-600', text: 'text-orange-900', light: 'bg-orange-50', border: 'border-orange-200' },
  { bg: 'from-teal-400 to-teal-600', text: 'text-teal-900', light: 'bg-teal-50', border: 'border-teal-200' },
  { bg: 'from-cyan-400 to-cyan-600', text: 'text-cyan-900', light: 'bg-cyan-50', border: 'border-cyan-200' },
  { bg: 'from-indigo-400 to-indigo-600', text: 'text-indigo-900', light: 'bg-indigo-50', border: 'border-indigo-200' },
  { bg: 'from-amber-400 to-amber-600', text: 'text-amber-900', light: 'bg-amber-50', border: 'border-amber-200' },
  { bg: 'from-rose-400 to-rose-600', text: 'text-rose-900', light: 'bg-rose-50', border: 'border-rose-200' },
];

export const ReservationTimelineView: React.FC<ReservationTimelineViewProps> = ({ 
  lang, 
  reservations,
  onSelectReservation 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'cars' | 'fleet'>('month');
  const [expandedDates, setExpandedDates] = useState<{[key: string]: boolean}>({});
  const [hoveredReservationId, setHoveredReservationId] = useState<string | null>(null);
  const [selectedReservationForDetail, setSelectedReservationForDetail] = useState<ReservationDetails | null>(null);
  
  // Fleet view state
  const [fleetSearchQuery, setFleetSearchQuery] = useState('');
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string>('all');
  const [expandedCarId, setExpandedCarId] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const getColorForReservation = (index: number) => COLORS[index % COLORS.length];

  const getReservationsForDate = (date: Date): ReservationDetails[] => {
    return reservations.filter(res => {
      const start = new Date(res.step1.departureDate);
      const end = new Date(res.step1.returnDate);
      return date >= start && date <= end;
    });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const calendarDays = useMemo(() => {
    const firstDay = getFirstDayOfMonth(currentDate);
    const daysInMonth = getDaysInMonth(currentDate);
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }
    return days;
  }, [currentDate]);

  const getWeekDays = () => {
    const today = selectedDay || new Date();
    const first = today.getDate() - today.getDay();
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(new Date(today.getFullYear(), today.getMonth(), first + i));
    }
    return weekDays;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setSelectedDay(new Date());
  };

  const monthName = currentDate.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ', {
    month: 'long',
    year: 'numeric'
  });

  const weekDays = getWeekDays();

  const uniqueCars = useMemo(() => {
    const carsMap = new Map();
    reservations.forEach(res => {
      const key = res.car.id;
      if (!carsMap.has(key)) {
        carsMap.set(key, { ...res.car, id: key });
      }
    });
    return Array.from(carsMap.values());
  }, [reservations]);

  const getCarReservations = (carId: string, startDate: Date, endDate: Date) => {
    return reservations.filter(res => {
      const resStart = new Date(res.step1.departureDate);
      const resEnd = new Date(res.step1.returnDate);
      return res.car.id === carId && resStart <= endDate && resEnd >= startDate;
    });
  };

  const getReservationPosition = (startDate: Date, endDate: Date, rangeStart: Date, rangeEnd: Date) => {
    const resStart = new Date(startDate).getTime();
    const resEnd = new Date(endDate).getTime();
    const rangeStartTime = rangeStart.getTime();
    const rangeEndTime = rangeEnd.getTime();
    
    const start = Math.max(resStart, rangeStartTime);
    const end = Math.min(resEnd, rangeEndTime);
    const total = rangeEndTime - rangeStartTime;
    
    const offset = ((start - rangeStartTime) / total) * 100;
    const width = ((end - start) / total) * 100;
    
    return { offset, width };
  };

  // Fleet view specific memos and helpers
  const uniqueCarsForFleet = useMemo(() => {
    const carsMap = new Map();
    reservations.forEach(res => {
      if (res.car && res.car.id && !carsMap.has(res.car.id)) {
        carsMap.set(res.car.id, res.car);
      }
    });
    const allCars = Array.from(carsMap.values());
    
    if (!fleetSearchQuery) return allCars;
    
    const q = fleetSearchQuery.toLowerCase();
    return allCars.filter(car =>
      car.brand?.toLowerCase().includes(q) ||
      car.model?.toLowerCase().includes(q) ||
      car.registration?.toLowerCase().includes(q)
    );
  }, [reservations, fleetSearchQuery]);

  const getReservationsForCarOnDay = (carId: string, day: Date): ReservationDetails[] => {
    return reservations.filter(res => {
      if (res.car?.id !== carId) return false;
      const start = new Date(res.step1.departureDate);
      const end = new Date(res.step1.returnDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const d = new Date(day);
      d.setHours(12, 0, 0, 0);
      return d >= start && d <= end;
    });
  };

  const isFirstDayOfReservation = (carId: string, day: Date, reservationId: string): boolean => {
    const res = reservations.find(r => r.id === reservationId && r.car?.id === carId);
    if (!res) return false;
    const start = new Date(res.step1.departureDate);
    return day.getDate() === start.getDate() &&
           day.getMonth() === start.getMonth() &&
           day.getFullYear() === start.getFullYear();
  };

  const isLastDayOfReservation = (carId: string, day: Date, reservationId: string): boolean => {
    const res = reservations.find(r => r.id === reservationId && r.car?.id === carId);
    if (!res) return false;
    const end = new Date(res.step1.returnDate);
    return day.getDate() === end.getDate() &&
           day.getMonth() === end.getMonth() &&
           day.getFullYear() === end.getFullYear();
  };

  // Get alerts
  const getFleetAlerts = () => {
    const alerts: any[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    reservations.forEach(res => {
      const returnDate = new Date(res.step1.returnDate);
      returnDate.setHours(0, 0, 0, 0);
      const departureDate = new Date(res.step1.departureDate);
      departureDate.setHours(0, 0, 0, 0);

      // Overdue return
      if (res.status === 'active' && returnDate < today) {
        alerts.push({
          type: 'overdue',
          reservation: res,
          message: `🔴 ${res.car.brand} ${res.car.model} - Retard de retour (${res.client.firstName} ${res.client.lastName})`
        });
      }

      // Returning soon
      if (res.status === 'active' && returnDate >= today &&
          (returnDate.getTime() - today.getTime()) <= 2 * 24 * 60 * 60 * 1000) {
        alerts.push({
          type: 'returning-soon',
          reservation: res,
          message: `⏰ ${res.car.brand} ${res.car.model} - Retour dans 2j ou moins (${res.client.firstName} ${res.client.lastName})`
        });
      }

      // Starting today
      if (departureDate.getTime() === today.getTime()) {
        alerts.push({
          type: 'starting-today',
          reservation: res,
          message: `🟢 ${res.car.brand} ${res.car.model} - Départ aujourd'hui (${res.client.firstName} ${res.client.lastName})`
        });
      }
    });

    return alerts;
  };

  // Detailed Reservation Card Component
  const DetailedReservationCard: React.FC<{ res: ReservationDetails; onClose: () => void }> = ({ res, onClose }) => {
    const color = getColorForReservation(reservations.indexOf(res));
    const startTime = res.step1.departureTime || '10:00';
    const endTime = res.step1.returnTime || '18:00';
    const durationDays = Math.ceil((new Date(res.step1.returnDate).getTime() - new Date(res.step1.departureDate).getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className={`rounded-2xl overflow-hidden shadow-2xl border-2 border-white/50 bg-gradient-to-br ${color.bg} text-white max-w-2xl w-full`}
      >
        {/* Close Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 rounded-full p-2 z-10"
        >
          <X className="w-6 h-6" />
        </motion.button>

        {/* Header with Client and Car */}
        <div className="p-6">
          <div className="flex gap-4 mb-6">
            {/* Client Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center border-3 border-white/50 flex-shrink-0">
                  {res.client.profilePhoto ? (
                    <img src={res.client.profilePhoto} alt={res.client.firstName} className="w-16 h-16 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-black leading-tight">{res.client.firstName} {res.client.lastName}</p>
                  <p className="text-sm opacity-90">👤 {lang === 'fr' ? 'Client' : 'العميل'}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white/10 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <span className="text-base font-bold">{res.client.phone}</span>
                </div>
                {res.client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 flex-shrink-0" />
                    <span className="text-base font-bold break-all">{res.client.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Car Image */}
            {res.car.images && res.car.images.length > 0 && res.car.images[0] ? (
              <img src={res.car.images[0]} alt={res.car.brand} className="w-32 h-32 rounded-xl object-cover border-4 border-white/50 flex-shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-32 h-32 rounded-xl bg-white/20 flex items-center justify-center border-4 border-white/50 flex-shrink-0">
                <CarIcon className="w-16 h-16 text-white/40" />
              </div>
            )}
          </div>

          {/* Car Details */}
          <div className="bg-white/10 rounded-xl p-5 mb-5">
            <h4 className="text-2xl font-black mb-4">🚗 {res.car.brand} {res.car.model}</h4>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="opacity-75 text-xs font-bold uppercase">{lang === 'fr' ? 'Immatriculation' : 'التسجيل'}</p>
                <p className="font-black text-lg mt-1">🏷️ {res.car.registration}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="opacity-75 text-xs font-bold uppercase">{lang === 'fr' ? 'Couleur' : 'اللون'}</p>
                <p className="font-black text-lg mt-1">🎨 {res.car.color}</p>
              </div>
              {res.car.fuelType && (
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="opacity-75 text-xs font-bold uppercase">{lang === 'fr' ? 'Carburant' : 'الوقود'}</p>
                  <p className="font-black text-lg mt-1">⛽ {res.car.fuelType}</p>
                </div>
              )}
            </div>
          </div>

          {/* Reservation Dates and Times */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="opacity-75 text-xs font-bold uppercase">{lang === 'fr' ? 'Date Départ' : 'تاريخ المغادرة'}</p>
              <p className="font-black text-xl mt-1">{new Date(res.step1.departureDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</p>
              <p className="text-sm opacity-90 mt-1">⏰ {startTime}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="opacity-75 text-xs font-bold uppercase">{lang === 'fr' ? 'Date Retour' : 'تاريخ الإرجاع'}</p>
              <p className="font-black text-xl mt-1">{new Date(res.step1.returnDate).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</p>
              <p className="text-sm opacity-90 mt-1">⏰ {endTime}</p>
            </div>
          </div>

          {/* Duration and Status */}
          <div className="flex items-center justify-between bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6" />
              <div>
                <p className="font-black text-2xl">{durationDays}</p>
                <p className="text-xs opacity-75 uppercase">{lang === 'fr' ? 'jour(s)' : 'أيام'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-black px-4 py-2 rounded-full ${res.status === 'confirmed' ? 'bg-green-400/40 text-green-100' : 'bg-yellow-400/40 text-yellow-100'}`}>
                {res.status === 'confirmed' ? (lang === 'fr' ? '✓ CONFIRMÉE' : '✓ مؤكدة') : (lang === 'fr' ? '⏳ EN ATTENTE' : '⏳ معلقة')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="bg-white/10 px-6 py-4 flex justify-end border-t border-white/20">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              onSelectReservation(res);
              onClose();
            }}
            className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg font-bold text-white transition-all"
          >
            {lang === 'fr' ? 'Voir Détails' : 'عرض التفاصيل'}
          </motion.button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-black text-saas-text-main uppercase tracking-tighter">
            📅 {lang === 'fr' ? 'Vue Calendrier' : 'عرض التقويم'}
          </h2>
          <div className="flex gap-1 bg-white rounded-lg border border-slate-300 p-1 shadow-md">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                viewMode === 'month' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              {lang === 'fr' ? 'Mois' : 'شهر'}
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                viewMode === 'week' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              {lang === 'fr' ? 'Semaine' : 'أسبوع'}
            </button>
            <button
              onClick={() => setViewMode('cars')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                viewMode === 'cars' 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              {lang === 'fr' ? 'Voitures' : 'السيارات'}
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('fleet')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 border-2 ${
                viewMode === 'fleet'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-blue-500 hover:bg-blue-50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              {lang === 'fr' ? '🚗 Flotte' : '🚗 الأسطول'}
            </motion.button>
          </div>
        </div>
        <button
          onClick={handleToday}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl"
        >
          {lang === 'fr' ? "Aujourd'hui" : 'اليوم'}
        </button>
      </div>

      {/* Reservation Detail Modal */}
      <AnimatePresence>
        {selectedReservationForDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={() => setSelectedReservationForDetail(null)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative"
            >
              <DetailedReservationCard 
                res={selectedReservationForDetail} 
                onClose={() => setSelectedReservationForDetail(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePrevMonth} 
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>
              <h3 className="text-2xl font-black uppercase tracking-wider">{monthName}</h3>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNextMonth} 
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          {/* Cars List with Month Timelines */}
          <div className="space-y-3">
            {uniqueCars.map((car, carIndex) => {
              const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
              const carReservations = getCarReservations(car.id, monthStart, monthEnd);
              const daysInMonth = getDaysInMonth(currentDate);
              
              return (
                <motion.div
                  key={car.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: carIndex * 0.1 }}
                  className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex gap-3 p-3">
                    {/* LEFT: Car Image & Info */}
                    <div className="flex-shrink-0 w-20">
                      <motion.div whileHover={{ scale: 1.05 }} className="mb-1">
                        {car.images && car.images.length > 0 && car.images[0] ? (
                          <img src={car.images[0]} alt={car.brand} className="w-20 h-20 rounded-lg object-cover border border-slate-300 shadow-sm hover:shadow-md transition-all" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center border border-slate-300 shadow-sm">
                            <CarIcon className="w-8 h-8 text-white/40" />
                          </div>
                        )}
                      </motion.div>

                      <div className="text-[10px] space-y-0.5">
                        <div className="bg-slate-50 rounded p-1">
                          <p className="font-bold text-slate-900">{car.year}</p>
                        </div>
                        <div className="bg-slate-50 rounded p-1">
                          <p className="font-bold text-slate-900 truncate">{car.color}</p>
                        </div>
                        {car.transmission && (
                          <div className="bg-slate-50 rounded p-1">
                            <p className="font-bold text-slate-900 truncate text-[9px]">{car.transmission}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT: Timeline */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 pb-2 border-b border-slate-200">
                        <h4 className="text-sm font-bold text-slate-900">{car.brand} {car.model}</h4>
                        <p className="text-xs text-slate-500">🏷️ {car.registration}</p>
                      </div>

                      {/* Day labels */}
                      <div className="flex gap-0 text-[6px] font-bold text-slate-400 mb-1">
                        {Array.from({ length: daysInMonth }).map((_, i) => (
                          <div key={i} className="flex-1 text-center h-4">{i + 1}</div>
                        ))}
                      </div>

                      {/* Timeline Bar */}
                      <div className="relative h-6 bg-gradient-to-r from-slate-100 to-slate-50 rounded-md border border-slate-200 overflow-hidden mb-2">
                        {carReservations.map((res) => {
                          const color = getColorForReservation(reservations.indexOf(res));
                          const { offset, width } = getReservationPosition(res.step1.departureDate, res.step1.returnDate, monthStart, monthEnd);
                          const isHovered = hoveredReservationId === res.id;

                          return (
                            <motion.div
                              key={res.id}
                              className="absolute top-0.5 h-5 rounded cursor-pointer"
                              style={{
                                left: `${offset}%`,
                                width: `${Math.max(width, 2)}%`,
                              }}
                              onMouseEnter={() => setHoveredReservationId(res.id)}
                              onMouseLeave={() => setHoveredReservationId(null)}
                              onClick={() => setSelectedReservationForDetail(res)}
                              whileHover={{ scaleY: 1.2, y: -1 }}
                            >
                              <div className={`w-full h-full bg-gradient-to-r ${color.bg} rounded shadow-xs flex items-center justify-center text-[7px] font-bold text-white px-0.5 border border-white/30`}>
                                {res.client.firstName.substring(0, 2)}
                              </div>

                              {/* Compact Tooltip */}
                              <AnimatePresence>
                                {isHovered && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white rounded-lg shadow-lg border border-slate-200 p-2 w-56 z-50 text-xs"
                                  >
                                    <div className="flex gap-2 mb-2">
                                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {res.client.profilePhoto ? (
                                          <img src={res.client.profilePhoto} alt={res.client.firstName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <User className="w-4 h-4 text-slate-500" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 text-[11px]">{res.client.firstName}</p>
                                        <p className="text-slate-600 text-[10px]">{res.client.phone}</p>
                                      </div>
                                    </div>
                                    <div className="h-px bg-slate-200 mb-1"></div>
                                    <p className="text-slate-700 font-bold">{new Date(res.step1.departureDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })} - {new Date(res.step1.returnDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}</p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                        {carReservations.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 font-bold">{lang === 'fr' ? 'Libre' : 'متاح'}</div>
                        )}
                      </div>

                      {/* Reservations List */}
                      {carReservations.length > 0 && (
                        <div className="pt-1 border-t border-slate-100">
                          <p className="text-[11px] font-bold text-slate-600 mb-1">{carReservations.length} réservation(s)</p>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
                            {carReservations.map((res) => {
                              const color = getColorForReservation(reservations.indexOf(res));
                              return (
                                <motion.div
                                  key={res.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  onClick={() => setSelectedReservationForDetail(res)}
                                  className={`p-1 rounded bg-gradient-to-r ${color.bg} text-white font-bold cursor-pointer hover:shadow-md transition-all flex items-center justify-between gap-1 text-[10px]`}
                                >
                                  <span className="truncate">{res.client.firstName}</span>
                                  <span className="text-[9px] opacity-80 flex-shrink-0">
                                    {Math.ceil((new Date(res.step1.returnDate).getTime() - new Date(res.step1.departureDate).getTime()) / (1000 * 60 * 60 * 24))}d
                                  </span>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {uniqueCars.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CarIcon className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-bold text-center">{lang === 'fr' ? 'Aucune voiture' : 'لا توجد سيارات'}</p>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setSelectedDay(new Date(selectedDay?.getTime() || new Date().getTime() - 7 * 24 * 60 * 60 * 1000))} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <ChevronLeft className="w-6 h-6" />
              </motion.button>
              <div className="text-center flex-1">
                <h3 className="text-2xl font-black uppercase tracking-wider mb-2">{lang === 'fr' ? 'Semaine du' : 'أسبوع'} {weekDays[0].toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</h3>
                <p className="text-sm opacity-90">{lang === 'fr' ? 'au' : 'إلى'} {weekDays[6].toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</p>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setSelectedDay(new Date(selectedDay?.getTime() || new Date().getTime() + 7 * 24 * 60 * 60 * 1000))} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          <div className="space-y-3">
            {uniqueCars.map((car, carIndex) => {
              const carReservations = getCarReservations(car.id, weekDays[0], weekDays[6]);
              return (
                <motion.div
                  key={car.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: carIndex * 0.05 }}
                  className="bg-white rounded-xl border-2 border-slate-200 shadow-md hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="flex h-28">
                    {/* LEFT: Car Image + Details */}
                    <div className="w-32 bg-gradient-to-br from-slate-100 to-slate-50 border-r-2 border-slate-200 p-3 flex flex-col items-center justify-center flex-shrink-0 hover:bg-gradient-to-br hover:from-slate-200 hover:to-slate-100 transition-colors">
                      <div className="w-20 h-14 rounded-lg overflow-hidden mb-2 border-2 border-slate-300 bg-white shadow-sm">
                        {car.images && car.images.length > 0 ? (
                          <img
                            src={car.images[0]}
                            alt={`${car.brand} ${car.model}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                            <CarIcon className="w-8 h-8 text-white opacity-50" />
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-slate-700 text-center leading-tight">{car.brand} {car.model}</p>
                      <p className="text-[8px] text-slate-500">{car.year}</p>
                    </div>

                    {/* RIGHT: Timeline */}
                    <div className="flex-1 p-3 flex flex-col">
                      <div className="flex items-center gap-1 mb-2">
                        <p className="text-xs font-bold text-slate-700">{car.registration}</p>
                      </div>

                      {/* 7-Day Timeline */}
                      <div className="flex-1 flex gap-1 items-end">
                        {weekDays.map((day, dayIndex) => {
                          const dayReservations = carReservations.filter(res => {
                            const resStart = new Date(res.step1.departureDate);
                            const resEnd = new Date(res.step1.returnDate);
                            return resStart <= day && day <= resEnd;
                          });

                          const dayNumber = day.getDate();
                          const isToday = day.toDateString() === new Date().toDateString();
                          
                          return (
                            <div key={dayIndex} className="flex-1 flex flex-col items-center gap-0.5">
                              <p className={`text-[6px] font-bold ${isToday ? 'text-green-600' : 'text-slate-600'}`}>
                                {day.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ', { weekday: 'short' })[0]}
                              </p>
                              <div className="w-full h-6 rounded-sm border-2 border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50 relative overflow-hidden group cursor-pointer transition-all hover:shadow-md">
                                {dayReservations.length > 0 && (
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    className={`h-full bg-gradient-to-r ${getColorForReservation(reservations.indexOf(dayReservations[0])).bg} opacity-90 flex items-center justify-center relative`}
                                  >
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="text-[7px] font-black text-white opacity-90">
                                        {dayReservations[0].client.firstName[0]}{dayReservations[0].client.lastName[0]}
                                      </span>
                                    </div>
                                    <div className="absolute -inset-full opacity-0 group-hover:opacity-100 bg-white/20 transition-opacity pointer-events-none" />
                                  </motion.div>
                                )}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/5 transition-opacity flex items-center justify-center">
                                  <span className="text-[5px] font-bold text-slate-700">{dayNumber}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Reservations List */}
                  {carReservations.length > 0 && (
                    <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 max-h-20 overflow-y-auto">
                      <div className="space-y-1">
                        {carReservations.map((res, idx) => {
                          const color = getColorForReservation(reservations.indexOf(res));
                          const startTime = res.step1.departureTime || '10:00';
                          const endTime = res.step1.returnTime || '18:00';
                          const startDate = new Date(res.step1.departureDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
                          const endDate = new Date(res.step1.returnDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
                          
                          return (
                            <motion.div
                              key={res.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: idx * 0.05 }}
                              onClick={() => setSelectedReservationForDetail(res)}
                              className={`p-1.5 rounded-md bg-gradient-to-r ${color.bg} text-white text-[9px] font-bold cursor-pointer hover:shadow-md transition-all border border-white/30`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate">{res.client.firstName} {res.client.lastName[0]}</span>
                                <span className="opacity-90 text-[7px] whitespace-nowrap">{startDate} → {endDate}</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* CAR VIEW */}
      {viewMode === 'cars' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <ChevronLeft className="w-6 h-6" />
              </motion.button>
              <div className="text-center flex-1">
                <h3 className="text-2xl font-black uppercase tracking-wider mb-2">{lang === 'fr' ? 'Vue Voitures' : 'عرض السيارات'}</h3>
                <p className="text-sm opacity-90">{monthName}</p>
              </div>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-white/20 rounded-lg transition-all">
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          <div className="space-y-3">
            {uniqueCars.map((car, carIndex) => {
              const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
              const carReservations = getCarReservations(car.id, monthStart, monthEnd);
              const daysInMonth = getDaysInMonth(currentDate);
              
              return (
                <motion.div
                  key={car.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: carIndex * 0.1 }}
                  className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex gap-3 p-3">
                    {/* LEFT: Car Image & Info */}
                    <div className="flex-shrink-0 w-20">
                      <motion.div whileHover={{ scale: 1.05 }} className="mb-1">
                        {car.images && car.images.length > 0 && car.images[0] ? (
                          <img src={car.images[0]} alt={car.brand} className="w-20 h-20 rounded-lg object-cover border border-slate-300 shadow-sm hover:shadow-md transition-all" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center border border-slate-300 shadow-sm">
                            <CarIcon className="w-8 h-8 text-white/40" />
                          </div>
                        )}
                      </motion.div>

                      <div className="text-[10px] space-y-0.5">
                        <div className="bg-slate-50 rounded p-1">
                          <p className="font-bold text-slate-900">{car.year}</p>
                        </div>
                        <div className="bg-slate-50 rounded p-1">
                          <p className="font-bold text-slate-900 truncate">{car.color}</p>
                        </div>
                        {car.transmission && (
                          <div className="bg-slate-50 rounded p-1">
                            <p className="font-bold text-slate-900 truncate text-[9px]">{car.transmission}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* RIGHT: Timeline */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 pb-2 border-b border-slate-200">
                        <h4 className="text-sm font-bold text-slate-900">{car.brand} {car.model}</h4>
                        <p className="text-xs text-slate-500">🏷️ {car.registration}</p>
                      </div>

                      {/* Day labels */}
                      <div className="flex gap-0 text-[6px] font-bold text-slate-400 mb-1">
                        {Array.from({ length: daysInMonth }).map((_, i) => (
                          <div key={i} className="flex-1 text-center h-4">{i + 1}</div>
                        ))}
                      </div>

                      {/* Timeline Bar */}
                      <div className="relative h-6 bg-gradient-to-r from-slate-100 to-slate-50 rounded-md border border-slate-200 overflow-hidden mb-2">
                        {carReservations.map((res) => {
                          const color = getColorForReservation(reservations.indexOf(res));
                          const { offset, width } = getReservationPosition(res.step1.departureDate, res.step1.returnDate, monthStart, monthEnd);
                          const isHovered = hoveredReservationId === res.id;

                          return (
                            <motion.div
                              key={res.id}
                              className="absolute top-0.5 h-5 rounded cursor-pointer"
                              style={{
                                left: `${offset}%`,
                                width: `${Math.max(width, 2)}%`,
                              }}
                              onMouseEnter={() => setHoveredReservationId(res.id)}
                              onMouseLeave={() => setHoveredReservationId(null)}
                              onClick={() => setSelectedReservationForDetail(res)}
                              whileHover={{ scaleY: 1.2, y: -1 }}
                            >
                              <div className={`w-full h-full bg-gradient-to-r ${color.bg} rounded shadow-xs flex items-center justify-center text-[7px] font-bold text-white px-0.5 border border-white/30`}>
                                {res.client.firstName.substring(0, 2)}
                              </div>

                              {/* Compact Tooltip */}
                              <AnimatePresence>
                                {isHovered && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white rounded-lg shadow-lg border border-slate-200 p-2 w-56 z-50 text-xs"
                                  >
                                    <div className="flex gap-2 mb-2">
                                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {res.client.profilePhoto ? (
                                          <img src={res.client.profilePhoto} alt={res.client.firstName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <User className="w-4 h-4 text-slate-500" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 text-[11px]">{res.client.firstName}</p>
                                        <p className="text-slate-600 text-[10px]">{res.client.phone}</p>
                                      </div>
                                    </div>
                                    <div className="h-px bg-slate-200 mb-1"></div>
                                    <p className="text-slate-700 font-bold">{new Date(res.step1.departureDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })} - {new Date(res.step1.returnDate).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}</p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                        {carReservations.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 font-bold">{lang === 'fr' ? 'Libre' : 'متاح'}</div>
                        )}
                      </div>

                      {/* Reservations List */}
                      {carReservations.length > 0 && (
                        <div className="pt-1 border-t border-slate-100">
                          <p className="text-[11px] font-bold text-slate-600 mb-1">{carReservations.length} réservation(s)</p>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
                            {carReservations.map((res) => {
                              const color = getColorForReservation(reservations.indexOf(res));
                              return (
                                <motion.div
                                  key={res.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  onClick={() => setSelectedReservationForDetail(res)}
                                  className={`p-1 rounded bg-gradient-to-r ${color.bg} text-white font-bold cursor-pointer hover:shadow-md transition-all flex items-center justify-between gap-1 text-[10px]`}
                                >
                                  <span className="truncate">{res.client.firstName}</span>
                                  <span className="text-[9px] opacity-80 flex-shrink-0">
                                    {Math.ceil((new Date(res.step1.returnDate).getTime() - new Date(res.step1.departureDate).getTime()) / (1000 * 60 * 60 * 24))}d
                                  </span>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {uniqueCars.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CarIcon className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-bold text-center">{lang === 'fr' ? 'Aucune voiture' : 'لا توجد سيارات'}</p>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* FLEET VIEW - Fleet Calendar */}
      {viewMode === 'fleet' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-6"
        >
          {/* Alert Banner */}
          {getFleetAlerts().length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div className="font-black text-red-900 text-sm">
                  ⚠️ {getFleetAlerts().length} {lang === 'fr' ? 'réservation(s) nécessite(nt) votre attention' : 'الحجز يحتاج إلى اهتمامك'}
                </div>
              </div>
              <div className="space-y-1 ml-9">
                {getFleetAlerts().map((alert, idx) => (
                  <div key={idx} className="text-sm text-red-800 font-semibold">
                    {alert.message}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center"
            >
              <div className="text-3xl font-black text-blue-600 mb-1">
                {uniqueCarsForFleet.length}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                🚗 {lang === 'fr' ? 'Véhicules' : 'المركبات'}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center"
            >
              <div className="text-3xl font-black text-blue-600 mb-1">
                {reservations.length}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                📅 {lang === 'fr' ? 'Réservations' : 'الحجوزات'}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center"
            >
              <div className="text-3xl font-black text-green-600 mb-1">
                {uniqueCarsForFleet.filter(c => c.status === 'disponible').length}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                ✅ {lang === 'fr' ? 'Disponibles' : 'متاح'}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center"
            >
              <div className="text-3xl font-black text-amber-600 mb-1">
                {uniqueCarsForFleet.filter(c => c.status !== 'disponible').length}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                🔄 {lang === 'fr' ? 'Loués' : 'مؤجرة'}
              </div>
            </motion.div>
          </div>

          {/* Month Navigation and Legend */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePrevMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <ChevronLeft className="w-6 h-6 text-slate-600" />
              </motion.button>
              <h3 className="text-2xl font-black text-slate-900 min-w-[200px]">{monthName}</h3>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNextMonth}
                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
              >
                <ChevronRight className="w-6 h-6 text-slate-600" />
              </motion.button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-[11px] font-bold">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-slate-600">{lang === 'fr' ? 'Confirmé' : 'مؤكد'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-600">{lang === 'fr' ? 'Actif' : 'نشط'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-600">{lang === 'fr' ? 'En attente' : 'قيد الانتظار'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-slate-600">{lang === 'fr' ? 'Terminé' : 'اكتمل'}</span>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="space-y-3 bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={lang === 'fr' ? 'Chercher par voiture ou client...' : 'ابحث عن سيارة أو عميل...'}
                  value={fleetSearchQuery}
                  onChange={(e) => setFleetSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'confirmed', 'active', 'pending', 'completed'].map(status => (
                  <motion.button
                    key={status}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setFleetStatusFilter(status)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      fleetStatusFilter === status
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'border border-slate-300 text-slate-600 hover:border-blue-500'
                    }`}
                  >
                    {status === 'all' ? (lang === 'fr' ? 'Tous' : 'الكل') :
                     status === 'confirmed' ? '✅' :
                     status === 'active' ? '🔄' :
                     status === 'pending' ? '⏳' : '🏁'}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${260 + calendarDays.filter(Boolean).length * 40}px` }}>
                {/* Sticky header row with day numbers */}
                <div className="flex sticky top-0 z-20 bg-white border-b-2 border-slate-200">
                  {/* Left panel header */}
                  <div className="w-[260px] min-w-[260px] p-4 font-black text-slate-900 text-sm uppercase tracking-widest border-r border-slate-200 bg-slate-50">
                    {lang === 'fr' ? '🚗 Véhicule' : '🚗 المركبة'}
                  </div>
                  {/* Day columns header */}
                  {calendarDays.filter(Boolean).map((day: Date) => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-w-[40px] w-[40px] text-center py-2 border-r border-slate-200 text-xs font-bold
                          ${isToday ? 'bg-blue-500 text-white' : isWeekend ? 'bg-slate-50 text-slate-400' : 'text-slate-600'}`}
                      >
                        <div>{day.getDate()}</div>
                        <div className="text-[8px] opacity-70">
                          {day.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ', { weekday: 'short' }).substring(0, 1)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Car rows */}
                {uniqueCarsForFleet.map((car, carIndex) => {
                  const carReservations = reservations.filter(r => r.car?.id === car.id);
                  const isExpanded = expandedCarId === car.id;

                  return (
                    <motion.div
                      key={car.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: carIndex * 0.04 }}
                    >
                      {/* Main row */}
                      <div className={`flex border-b border-slate-200 relative ${carIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>

                        {/* LEFT: Car info panel */}
                        <div
                          className="w-[260px] min-w-[260px] flex items-center gap-3 p-3 border-r border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors"
                          onClick={() => setExpandedCarId(isExpanded ? null : car.id)}
                        >
                          {/* Car Image */}
                          <div className="relative w-16 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                            {car.images?.[0] ? (
                              <img
                                src={car.images[0]}
                                alt={`${car.brand} ${car.model}`}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <CarIcon size={24} />
                              </div>
                            )}
                            {/* Status dot */}
                            <motion.div
                              animate={car.status !== 'disponible' ? { scale: [1, 1.3, 1] } : {}}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-white ${
                                car.status === 'disponible' ? 'bg-green-400' : 'bg-amber-400'
                              }`}
                            />
                          </div>

                          {/* Car details */}
                          <div className="flex-1 min-w-0">
                            <div className="font-black text-slate-900 text-xs uppercase tracking-tight truncate">
                              {car.brand} {car.model}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium truncate">
                              {car.registration}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                car.status === 'disponible'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {car.status === 'disponible' ? '✅' : '🔄'} {car.status === 'disponible' ? (lang === 'fr' ? 'Dispo' : 'متاح') : (lang === 'fr' ? 'Loué' : 'مؤجر')}
                              </span>
                              <span className="text-[9px] text-slate-500">{car.priceDay?.toLocaleString()} DA</span>
                            </div>
                          </div>

                          {/* Expand chevron */}
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown size={14} className="text-slate-500" />
                          </motion.div>
                        </div>

                        {/* RIGHT: Day cells with reservation bars */}
                        <div className="flex-1 flex relative" style={{ minHeight: '72px' }}>
                          {calendarDays.filter(Boolean).map((day: Date, dayIndex: number) => {
                            const dayReservations = getReservationsForCarOnDay(car.id, day);
                            const isToday = day.toDateString() === new Date().toDateString();
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                            return (
                              <div
                                key={day.toISOString()}
                                className={`min-w-[40px] w-[40px] border-r border-slate-200 relative flex items-center
                                  ${isToday ? 'bg-blue-50/40' : isWeekend ? 'bg-slate-50/60' : ''}`}
                              >
                                {/* Today vertical line */}
                                {isToday && (
                                  <motion.div
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 border-l-2 border-blue-400 z-10 pointer-events-none"
                                  />
                                )}

                                {/* Reservation bar segments */}
                                {dayReservations.map(res => {
                                  const isFirst = isFirstDayOfReservation(car.id, day, res.id);
                                  const isLast = isLastDayOfReservation(car.id, day, res.id);
                                  const isSingle = isFirst && isLast;

                                  const statusGradient: Record<string, string> = {
                                    confirmed: 'from-green-400 to-emerald-500',
                                    active: 'from-blue-400 to-blue-600',
                                    pending: 'from-amber-400 to-amber-500',
                                    completed: 'from-purple-400 to-purple-600',
                                    accepted: 'from-teal-400 to-teal-500',
                                    cancelled: 'from-slate-300 to-slate-400',
                                  };

                                  const gradient = statusGradient[res.status] || 'from-gray-300 to-gray-400';

                                  // Check alerts
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const returnDate = new Date(res.step1.returnDate);
                                  returnDate.setHours(0, 0, 0, 0);
                                  const isOverdue = res.status === 'active' && returnDate < today;
                                  const isReturningSoon = res.status === 'active' && returnDate >= today &&
                                    (returnDate.getTime() - today.getTime()) <= 2 * 24 * 60 * 60 * 1000;

                                  return (
                                    <motion.div
                                      key={res.id}
                                      whileHover={{ scaleY: 1.1, zIndex: 30 }}
                                      onClick={() => onSelectReservation(res)}
                                      onMouseEnter={() => setHoveredBar(res.id)}
                                      onMouseLeave={() => setHoveredBar(null)}
                                      title={`${res.client.firstName} ${res.client.lastName} | ${res.step1.departureDate} → ${res.step1.returnDate}`}
                                      className={`absolute top-1/2 -translate-y-1/2 h-8 bg-gradient-to-r ${gradient} cursor-pointer transition-all z-10
                                        ${isSingle ? 'rounded-full' : isFirst ? 'rounded-l-full' : isLast ? 'rounded-r-full' : ''}
                                        ${isFirst ? 'left-1' : 'left-0'}
                                        ${isLast ? 'right-1' : 'right-0'}
                                        ${isOverdue ? 'ring-2 ring-red-500 ring-offset-1' : ''}
                                        ${isReturningSoon ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                                      `}
                                      style={{ opacity: res.status === 'cancelled' ? 0.5 : 1 }}
                                    >
                                      {/* Client name — show only on first day */}
                                      {isFirst && (
                                        <div className="absolute inset-0 flex items-center px-2 overflow-hidden">
                                          <span className="text-white text-[9px] font-bold truncate drop-shadow">
                                            {res.client.firstName} {res.client.lastName.charAt(0)}.
                                          </span>
                                        </div>
                                      )}

                                      {/* Alert icons */}
                                      {isFirst && isOverdue && (
                                        <motion.div
                                          animate={{ opacity: [0, 1, 0] }}
                                          transition={{ repeat: Infinity, duration: 1 }}
                                          className="absolute -top-2 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px]"
                                        >
                                          ⚠️
                                        </motion.div>
                                      )}
                                      {isFirst && isReturningSoon && !isOverdue && (
                                        <div className="absolute -top-2 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[8px]">
                                          ⏰
                                        </div>
                                      )}

                                      {/* Hover tooltip */}
                                      <AnimatePresence>
                                        {hoveredBar === res.id && isFirst && (
                                          <motion.div
                                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute bottom-full left-0 mb-3 z-50 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 pointer-events-none"
                                            style={{ minWidth: '240px' }}
                                          >
                                            {/* Tooltip arrow */}
                                            <div className="absolute top-full left-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />

                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2">
                                                {res.car.images?.[0] && (
                                                  <img src={res.car.images[0]} className="w-10 h-8 rounded-lg object-cover" alt="" referrerPolicy="no-referrer" />
                                                )}
                                                <div>
                                                  <div className="font-black text-slate-900 text-sm">
                                                    🚗 {res.car.brand} {res.car.model}
                                                  </div>
                                                  <div className="text-xs text-slate-500">{res.car.registration}</div>
                                                </div>
                                              </div>

                                              <div className="text-sm text-slate-900 flex items-center gap-2">
                                                {res.client.profilePhoto ? (
                                                  <img src={res.client.profilePhoto} className="w-6 h-6 rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                                                ) : (
                                                  <span>👤</span>
                                                )}
                                                <span className="font-semibold">{res.client.firstName} {res.client.lastName}</span>
                                              </div>

                                              <div className="text-xs text-slate-600 flex items-center gap-1">
                                                📅 {res.step1.departureDate} → {res.step1.returnDate}
                                                <span className="font-bold text-slate-900">({res.totalDays}j)</span>
                                              </div>

                                              <div className="text-xs font-black text-blue-600">
                                                💰 {res.totalPrice.toLocaleString()} DA
                                              </div>

                                              <div className={`text-xs font-bold px-2 py-1 rounded-lg inline-block ${
                                                res.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                                res.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                                res.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                                                res.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                res.status === 'accepted' ? 'bg-teal-100 text-teal-700' :
                                                'bg-slate-100 text-slate-600'
                                              }`}>
                                                {res.status === 'active' ? '🔄 Actif' :
                                                 res.status === 'confirmed' ? '✅ Confirmé' :
                                                 res.status === 'completed' ? '🏁 Terminé' :
                                                 res.status === 'pending' ? '⏳ En attente' :
                                                 res.status === 'accepted' ? '✅ Accepté' : '❌ Annulé'}
                                              </div>

                                              {isOverdue && (
                                                <div className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                                  🔴 Retard de retour !
                                                </div>
                                              )}
                                              {isReturningSoon && !isOverdue && (
                                                <div className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                                                  ⏰ Retour dans 2 jours ou moins
                                                </div>
                                              )}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* EXPANDED ROW: Car's reservations list */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden border-b-2 border-blue-200 bg-blue-50/30"
                          >
                            <div className="p-4 space-y-2">
                              <div className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3">
                                📋 {lang === 'fr' ? 'Historique des réservations' : 'سجل الحجوزات'} — {car.brand} {car.model}
                              </div>
                              {carReservations.length === 0 ? (
                                <div className="text-slate-600 text-sm text-center py-4">
                                  {lang === 'fr' ? 'Aucune réservation' : 'لا توجد حجوزات'}
                                </div>
                              ) : (
                                carReservations.map((res, idx) => (
                                  <motion.div
                                    key={res.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => onSelectReservation(res)}
                                    className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-3 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                                  >
                                    {res.client.profilePhoto ? (
                                      <img src={res.client.profilePhoto} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-lg flex-shrink-0">👤</div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-slate-900 text-sm truncate">
                                        {res.client.firstName} {res.client.lastName}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        📅 {res.step1.departureDate} → {res.step1.returnDate} · {res.totalDays}j
                                      </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                      <div className="font-black text-blue-600 text-sm">{res.totalPrice.toLocaleString()} DA</div>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        res.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                        res.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        res.status === 'completed' ? 'bg-purple-100 text-purple-700' :
                                        res.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {res.status}
                                      </span>
                                    </div>

                                    <motion.div
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      whileHover={{ x: 3 }}
                                    >
                                      <ChevronRight size={16} className="text-blue-600" />
                                    </motion.div>
                                  </motion.div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* Empty state */}
                {uniqueCarsForFleet.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className="text-6xl mb-4"
                    >
                      🚗
                    </motion.div>
                    <p className="text-slate-600 text-lg font-medium">
                      {lang === 'fr' ? 'Aucun véhicule trouvé' : 'لا توجد مركبات'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200 shadow-lg">
        <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2">ℹ️ {lang === 'fr' ? 'Légende' : 'وسيلة إيضاح'}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-green-500 shadow-md"></div>
            <span className="text-sm font-bold text-slate-700">{lang === 'fr' ? 'Jour actuel' : 'اليوم الحالي'}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-blue-500 shadow-md"></div>
            <span className="text-sm font-bold text-slate-700">{lang === 'fr' ? 'Jour sélectionné' : 'اليوم المختار'}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded bg-gradient-to-r from-purple-400 to-pink-400 shadow-md"></div>
            <span className="text-sm font-bold text-slate-700">{lang === 'fr' ? 'Réservation' : 'حجز'}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
