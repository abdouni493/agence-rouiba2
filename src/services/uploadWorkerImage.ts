import { supabase } from '../supabase';

export const uploadWorkerProfilePhoto = async (file: File, workerId?: string): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = workerId
      ? `worker_${workerId}_profile.${fileExt}`
      : `worker_temp_profile_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('worker')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('worker')
      .getPublicUrl(data.path);

    return { success: true, url: publicUrl };
  } catch (err) {
    console.error('Upload failed:', err);
    return { success: false, error: 'Upload failed' };
  }
};