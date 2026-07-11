import { VehicleExpense, Car } from '../types';

export interface VidangeAlert {
  status: 'overdue' | 'warning' | 'ok';
  currentMileage: number;
  nextVidangeKm: number;
  kmRemaining: number;
  message: string;
}

export interface AssuranceAlert {
  status: 'overdue' | 'warning' | 'ok';
  expirationDate: Date;
  daysRemaining: number;
  message: string;
}

/**
 * Check if a car needs vidange (oil change) alert
 * @param car - The car object with current mileage
 * @param expenses - Array of vehicle expenses
 * @returns VidangeAlert object or null if no vidange records found
 */
export const getVidangeAlert = (car: Car, expenses: VehicleExpense[]): VidangeAlert | null => {
  // Find the latest vidange expense
  const vidangeExpenses = expenses.filter(e => e.type === 'vidange' && e.currentMileage !== undefined && e.nextVidangeKm !== undefined && e.carId === car.id);
  
  if (vidangeExpenses.length === 0) {
    return null;
  }

  // Get the most recent vidange
  const latestVidange = vidangeExpenses.reduce((latest, current) => {
    // Prefer createdAt if available, otherwise fall back to date
    const latestTime = latest.createdAt ? new Date(latest.createdAt).getTime() : new Date(latest.date).getTime();
    const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : new Date(current.date).getTime();
    return currentTime > latestTime ? current : latest;
  });

  if (latestVidange.currentMileage === undefined || latestVidange.currentMileage === null || latestVidange.nextVidangeKm === undefined || latestVidange.nextVidangeKm === null) {
    return null;
  }

  const nextVidangeKm = latestVidange.currentMileage + latestVidange.nextVidangeKm;
  const currentMileage = car.mileage || 0;
  const kmRemaining = nextVidangeKm - currentMileage;

  let status: 'overdue' | 'warning' | 'ok' = 'ok';
  let message = '';

  if (kmRemaining < 0) {
    status = 'overdue';
    message = `⚠️ VIDANGE EN RETARD! Kilomètres dépassés: ${Math.abs(kmRemaining).toLocaleString()} KM`;
  } else if (kmRemaining < 500) {
    status = 'warning';
    message = `⚠️ Vidange bientôt! ${kmRemaining.toLocaleString()} KM restants`;
  } else {
    status = 'ok';
    message = `✓ Vidange OK. ${kmRemaining.toLocaleString()} KM restants`;
  }

  return {
    status,
    currentMileage,
    nextVidangeKm,
    kmRemaining,
    message
  };
};

/**
 * Check if a car needs assurance (insurance) alert
 * @param car - The car object
 * @param expenses - Array of vehicle expenses
 * @returns AssuranceAlert object or null if no assurance records found
 */
