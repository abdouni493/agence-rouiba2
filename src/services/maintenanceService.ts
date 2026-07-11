import { supabase } from '../supabase';
import { Car, VehicleExpense } from '../types';

export interface MaintenanceStatus {
  car: Car;
  vidange: {
    lastDate: string | null;
    lastMileage: number | null;
    nextMileage: number | null;
    kmRemaining: number | null;
    expense: VehicleExpense | null;
  };
  chaine: {
    lastDate: string | null;
    lastMileage: number | null;
    nextMileage: number | null;
    kmRemaining: number | null;
    expense: VehicleExpense | null;
  };
  assurance: {
    lastDate: string | null;
    expirationDate: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
    expense: VehicleExpense | null;
  };
  controleTechnique: {
    lastDate: string | null;
    expirationDate: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
    expense: VehicleExpense | null;
  };
}

export async function getMaintenanceStatus(
  cars: Car[],
  allExpenses?: VehicleExpense[]
): Promise<MaintenanceStatus[]> {
  try {
    const result: MaintenanceStatus[] = [];

    for (const car of cars) {
      // Use passed expenses or fall back to querying
      let expenses: any[] = [];
      
      if (allExpenses && allExpenses.length > 0) {
        // Filter expenses for this specific car from the passed data
        expenses = allExpenses.filter(exp => exp.carId === car.id);
        console.log(`[Maintenance] Using passed expenses: Found ${expenses.length} expenses for car ${car.id} (${car.brand} ${car.model})`);
      } else {
        // Fallback to database query (backward compatibility)
        const { data: dbExpenses, error } = await supabase
          .from('vehicle_expenses')
          .select('*')
          .eq('car_id', car.id)
          .order('date', { ascending: false });

        if (error) {
          console.error(`Error fetching expenses for car ${car.id}:`, error);
          console.error(`  Error details:`, error.message, error.details);
          continue;
        }

        expenses = dbExpenses || [];
        
        if (!expenses || expenses.length === 0) {
          console.log(`[Maintenance] No expenses found for car ${car.id} (${car.brand} ${car.model})`);
        } else {
          console.log(`[Maintenance] Found ${expenses.length} expenses for car ${car.id}`);
        }
      }

      // Map expenses to VehicleExpense format if needed
      const mappedExpenses: VehicleExpense[] = (expenses || []).map(exp => {
        // Check if already mapped or from database
        if (exp.carId) {
          // Already VehicleExpense format
          return exp as VehicleExpense;
        }
        // From database, needs mapping
        return {
          id: exp.id,
          carId: exp.car_id,
          type: exp.type,
          cost: exp.cost,
          date: exp.date,
          note: exp.note,
          currentMileage: exp.current_mileage,
          nextVidangeKm: exp.next_vidange_km,
          expirationDate: exp.expiration_date,
          expenseName: exp.expense_name,
          createdAt: exp.created_at,
          oilFilterChanged: exp.oil_filter_changed || false,
          airFilterChanged: exp.air_filter_changed || false,
          fuelFilterChanged: exp.fuel_filter_changed || false,
          acFilterChanged: exp.ac_filter_changed || false,
        };
      });

      // Separate expenses by type
      const vidangeExpenses = mappedExpenses.filter(e => e.type === 'vidange');
      const chaineExpenses = mappedExpenses.filter(e => e.type === 'chaine');
      const assuranceExpenses = mappedExpenses.filter(e => e.type === 'assurance');
      const controleExpenses = mappedExpenses.filter(e => e.type === 'controle');

      // Calculate vidange status
      // nextVidangeKm is an INTERVAL, so: nextAbsoluteTarget = lastMileage + interval
      // kmRemaining = nextAbsoluteTarget - currentMileage
      const latestVidange = vidangeExpenses[0];
      const vidangeStatus = {
        lastDate: latestVidange?.date || null,
        lastMileage: latestVidange?.currentMileage || null,
        nextMileage: latestVidange?.nextVidangeKm || null,
        kmRemaining: latestVidange?.currentMileage !== null && latestVidange?.currentMileage !== undefined && latestVidange?.nextVidangeKm
          ? (latestVidange.currentMileage + latestVidange.nextVidangeKm) - (car.mileage || 0)
          : null,
        expense: latestVidange || null,
      };

      // Calculate chaine status
      // nextVidangeKm is an INTERVAL, so: nextAbsoluteTarget = lastMileage + interval
      // kmRemaining = nextAbsoluteTarget - currentMileage
      const latestChaine = chaineExpenses[0];
      const chaineStatus = {
        lastDate: latestChaine?.date || null,
        lastMileage: latestChaine?.currentMileage || null,
        nextMileage: latestChaine?.nextVidangeKm || null,
        kmRemaining: latestChaine?.currentMileage !== null && latestChaine?.currentMileage !== undefined && latestChaine?.nextVidangeKm
          ? (latestChaine.currentMileage + latestChaine.nextVidangeKm) - (car.mileage || 0)
          : null,
        expense: latestChaine || null,
      };

      // Calculate assurance status
      const latestAssurance = assuranceExpenses[0];
      const today = new Date();
      const assuranceExpiration = latestAssurance?.expirationDate
        ? new Date(latestAssurance.expirationDate)
        : null;
      const assuranceDaysRemaining = assuranceExpiration
        ? Math.ceil((assuranceExpiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const assuranceStatus = {
        lastDate: latestAssurance?.date || null,
        expirationDate: latestAssurance?.expirationDate || null,
        daysRemaining: assuranceDaysRemaining,
        isExpired: assuranceDaysRemaining !== null && assuranceDaysRemaining < 0,
        expense: latestAssurance || null,
      };

      // Calculate controle technique status
      const latestControle = controleExpenses[0];
      const controleExpiration = latestControle?.expirationDate
        ? new Date(latestControle.expirationDate)
        : null;
      const controleDaysRemaining = controleExpiration
        ? Math.ceil((controleExpiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const controleStatus = {
        lastDate: latestControle?.date || null,
        expirationDate: latestControle?.expirationDate || null,
        daysRemaining: controleDaysRemaining,
        isExpired: controleDaysRemaining !== null && controleDaysRemaining < 0,
        expense: latestControle || null,
      };

      result.push({
        car,
        vidange: vidangeStatus,
        chaine: chaineStatus,
        assurance: assuranceStatus,
        controleTechnique: controleStatus,
      });
    }

    return result;
  } catch (error) {
    console.error('Error getting maintenance status:', error);
    return [];
  }
}

// Get status color based on alert level
// Color thresholds:
// - KM-based (vidange, chaine): Green > 2000 km, Yellow 0-2000 km, Red <= 0 km (overdue)
// - Day-based (assurance, controle): Green > 30 days, Yellow 0-30 days, Red < 0 days (expired)
export function getStatusColor(
  type: 'vidange' | 'chaine' | 'assurance' | 'controle',
  value: number | null | undefined
): 'critical' | 'warning' | 'success' {
  if (value === null || value === undefined) {
    return 'success'; // No data yet
  }

  if (type === 'vidange' || type === 'chaine') {
    // KM remaining
    if (value <= 0) return 'critical'; // Overdue
    if (value <= 2000) return 'warning'; // Warning zone
    return 'success'; // Plenty of KM left
  } else {
    // Days remaining (assurance, controle)
    if (value < 0) return 'critical'; // Expired
    if (value <= 30) return 'warning'; // Warning zone (30 days or less)
    return 'success'; // Plenty of time left
  }
}

export function getStatusEmoji(status: 'critical' | 'warning' | 'success'): string {
  switch (status) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'success':
      return '🟢';
  }
}
