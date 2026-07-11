import { supabase } from '../supabase'

export interface ClientImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Uploads a client profile photo to the Supabase storage bucket
 * @param file - The image file to upload
 * @param clientId - Optional client ID for naming the file
 * @returns Promise with upload result
 */
export async function uploadClientProfilePhoto(
  file: File,
  clientId?: string
): Promise<ClientImageUploadResult> {
  try {
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 5MB' }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = clientId
      ? `profile-${clientId}-${Date.now()}.${fileExt}`
      : `profile-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('clients')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('clients')
      .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Unexpected error during upload:', error)
    return { success: false, error: 'An unexpected error occurred during upload' }
  }
}

/**
 * Uploads a scanned document image to the Supabase storage bucket
 * @param file - The document image file to upload
 * @param clientId - Optional client ID for naming the file
 * @returns Promise with upload result
 */
export async function uploadClientDocument(
  file: File,
  clientId?: string
): Promise<ClientImageUploadResult> {
  try {
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    const maxSize = 10 * 1024 * 1024 // 10MB for documents
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 10MB' }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = clientId
      ? `document-${clientId}-${Date.now()}.${fileExt}`
      : `document-${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('clients')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('clients')
      .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Unexpected error during upload:', error)
    return { success: false, error: 'An unexpected error occurred during upload' }
  }
}
