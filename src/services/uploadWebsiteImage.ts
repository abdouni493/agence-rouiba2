import { supabase } from '../supabase'
import { sessionService } from '../utils/sessionService'

export interface WebsiteImageUploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Uploads a website asset (logo, landing background…) to the shared
 * "website" Supabase storage bucket and returns its public URL.
 * @param file - The image file to upload
 * @param prefix - File name prefix ("logo" | "background"…)
 */
export async function uploadWebsiteImage(
  file: File,
  prefix: string = 'asset'
): Promise<WebsiteImageUploadResult> {
  try {
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 5MB' }
    }

    // Le bucket "website" n'accepte que le rôle "authenticated" : sans session
    // Supabase active, le SDK envoie la clé anon et l'upload est rejeté par RLS.
    const hasAuth = await sessionService.ensureSupabaseSession()
    if (!hasAuth) {
      return {
        success: false,
        error: 'Session administrateur expirée — déconnectez-vous puis reconnectez-vous, et réessayez.'
      }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${prefix}-${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from('website')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (error) {
      console.error('Website image upload error:', error)
      if (error.message?.includes('row-level security')) {
        return {
          success: false,
          error: 'Accès refusé (RLS) : reconnectez-vous en tant qu\'administrateur puis réessayez.'
        }
      }
      if (error.message?.includes('Bucket not found')) {
        return {
          success: false,
          error: 'Bucket "website" introuvable — exécutez supabase/migrations/20260706_website_updates.sql dans le SQL Editor de Supabase.'
        }
      }
      return { success: false, error: error.message }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('website')
      .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Unexpected error during website image upload:', error)
    return { success: false, error: 'An unexpected error occurred during upload' }
  }
}
