import { supabase } from '../supabase'
import { VehicleExpense, StoreExpense } from '../types'

// Helper to generate UUID (Supabase will generate it on insert, but we use this for clarity)
const generateId = () => crypto.randomUUID ? crypto.randomUUID() : ''

// The oil/air/fuel/ac_filter_changed columns are optional: some Supabase
// projects have not run the migration that adds them yet. When they are
// missing PostgREST answers with PGRST204 ("Could not find the '…' column of
// 'vehicle_expenses' in the schema cache"). We detect that case so we can
// retry the write WITHOUT those columns and still save the expense.
const isMissingColumnError = (error: any): boolean => {
  if (!error) return false
  const code = error.code || ''
  const message = (error.message || '').toLowerCase()
  return (
    code === 'PGRST204' ||
    (message.includes('could not find') && message.includes('column')) ||
    message.includes('schema cache')
  )
}

// Vehicle Expenses
export async function getVehicleExpenses(): Promise<{ success: boolean; expenses?: VehicleExpense[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('vehicle_expenses')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching vehicle expenses:', error)
      return { success: false, error: error.message }
    }

    const expenses: VehicleExpense[] = (data || []).map(exp => ({
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
    }))

    return { success: true, expenses }
  } catch (err) {
    console.error('Unexpected error fetching vehicle expenses:', err)
    return { success: false, error: 'Failed to fetch vehicle expenses' }
  }
}

export async function addVehicleExpense(expense: Omit<VehicleExpense, 'id' | 'createdAt'>): Promise<{ success: boolean; expense?: VehicleExpense; error?: string }> {
  try {
    // Base row: columns that always exist on vehicle_expenses.
    const baseRow: Record<string, any> = {
      car_id: expense.carId,
      type: expense.type,
      cost: expense.cost,
      date: expense.date,
      note: expense.note || null,
      current_mileage: expense.currentMileage || null,
      next_vidange_km: expense.nextVidangeKm || null,
      expiration_date: expense.expirationDate || null,
      expense_name: expense.expenseName || null,
    }
    // Optional filter-tracking columns (only present after the migration).
    const filterRow: Record<string, any> = {
      oil_filter_changed: (expense as any).oilFilterChanged || false,
      air_filter_changed: (expense as any).airFilterChanged || false,
      fuel_filter_changed: (expense as any).fuelFilterChanged || false,
      ac_filter_changed: (expense as any).acFilterChanged || false,
    }

    let { data, error } = await supabase
      .from('vehicle_expenses')
      .insert({ ...baseRow, ...filterRow })
      .select()
      .single()

    // Retry without the filter columns if the DB has not been migrated yet,
    // so the expense still saves instead of failing with a 400 error.
    if (error && isMissingColumnError(error)) {
      console.warn('[expenseService] vehicle_expenses filter columns missing, saving without them:', error.message)
      ;({ data, error } = await supabase
        .from('vehicle_expenses')
        .insert(baseRow)
        .select()
        .single())
    }

    if (error) {
      console.error('Error adding vehicle expense:', error)
      return { success: false, error: error.message }
    }

    const newExpense: VehicleExpense = {
      id: data.id,
      carId: data.car_id,
      type: data.type,
      cost: data.cost,
      date: data.date,
      note: data.note,
      currentMileage: data.current_mileage,
      nextVidangeKm: data.next_vidange_km,
      expirationDate: data.expiration_date,
      expenseName: data.expense_name,
      createdAt: data.created_at,
      oilFilterChanged: data.oil_filter_changed || false,
      airFilterChanged: data.air_filter_changed || false,
      fuelFilterChanged: data.fuel_filter_changed || false,
      acFilterChanged: data.ac_filter_changed || false,
    }

    return { success: true, expense: newExpense }
  } catch (err) {
    console.error('Unexpected error adding vehicle expense:', err)
    return { success: false, error: 'Failed to add vehicle expense' }
  }
}