export const getAssuranceAlert = (car: Car, expenses: VehicleExpense[]): AssuranceAlert | null => {
  // Find the latest assurance expense for THIS CAR with expiration date
  const assuranceExpenses = expenses.filter(e => e.type === 'assurance' && e.expirationDate && e.carId === car.id);

  if (assuranceExpenses.length === 0) {
    return null;
  }

  // Get the most recent assurance
  const latestAssurance = assuranceExpenses.reduce((latest, current) => {
    // Prefer createdAt if available, otherwise fall back to date
    const latestTime = latest.createdAt ? new Date(latest.createdAt).getTime() : new Date(latest.date).getTime();
    const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : new Date(current.date).getTime();
    return currentTime > latestTime ? current : latest;
  });

  if (!latestAssurance.expirationDate) {
    return null;
  }

  const expirationDate = new Date(latestAssurance.expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  const daysRemaining = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let status: 'overdue' | 'warning' | 'ok' = 'ok';
  let message = '';

  if (daysRemaining < 0) {
    status = 'overdue';
    message = `🚨 ASSURANCE EXPIRÉE! Expirée depuis ${Math.abs(daysRemaining)} jours`;
  } else if (daysRemaining <= 30) {
    status = 'warning';
    message = `⚠️ Assurance expire bientôt! ${daysRemaining} jours restants`;
  } else {
    status = 'ok';
    message = `✓ Assurance valide. Expire dans ${daysRemaining} jours`;
  }

  return {
    status,
    expirationDate,
    daysRemaining,
    message
  };
};

/**
 * Check if a car needs controle_technique (technical inspection) alert
 * @param car - The car object
 * @param expenses - Array of vehicle expenses
 * @returns AssuranceAlert object or null if no controle_technique records found
 */
export const getControleAlert = (car: Car, expenses: VehicleExpense[]): AssuranceAlert | null => {
  // Find the latest controle expense for THIS CAR with expiration date
  const controleExpenses = expenses.filter(e => e.type === 'controle' && e.expirationDate && e.carId === car.id);

  if (controleExpenses.length === 0) {
    return null;
  }

  // Get the most recent controle_technique
  const latestControle = controleExpenses.reduce((latest, current) => {
    // Prefer createdAt if available, otherwise fall back to date
    const latestTime = latest.createdAt ? new Date(latest.createdAt).getTime() : new Date(latest.date).getTime();
    const currentTime = current.createdAt ? new Date(current.createdAt).getTime() : new Date(current.date).getTime();
    return currentTime > latestTime ? current : latest;
  });

  if (!latestControle.expirationDate) {
    return null;
  }

  const expirationDate = new Date(latestControle.expirationDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

  const daysRemaining = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let status: 'overdue' | 'warning' | 'ok' = 'ok';
  let message = '';

  if (daysRemaining < 0) {
    status = 'overdue';
    message = `🚨 CONTRÔLE TECHNIQUE EXPIRÉE! Expirée depuis ${Math.abs(daysRemaining)} jours`;
  } else if (daysRemaining <= 30) {
    status = 'warning';
    message = `⚠️ Contrôle technique expire bientôt! ${daysRemaining} jours restants`;
  } else {
    status = 'ok';
    message = `✓ Contrôle technique valide. Expire dans ${daysRemaining} jours`;
  }

  return {
    status,
    expirationDate,
    daysRemaining,
    message
  };
};
/**
 * Check if a car needs chaine (chain/belt) alert
 * Uses same km-based logic as vidange — filtered by type 'chaine'
 */
export const getChaineAlert = (car: Car, expenses: VehicleExpense[]): VidangeAlert | null => {
  const chaineExpenses = expenses.filter(
    e => e.type === 'chaine' && e.currentMileage !== undefined && e.nextVidangeKm !== undefined && e.carId === car.id
  );

  if (chaineExpenses.length === 0) return null;

  const latest = chaineExpenses.reduce((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
    return bTime > aTime ? b : a;
  });

  if (latest.currentMileage === undefined || latest.currentMileage === null || latest.nextVidangeKm === undefined || latest.nextVidangeKm === null) return null;

  const nextServiceKm = latest.currentMileage + latest.nextVidangeKm;
  const currentMileage = car.mileage || 0;
  const kmRemaining = nextServiceKm - currentMileage;

  let status: 'overdue' | 'warning' | 'ok' = 'ok';
  let message = '';

  if (kmRemaining < 0) {
    status = 'overdue';
    message = `🚨 CHAÎNE EN RETARD! Dépassement: ${Math.abs(kmRemaining).toLocaleString()} KM`;
  } else if (kmRemaining < 500) {
    status = 'warning';
    message = `⚠️ Chaîne bientôt! ${kmRemaining.toLocaleString()} KM restants`;
  } else {
    status = 'ok';
    message = `✓ Chaîne OK. ${kmRemaining.toLocaleString()} KM restants`;
  }

  return { status, currentMileage, nextVidangeKm: nextServiceKm, kmRemaining, message };
};
