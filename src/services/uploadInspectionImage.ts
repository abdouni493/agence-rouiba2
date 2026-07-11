import { supabase } from '../supabase'

export interface InspectionImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Uploads an inspection image to the Supabase storage bucket
 * @param file - The image file to upload
 * @param inspectionId - Optional inspection ID for naming the file
 * @param type - Type of photo (exterior_front, exterior_rear, interior, other)
 * @returns Promise with upload result
 */
export async function uploadInspectionImage(
  file: File,
  inspectionId?: string,
  type: string = 'other'
): Promise<InspectionImageUploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image'
      }
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size must be less than 5MB'
      }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = inspectionId
      ? `inspection-${inspectionId}-${type}-${Date.now()}.${fileExt}`
      : `inspection-${type}-${Date.now()}.${fileExt}`

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from('inspection')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('inspection')
      .getPublicUrl(fileName)

    return {
      success: true,
      url: publicUrl
    }
  } catch (error) {
    console.error('Unexpected error during upload:', error)
    return {
      success: false,
      error: 'An unexpected error occurred during upload'
    }
  }
}