export async function updateVehicleExpense(
  id: string,
  updates: Partial<Omit<VehicleExpense, 'id' | 'createdAt'>>
): Promise<{ success: boolean; expense?: VehicleExpense; error?: string }> {
  try {
    const updateData: Record<string, any> = {}

    if (updates.carId !== undefined) updateData.car_id = updates.carId
    if (updates.type !== undefined) updateData.type = updates.type
    if (updates.cost !== undefined) updateData.cost = updates.cost
    if (updates.date !== undefined) updateData.date = updates.date
    if (updates.note !== undefined) updateData.note = updates.note
    if (updates.currentMileage !== undefined) updateData.current_mileage = updates.currentMileage
    if (updates.nextVidangeKm !== undefined) updateData.next_vidange_km = updates.nextVidangeKm
    if (updates.expirationDate !== undefined) updateData.expiration_date = updates.expirationDate
    if (updates.expenseName !== undefined) updateData.expense_name = updates.expenseName

    // Optional filter-tracking columns kept separate so we can drop them if the
    // DB has not been migrated (same PGRST204 handling as addVehicleExpense).
    const filterData: Record<string, any> = {}
    if ((updates as any).oilFilterChanged !== undefined) filterData.oil_filter_changed = (updates as any).oilFilterChanged
    if ((updates as any).airFilterChanged !== undefined) filterData.air_filter_changed = (updates as any).airFilterChanged
    if ((updates as any).fuelFilterChanged !== undefined) filterData.fuel_filter_changed = (updates as any).fuelFilterChanged
    if ((updates as any).acFilterChanged !== undefined) filterData.ac_filter_changed = (updates as any).acFilterChanged

    let { data, error } = await supabase
      .from('vehicle_expenses')
      .update({ ...updateData, ...filterData })
      .eq('id', id)
      .select()
      .single()

    if (error && isMissingColumnError(error)) {
      console.warn('[expenseService] vehicle_expenses filter columns missing, updating without them:', error.message)
      ;({ data, error } = await supabase
        .from('vehicle_expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single())
    }

    if (error) {
      console.error('Error updating vehicle expense:', error)
      return { success: false, error: error.message }
    }

    const updatedExpense: VehicleExpense = {
      id: data.id,
      carId: data.car_id,
      type: data.type,
      cost: data.cost,
      date: data.date,
      note: data.note,
      currentMileage: data.current_mileage,
      nextVidangeKm: data.next_vidange_km,
      expirationDate: data.expiration_date,
      expenseName: data.expense_name,
      createdAt: data.created_at,
      oilFilterChanged: data.oil_filter_changed || false,
      airFilterChanged: data.air_filter_changed || false,
      fuelFilterChanged: data.fuel_filter_changed || false,
      acFilterChanged: data.ac_filter_changed || false,
    }

    return { success: true, expense: updatedExpense }
  } catch (err) {
    console.error('Unexpected error updating vehicle expense:', err)
    return { success: false, error: 'Failed to update vehicle expense' }
  }
}

export async function deleteVehicleExpense(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('vehicle_expenses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting vehicle expense:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error deleting vehicle expense:', err)
    return { success: false, error: 'Failed to delete vehicle expense' }
  }
}

// Store Expenses
export async function getStoreExpenses(): Promise<{ success: boolean; expenses?: StoreExpense[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('store_expenses')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching store expenses:', error)
      return { success: false, error: error.message }
    }

    const expenses: StoreExpense[] = (data || []).map(exp => ({
      id: exp.id,
      name: exp.name,
      cost: exp.cost,
      date: exp.date,
      note: exp.note,
      icon: exp.icon,
      createdAt: exp.created_at,
    }))

    return { success: true, expenses }
  } catch (err) {
    console.error('Unexpected error fetching store expenses:', err)
    return { success: false, error: 'Failed to fetch store expenses' }
  }
}

export async function addStoreExpense(expense: Omit<StoreExpense, 'id' | 'createdAt'>): Promise<{ success: boolean; expense?: StoreExpense; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('store_expenses')
      .insert({
        name: expense.name,
        cost: expense.cost,
        date: expense.date,
        note: expense.note || null,
        icon: expense.icon || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding store expense:', error)
      return { success: false, error: error.message }
    }

    const newExpense: StoreExpense = {
      id: data.id,
      name: data.name,
      cost: data.cost,
      date: data.date,
      note: data.note,
      icon: data.icon,
      createdAt: data.created_at,
    }

    return { success: true, expense: newExpense }
  } catch (err) {
    console.error('Unexpected error adding store expense:', err)
    return { success: false, error: 'Failed to add store expense' }
  }
}

export async function updateStoreExpense(
  id: string,
  updates: Partial<Omit<StoreExpense, 'id' | 'createdAt'>>
): Promise<{ success: boolean; expense?: StoreExpense; error?: string }> {
  try {
    const updateData: Record<string, any> = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.cost !== undefined) updateData.cost = updates.cost
    if (updates.date !== undefined) updateData.date = updates.date
    if (updates.note !== undefined) updateData.note = updates.note
    if (updates.icon !== undefined) updateData.icon = updates.icon

    const { data, error } = await supabase
      .from('store_expenses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating store expense:', error)
      return { success: false, error: error.message }
    }

    const updatedExpense: StoreExpense = {
      id: data.id,
      name: data.name,
      cost: data.cost,
      date: data.date,
      note: data.note,
      icon: data.icon,
      createdAt: data.created_at,
    }

    return { success: true, expense: updatedExpense }
  } catch (err) {
    console.error('Unexpected error updating store expense:', err)
    return { success: false, error: 'Failed to update store expense' }
  }
}

export async function deleteStoreExpense(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('store_expenses')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting store expense:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error deleting store expense:', err)
    return { success: false, error: 'Failed to delete store expense' }
  }
}
