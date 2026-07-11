import { supabase } from '../supabase'
import { uploadCarImage } from './uploadCarImage'

export interface Car {
  id?: string
  brand: string
  model: string
  year: number
  plate_number: string
  price_per_day: number
  status: string
  image_url?: string
  created_at?: string
  // Additional fields for full car data
  color?: string
  vin?: string
  energy?: string
  transmission?: string
  seats?: number
  doors?: number
  price_week?: number
  price_month?: number
  deposit?: number
  mileage?: number
  fuel_level?: 'full' | 'half' | 'quarter' | 'eighth' | 'empty'
  is_hidden_from_site?: boolean
}

export interface AddCarData {
  brand: string
  model: string
  year: number
  plate_number: string
  price_per_day: number
  status: string
  image?: File
  image_url?: string
  // Additional fields
  color?: string
  vin?: string
  energy?: string
  transmission?: string
  seats?: number
  doors?: number
  price_week?: number
  price_month?: number
  deposit?: number
  mileage?: number
}

/**
 * Add a new car with optional image upload or direct URL
 */
export async function addCar(carData: AddCarData): Promise<{ success: boolean; car?: Car; error?: string }> {
  try {
    let imageUrl: string | undefined

    // Use provided image_url or upload image if provided
    if (carData.image_url) {
      imageUrl = carData.image_url
    } else if (carData.image) {
      const uploadResult = await uploadCarImage(carData.image)
      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error
        }
      }
      imageUrl = uploadResult.url
    }

    // Insert car data into database
    const { data, error } = await supabase
      .from('cars')
      .insert({
        brand: carData.brand,
        model: carData.model,
        year: carData.year,
        plate_number: carData.plate_number,
        price_per_day: carData.price_per_day,
        status: carData.status,
        image_url: imageUrl,
        color: carData.color,
        vin: carData.vin,
        energy: carData.energy,
        transmission: carData.transmission,
        seats: carData.seats,
        doors: carData.doors,
        price_week: carData.price_week,
        price_month: carData.price_month,
        deposit: carData.deposit,
        mileage: carData.mileage,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      car: data
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Get all cars
 */
export async function getCars(): Promise<{ success: boolean; cars?: Car[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      cars: data
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Get a single car by ID
 */
export async function getCar(id: string): Promise<{ success: boolean; car?: Car; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Database error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      car: data
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Update a car
 */
export async function updateCar(
  id: string,
  updates: Partial<Car>
): Promise<{ success: boolean; car?: Car; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('cars')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true,
      car: data
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Delete a car
 */
export async function deleteCar(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}