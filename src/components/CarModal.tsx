import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Language } from '../types';
import { X, Plus, Loader2 } from 'lucide-react';
import { uploadCarImage } from '../services/uploadCarImage';

interface CarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (car: Partial<Car>) => void;
  onDelete?: (id: string) => void;
  car?: Car;
  lang: Language;
}

export const CarModal: React.FC<CarModalProps> = ({ isOpen, onClose, onSave, onDelete, car, lang }) => {
  const [formData, setFormData] = useState<Partial<Car>>({
    brand: '',
    model: '',
    registration: '',
    year: new Date().getFullYear(),
    color: '',
    vin: '',
    energy: 'Essence',
    transmission: 'Manuelle',
    seats: 5,
    doors: 5,
    priceDay: 0,
    priceWeek: 0,
    priceMonth: 0,
    deposit: 0,
    images: [],
    mileage: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    if (car) {
      setFormData(car);
    } else {
      setFormData({
        brand: '',
        model: '',
        registration: '',
        year: new Date().getFullYear(),
        color: '',
        vin: '',
        energy: 'Essence',
        transmission: 'Manuelle',
        seats: 5,
        doors: 5,
        priceDay: 0,
        priceWeek: 0,
        priceMonth: 0,
        deposit: 0,
        images: [],
        mileage: 0,
      });
    }
  }, [car, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'seats' || name === 'doors' || name.startsWith('price') || name === 'deposit' || name === 'mileage' 
        ? Number(value) 
        : value
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadingImages(true);
      try {
        const newImages: string[] = [];
        
        for (const file of Array.from(files)) {
          const result = await uploadCarImage(file as File, car?.id);
          if (result.success && result.url) {
            newImages.push(result.url);
          }
        }
        
        setFormData(prev => ({
          ...prev,
          images: newImages.length > 0 ? newImages : prev.images
        }));
      } catch (err) {
        console.error('Error uploading images:', err);
      } finally {
        setUploadingImages(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-saas-border"
      >
        <div className="p-8 border-b border-saas-border flex items-center justify-between bg-linear-to-r from-saas-primary-start via-saas-primary-via to-saas-primary-end text-white">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
              {car ? '✏️ Modifier Véhicule' : '🚗 Nouveau Véhicule'}
            </h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
              {lang === 'fr' ? 'Gestion de flotte professionnelle' : 'إدارة الأسطول الاحترافية'}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar bg-saas-bg">
          {/* Media & Photos */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-saas-primary-via flex items-center gap-3 uppercase tracking-[0.2em]">
              <span className="p-2 bg-saas-primary-via/10 rounded-lg">📸</span>
              Media & Photos
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.images?.map((img, idx) => (
                <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border-2 border-white shadow-md group">
                  <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 bg-saas-danger-start text-white p-2 rounded-xl hover:bg-saas-danger-end shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <label className="aspect-video rounded-2xl border-2 border-dashed border-saas-border bg-white flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-saas-primary-via hover:bg-saas-primary-start/5 text-saas-text-muted hover:text-saas-primary-via transition-all group disabled:opacity-50"
                onClick={e => {
                  if (uploadingImages) e.preventDefault();
                }}>
                <div className="w-10 h-10 rounded-xl bg-saas-bg flex items-center justify-center text-saas-text-muted group-hover:text-saas-primary-via transition-colors">
                  {uploadingImages ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Plus size={24} />
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {uploadingImages ? 'Upload en cours...' : 'Ajouter des photos'}
                </span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={uploadingImages}
                />
              </label>
            </div>
          </section>

          {/* Informations Générales */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-saas-primary-via flex items-center gap-3 uppercase tracking-[0.2em]">
              <span className="p-2 bg-saas-primary-via/10 rounded-lg">🏷️</span>
              Informations Générales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="label-saas">Marque</label>
                <input name="brand" value={formData.brand} onChange={handleChange} className="input-saas" placeholder="ex: Mercedes-Benz" />
              </div>
              <div className="space-y-2">
                <label className="label-saas">Modèle</label>
                <input name="model" value={formData.model} onChange={handleChange} className="input-saas" placeholder="ex: S-Class" />
              </div>
              <div className="space-y-2">
                <label className="label-saas">Immatriculation</label>
                <input name="registration" value={formData.registration} onChange={handleChange} className="input-saas" placeholder="ex: 12345-123-16" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-saas">Année</label>
                  <input name="year" type="number" value={formData.year} onChange={handleChange} className="input-saas" />
                </div>
                <div className="space-y-2">
                  <label className="label-saas">Couleur</label>
                  <input name="color" value={formData.color} onChange={handleChange} className="input-saas" placeholder="ex: Obsidian Black" />
                </div>
              </div>
            </div>
          </section>

          {/* Fiche Technique */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-saas-primary-via flex items-center gap-3 uppercase tracking-[0.2em]">
              <span className="p-2 bg-saas-primary-via/10 rounded-lg">⚙️</span>
              Fiche Technique
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="label-saas">Énergie</label>
                <select name="energy" value={formData.energy} onChange={handleChange} className="input-saas">
                  <option>Essence</option>
                  <option>Diesel</option>
                  <option>Hybride</option>
                  <option>Électrique</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="label-saas">Boîte</label>
                <select name="transmission" value={formData.transmission} onChange={handleChange} className="input-saas">
                  <option>Manuelle</option>
                  <option>Automatique</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="label-saas">Places</label>
                <input name="seats" type="number" value={formData.seats} onChange={handleChange} className="input-saas" />
              </div>
              <div className="space-y-2">
                <label className="label-saas">Kilométrage</label>
                <input name="mileage" type="number" value={formData.mileage} onChange={handleChange} className="input-saas" />
              </div>
            </div>
          </section>

          {/* Tarification & Caution */}
          <section className="space-y-6">
            <h3 className="text-xs font-black text-saas-primary-via flex items-center gap-3 uppercase tracking-[0.2em]">
              <span className="p-2 bg-saas-primary-via/10 rounded-lg">💰</span>
              Tarification & Caution (DZD)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="label-saas">Prix / Jour</label>
                  <input name="priceDay" type="number" value={formData.priceDay} onChange={handleChange} className="input-saas" />
                </div>
                <div className="space-y-2">
                  <label className="label-saas">Prix / Semaine</label>
                  <input name="priceWeek" type="number" value={formData.priceWeek} onChange={handleChange} className="input-saas" />
                </div>
                <div className="space-y-2">
                  <label className="label-saas">Prix / Mois</label>
                  <input name="priceMonth" type="number" value={formData.priceMonth} onChange={handleChange} className="input-saas" />
                </div>
                <div className="space-y-2">
                  <label className="label-saas">Caution</label>
                  <input name="deposit" type="number" value={formData.deposit} onChange={handleChange} className="input-saas" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="label-saas">VIN (Châssis)</label>
                <input name="vin" value={formData.vin} onChange={handleChange} className="input-saas" placeholder="Numéro de châssis" />
              </div>
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-saas-border flex items-center justify-between gap-4 bg-white">
          <div>
            {car && onDelete && (
              <button 
                onClick={() => onDelete(car.id)}
                className="btn-saas-danger px-8"
                disabled={isSubmitting}
              >
                {lang === 'fr' ? 'Supprimer' : 'حذف'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="btn-saas-outline px-8"
              disabled={isSubmitting}
            >
              {lang === 'fr' ? 'Annuler' : 'إلغاء'}
            </button>
            <button 
              onClick={handleSave}
              disabled={isSubmitting || uploadingImages}
              className="btn-saas-primary px-12 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {lang === 'fr' ? 'Enregistrement...' : 'جاري الحفظ...'}
                </>
              ) : (
                lang === 'fr' ? 'Enregistrer le véhicule' : 'حفظ المركبة'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
