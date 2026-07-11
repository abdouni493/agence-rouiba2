import { ReservationDetails } from '../types';

export interface ReservationAlert {
  id: string;
  reservationId: string;
  car: any;
  reservation: ReservationDetails;
  type: 'pre_start' | 'pre_end' | 'not_closed' | 'late_activation' | 'expiring_tomorrow' | 'expiring_today';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  icon: string;
  daysUntil?: number;
  daysOverdue?: number;
  status: 'warning' | 'critical' | 'ok';
  actionRequired: boolean;
}

/**
 * Generate alerts for a single reservation
 */
export const getReservationAlert = (
  reservation: ReservationDetails
): ReservationAlert | null => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const departureDate = new Date(reservation.step1.departureDate);
  departureDate.setHours(0, 0, 0, 0);

  const returnDate = new Date(reservation.step1.returnDate);
  returnDate.setHours(0, 0, 0, 0);

  const completedAt = reservation.completedAt ? new Date(reservation.completedAt) : null;
  const activatedAt = reservation.activatedAt ? new Date(reservation.activatedAt) : null;

  // Calculate days difference
  const daysUntilDeparture = Math.floor((departureDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilReturn = Math.floor((returnDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceReturn = Math.floor((today.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24));

  // 0. NEW ALERT: Reservation expires today (date_fin = today)
  if (
    returnDate.getTime() === today.getTime() && 
    (reservation.status === 'active' || reservation.status === 'confirmed')
  ) {
    const clientName = `${reservation.client.firstName} ${reservation.client.lastName}`;
    const vehicleName = `${reservation.car.brand} ${reservation.car.model}`;
    return {
      id: `${reservation.id}-expiring-today`,
      reservationId: reservation.id,
      car: reservation.car,
      reservation,
      type: 'expiring_today',
      severity: 'critical',
      title: 'Réservation expire aujourd\'hui / الحجز ينتهي اليوم',
      message: `La réservation de ${clientName} pour ${vehicleName} expire aujourd\'hui à minuit!`,
      icon: '🚨',
      daysUntil: 0,
      status: 'critical',
      actionRequired: true
    };
  }

  // 0.5 NEW ALERT: Reservation expires tomorrow (date_fin = tomorrow)
  if (
    returnDate.getTime() === tomorrow.getTime() && 
    (reservation.status === 'active' || reservation.status === 'confirmed')
  ) {
    const clientName = `${reservation.client.firstName} ${reservation.client.lastName}`;
    const vehicleName = `${reservation.car.brand} ${reservation.car.model}`;
    return {
      id: `${reservation.id}-expiring-tomorrow`,
      reservationId: reservation.id,
      car: reservation.car,
      reservation,
      type: 'expiring_tomorrow',
      severity: 'high',
      title: 'Réservation expire demain / الحجز ينتهي غدا',
      message: `La réservation de ${clientName} pour ${vehicleName} expire demain (${returnDate.toLocaleDateString('fr-FR')})`,
      icon: '🔔',
      daysUntil: 1,
      status: 'warning',
      actionRequired: true
    };
  }

  // 1. Alert: One day before departure
  if (daysUntilDeparture === 1 && reservation.status === 'confirmed') {
    return {
      id: `${reservation.id}-pre-start`,
      reservationId: reservation.id,
      car: reservation.car,
      reservation,
      type: 'pre_start',
      severity: 'medium',
      title: 'Départ Demain / غدا الانطلاق',
      message: `La réservation de ${reservation.client.firstName} ${reservation.client.lastName} commence demain`,
      icon: '🚗',
      daysUntil: 1,
      status: 'warning',
      actionRequired: true
    };
  }

  // 2. Alert: One day before return
  if (daysUntilReturn === 1 && (reservation.status === 'active' || reservation.status === 'confirmed')) {
    return {
      id: `${reservation.id}-pre-end`,
      reservationId: reservation.id,
      car: reservation.car,
      reservation,
      type: 'pre_end',
      severity: 'medium',
      title: 'Retour Demain / العودة غدا',
      message: `La réservation de ${reservation.client.firstName} ${reservation.client.lastName} prend fin demain`,
      icon: '📅',
      daysUntil: 1,
      status: 'warning',
      actionRequired: true
    };
  }

  // 3. Alert: Reservation has ended but not closed (Retard)
  if (daysSinceReturn > 0 && reservation.status !== 'completed' && reservation.status !== 'cancelled') {
    return {
      id: `${reservation.id}-not-closed`,
      reservationId: reservation.id,
      car: reservation.car,
      reservation,
      type: 'not_closed',
      severity: 'critical',
      title: 'Retard - Non Fermée / تأخير - غير مغلقة',
      message: `Réservation en retard depuis ${daysSinceReturn} jour(s) - Non fermée`,
      icon: '⏰',
      daysOverdue: daysSinceReturn,
      status: 'critical',
      actionRequired: true
    };
  }

  // 4. Alert: Late activation of reservation (Client is late to take the car)
  if (daysUntilDeparture < 0 && !activatedAt && reservation.status !== 'cancelled') {
    const daysLate = Math.abs(daysUntilDeparture);
    return {
      id: `${reservation.id}-late-activation`,
      reservationId: reservation.id,
      car: reservation.car,
      reservation,
      type: 'late_activation',
      severity: daysLate > 3 ? 'critical' : 'high',
      title: 'Activation Retardée / تفعيل متأخر',
      message: `Le client ${reservation.client.firstName} ${reservation.client.lastName} est en retard depuis ${daysLate} jour(s) pour récupérer le véhicule`,
      icon: '⚠️',
      daysOverdue: daysLate,
      status: daysLate > 3 ? 'critical' : 'warning',
      actionRequired: true
    };
  }

  return null;
};

/**
 * Get all reservation alerts from a list of reservations
 */
export const getReservationAlerts = (
  reservations: ReservationDetails[]
): ReservationAlert[] => {
  const alerts: ReservationAlert[] = [];

  reservations.forEach(reservation => {
    const alert = getReservationAlert(reservation);
    if (alert) {
      alerts.push(alert);
    }
  });

  // Sort by severity (critical first) then by days overdue/until
  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const severityDiff = severityOrder[a.severity as keyof typeof severityOrder] - 
                         severityOrder[b.severity as keyof typeof severityOrder];
    
    if (severityDiff !== 0) return severityDiff;

    // If same severity, sort by days (overdue first)
    if (a.daysOverdue && b.daysOverdue) {
      return b.daysOverdue - a.daysOverdue;
    }
    
    return 0;
  });
};
