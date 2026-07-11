import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, ConciergeBell, Plus, Pencil, Trash2, X, Check, Loader2, Tag, Package,
} from 'lucide-react';
import { Language, ProtectionAssurance, ProtectionAssuranceItem } from '../types';
import { DatabaseService } from '../services/DatabaseService';

interface ProtectionServicesPageProps {
  lang: Language;
}

type ViewMode = 'assurances' | 'services';

// Traductions courtes
const t = (lang: Language, fr: string, ar: string) => (lang === 'fr' ? fr : ar);

const SERVICE_CATEGORIES = [
  { value: 'service', fr: 'Service', ar: 'خدمة', icon: '🛎️' },
  { value: 'decoration', fr: 'Décoration', ar: 'زينة', icon: '🎀' },
  { value: 'equipment', fr: 'Équipement', ar: 'معدات', icon: '🧰' },
  { value: 'insurance', fr: 'Assurance', ar: 'تأمين', icon: '🛡️' },
];

// NOTE : la partie "Assurances de protection" a été retirée de l'interface.
// Seule la gestion des Services est conservée. Le composant AssurancesManager
// plus bas n'est plus rendu (conservé temporairement, non référencé).
export const ProtectionServicesPage: React.FC<ProtectionServicesPageProps> = ({ lang }) => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-saas-text-main uppercase tracking-tighter">
          🛎️ {t(lang, 'Services', 'الخدمات')}
        </h2>
        <p className="text-saas-text-muted font-bold uppercase text-[10px] tracking-widest">
          {t(lang, 'Gérez vos services supplémentaires', 'إدارة الخدمات الإضافية')}
        </p>
      </div>

      <ServicesManager lang={lang} />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ASSURANCES DE PROTECTION
// ════════════════════════════════════════════════════════════════════════════

const AssurancesManager: React.FC<{ lang: Language }> = ({ lang }) => {
  const [assurances, setAssurances] = useState<ProtectionAssurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProtectionAssurance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getProtectionAssurances(true);
      setAssurances(data);
    } catch (err) {
      console.error('Error loading assurances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await DatabaseService.deleteProtectionAssurance(deleteId);
      setAssurances(prev => prev.filter(a => a.id !== deleteId));
    } catch (err) {
      console.error('Error deleting assurance:', err);
      alert(t(lang, 'Erreur lors de la suppression', 'خطأ أثناء الحذف'));
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-saas-text-muted text-sm font-bold">
          {assurances.length} {t(lang, 'forfait(s)', 'باقة')}
        </p>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-saas-primary">
          <Plus size={18} /> {t(lang, 'Nouvelle assurance', 'تأمين جديد')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-saas-primary-via" size={32} />
        </div>
      ) : assurances.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl opacity-20 mb-4">🛡️</div>
          <p className="text-saas-text-main font-black text-lg">
            {t(lang, 'Aucune assurance de protection', 'لا توجد تأمينات حماية')}
          </p>
          <p className="text-saas-text-muted text-sm mt-2">
            {t(lang, 'Créez votre premier forfait pour le proposer lors des réservations', 'أنشئ أول باقة لعرضها عند الحجز')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {assurances.map(a => (
            <AssuranceCard
              key={a.id}
              lang={lang}
              assurance={a}
              onEdit={() => { setEditing(a); setShowForm(true); }}
              onDelete={() => setDeleteId(a.id)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <AssuranceFormModal
            lang={lang}
            editing={editing}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); load(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <ConfirmDeleteModal
            lang={lang}
            message={t(lang, 'Supprimer cette assurance de protection ?', 'حذف تأمين الحماية هذا؟')}
            onCancel={() => setDeleteId(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const AssuranceCard: React.FC<{
  lang: Language;
  assurance: ProtectionAssurance;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ lang, assurance, onEdit, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-6 flex flex-col"
  >
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-xl bg-saas-primary-via/10 flex items-center justify-center flex-shrink-0">
          <Shield className="text-saas-primary-via" size={22} />
        </div>
        <div className="min-w-0">
          <h3 className="font-black text-saas-text-main truncate">{assurance.name}</h3>
          <p className="text-saas-primary-via font-black text-sm">
            {assurance.pricePerDay.toLocaleString()} {t(lang, 'DA / jour', 'د.ج / يوم')}
          </p>
        </div>
      </div>
      {!assurance.isActive && (
        <span className="text-[9px] font-bold uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-500">
          {t(lang, 'Inactif', 'غير نشط')}
        </span>
      )}
    </div>

    {/* Items list with true/false status */}
    <div className="flex-1 space-y-2 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-saas-text-muted">
        {t(lang, 'Éléments couverts', 'العناصر المشمولة')}
      </p>
      {assurance.items.length === 0 ? (
        <p className="text-saas-text-muted text-xs italic">{t(lang, 'Aucun élément', 'لا عناصر')}</p>
      ) : (
        <ul className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
          {assurance.items.map(item => (
            <li key={item.linkId || item.itemId} className="flex items-center gap-2 text-sm">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                item.status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
              }`}>
                {item.status ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
              </span>
              <span className={item.status ? 'text-saas-text-main' : 'text-saas-text-muted line-through'}>
                {item.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>

    <div className="flex gap-2 pt-4 border-t border-saas-border">
      <button onClick={onEdit} className="btn-saas-outline flex-1 py-2 text-sm">
        <Pencil size={15} /> {t(lang, 'Modifier', 'تعديل')}
      </button>
      <button
        onClick={onDelete}
        className="px-3 py-2 rounded-xl bg-saas-danger-start/5 hover:bg-saas-danger-start hover:text-white text-saas-danger-start transition-all border border-saas-danger-start/10"
        title={t(lang, 'Supprimer', 'حذف')}
      >
        <Trash2 size={16} />
      </button>
    </div>
  </motion.div>
);

// Form modal: create / edit an assurance, its price, items checklist + inline new items
const AssuranceFormModal: React.FC<{
  lang: Language;
  editing: ProtectionAssurance | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ lang, editing, onClose, onSaved }) => {
  const [name, setName] = useState(editing?.name || '');
  const [pricePerDay, setPricePerDay] = useState<number | ''>(editing?.pricePerDay ?? '');
  const [isActive, setIsActive] = useState(editing?.isActive ?? true);
  // Every master item shown as a toggle. rows: { itemId, name, status }
  const [rows, setRows] = useState<{ itemId: string; name: string; status: boolean }[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [loadingItems, setLoadingItems] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  // Load master items and merge with the editing assurance's statuses
  const loadItems = async () => {
    try {
      setLoadingItems(true);
      const master = await DatabaseService.getProtectionAssuranceItems();
      const editMap = new Map<string, boolean>(
        (editing?.items || []).map((it: ProtectionAssuranceItem) => [it.itemId, it.status])
      );
      setRows(master.map((m: any) => ({
        itemId: m.id,
        name: m.name,
        // When editing: keep saved status. New assurance: default all true (covered).
        status: editing ? (editMap.get(m.id) ?? false) : true,
      })));
    } catch (err) {
      console.error('Error loading master items:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => { loadItems(); /* eslint-disable-next-line */ }, []);

  const toggleRow = (itemId: string) => {
    setRows(prev => prev.map(r => r.itemId === itemId ? { ...r, status: !r.status } : r));
  };

  const handleAddItem = async () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    try {
      setAddingItem(true);
      const created = await DatabaseService.createProtectionAssuranceItem(trimmed, rows.length);
      setRows(prev => [...prev, { itemId: created.id, name: created.name, status: true }]);
      setNewItemName('');
    } catch (err) {
      console.error('Error creating item:', err);
      alert(t(lang, "Erreur lors de la création de l'élément", 'خطأ أثناء إنشاء العنصر'));
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm(t(lang, 'Supprimer cet élément de la liste maîtresse ?', 'حذف هذا العنصر من القائمة الرئيسية؟'))) return;
    try {
      await DatabaseService.deleteProtectionAssuranceItem(itemId);
      setRows(prev => prev.filter(r => r.itemId !== itemId));
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert(t(lang, 'Veuillez saisir un nom', 'يرجى إدخال اسم'));
      return;
    }
    const price = pricePerDay === '' ? 0 : Number(pricePerDay);
    const items = rows.map(r => ({ itemId: r.itemId, status: r.status }));
    try {
      setSaving(true);
      if (editing) {
        await DatabaseService.updateProtectionAssurance(editing.id, {
          name: name.trim(), pricePerDay: price, isActive, items,
        });
      } else {
        await DatabaseService.createProtectionAssurance({ name: name.trim(), pricePerDay: price, items });
      }
      onSaved();
    } catch (err) {
      console.error('Error saving assurance:', err);
      alert(t(lang, "Erreur lors de l'enregistrement", 'خطأ أثناء الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-saas-text-main flex items-center gap-2">
          <Shield className="text-saas-primary-via" size={22} />
          {editing ? t(lang, "Modifier l'assurance", 'تعديل التأمين') : t(lang, 'Nouvelle assurance', 'تأمين جديد')}
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-saas-bg rounded-lg text-saas-text-muted">
          <X size={20} />
        </button>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-saas">{t(lang, "Nom de l'assurance", 'اسم التأمين')}</label>
            <input
              className="input-saas"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t(lang, 'Ex : Protection Premium', 'مثال: حماية ممتازة')}
            />
          </div>
          <div>
            <label className="label-saas">{t(lang, 'Prix par jour (DA)', 'السعر لليوم (د.ج)')}</label>
            <input
              type="number"
              min={0}
              className="input-saas"
              value={pricePerDay}
              onChange={e => setPricePerDay(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
            />
          </div>
        </div>

        {editing && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 accent-saas-primary-via" />
            <span className="text-sm font-bold text-saas-text-main">{t(lang, 'Actif (proposé lors des réservations)', 'نشط (يُعرض عند الحجز)')}</span>
          </label>
        )}

        {/* Items checklist */}
        <div>
          <label className="label-saas flex items-center gap-1.5">
            <Package size={13} /> {t(lang, 'Éléments de la protection', 'عناصر الحماية')}
          </label>
          <p className="text-[11px] text-saas-text-muted mb-3">
            {t(lang, 'Cochez les éléments couverts (vrai). Les décochés apparaîtront comme non couverts (faux).', 'حدد العناصر المشمولة (صحيح). غير المحددة ستظهر كغير مشمولة (خطأ).')}
          </p>

          {loadingItems ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-saas-primary-via" size={24} /></div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1 mb-3">
              {rows.length === 0 && (
                <p className="text-saas-text-muted text-sm italic py-2">{t(lang, 'Aucun élément — ajoutez-en ci-dessous', 'لا عناصر — أضف أدناه')}</p>
              )}
              {rows.map(row => (
                <div key={row.itemId} className="flex items-center gap-3 p-3 rounded-xl bg-saas-bg border border-saas-border">
                  <button
                    type="button"
                    onClick={() => toggleRow(row.itemId)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                      row.status ? 'bg-green-500 text-white' : 'bg-white border-2 border-saas-border text-transparent'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <span className={`flex-1 text-sm font-medium ${row.status ? 'text-saas-text-main' : 'text-saas-text-muted'}`}>
                    {row.name}
                  </span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    row.status ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                  }`}>
                    {row.status ? t(lang, 'Vrai', 'صحيح') : t(lang, 'Faux', 'خطأ')}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(row.itemId)}
                    className="text-saas-text-muted hover:text-saas-danger-start p-1"
                    title={t(lang, 'Supprimer', 'حذف')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Inline new item creation */}
          <div className="flex gap-2">
            <input
              className="input-saas flex-1"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem(); } }}
              placeholder={t(lang, 'Nouvel élément (ex : Bris de glace)', 'عنصر جديد (مثال: كسر الزجاج)')}
            />
            <button
              type="button"
              onClick={handleAddItem}
              disabled={addingItem || !newItemName.trim()}
              className="btn-saas-secondary px-4 disabled:opacity-50"
            >
              {addingItem ? <Loader2 className="animate-spin" size={16} /> : <Plus size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8 pt-5 border-t border-saas-border">
        <button onClick={onClose} className="btn-saas-outline flex-1">{t(lang, 'Annuler', 'إلغاء')}</button>
        <button onClick={handleSave} disabled={saving} className="btn-saas-primary flex-1 disabled:opacity-60">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          {editing ? t(lang, 'Enregistrer', 'حفظ') : t(lang, 'Créer', 'إنشاء')}
        </button>
      </div>
    </ModalShell>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// SERVICES
// ════════════════════════════════════════════════════════════════════════════

const ServicesManager: React.FC<{ lang: Language }> = ({ lang }) => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setServices(await DatabaseService.getServices());
    } catch (err) {
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await DatabaseService.deleteService(deleteId);
      setServices(prev => prev.filter(s => s.id !== deleteId));
    } catch (err) {
      console.error('Error deleting service:', err);
      alert(t(lang, 'Erreur lors de la suppression', 'خطأ أثناء الحذف'));
    } finally {
      setDeleteId(null);
    }
  };

  const catMeta = (cat: string) => SERVICE_CATEGORIES.find(c => c.value === cat) || SERVICE_CATEGORIES[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-saas-text-muted text-sm font-bold">
          {services.length} {t(lang, 'service(s)', 'خدمة')}
        </p>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-saas-primary">
          <Plus size={18} /> {t(lang, 'Nouveau service', 'خدمة جديدة')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-saas-primary-via" size={32} />
        </div>
      ) : services.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-6xl opacity-20 mb-4">🛎️</div>
          <p className="text-saas-text-main font-black text-lg">{t(lang, 'Aucun service', 'لا توجد خدمات')}</p>
          <p className="text-saas-text-muted text-sm mt-2">
            {t(lang, 'Ces services apparaîtront lors de la création des réservations', 'ستظهر هذه الخدمات عند إنشاء الحجوزات')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {services.map(s => {
            const meta = catMeta(s.category);
            return (
              <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-saas-bg flex items-center justify-center text-lg flex-shrink-0">
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-saas-text-main truncate">{s.name}</h3>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-saas-text-muted">
                        {t(lang, meta.fr, meta.ar)}
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-saas-primary-via font-black text-sm flex-shrink-0">
                    <Tag size={13} /> {Number(s.price).toLocaleString()}
                  </span>
                </div>
                {s.description && (
                  <p className="text-saas-text-muted text-xs leading-relaxed flex-1 mb-3">{s.description}</p>
                )}
                <div className="flex gap-2 pt-3 border-t border-saas-border mt-auto">
                  <button onClick={() => { setEditing(s); setShowForm(true); }} className="btn-saas-outline flex-1 py-2 text-sm">
                    <Pencil size={15} /> {t(lang, 'Modifier', 'تعديل')}
                  </button>
                  <button
                    onClick={() => setDeleteId(s.id)}
                    className="px-3 py-2 rounded-xl bg-saas-danger-start/5 hover:bg-saas-danger-start hover:text-white text-saas-danger-start transition-all border border-saas-danger-start/10"
                    title={t(lang, 'Supprimer', 'حذف')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <ServiceFormModal
            lang={lang}
            editing={editing}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); load(); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <ConfirmDeleteModal
            lang={lang}
            message={t(lang, 'Supprimer ce service ?', 'حذف هذه الخدمة؟')}
            onCancel={() => setDeleteId(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ServiceFormModal: React.FC<{
  lang: Language;
  editing: any | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ lang, editing, onClose, onSaved }) => {
  const [category, setCategory] = useState(editing?.category || 'service');
  const [name, setName] = useState(editing?.name || '');
  const [price, setPrice] = useState<number | ''>(editing?.price ?? '');
  const [description, setDescription] = useState(editing?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { alert(t(lang, 'Veuillez saisir un nom', 'يرجى إدخال اسم')); return; }
    const p = price === '' ? 0 : Number(price);
    if (p <= 0) { alert(t(lang, 'Le prix doit être supérieur à 0', 'يجب أن يكون السعر أكبر من 0')); return; }
    try {
      setSaving(true);
      if (editing) {
        await DatabaseService.updateService(editing.id, { name: name.trim(), description, price: p, isActive: true });
      } else {
        await DatabaseService.createService({ category, name: name.trim(), description, price: p });
      }
      onSaved();
    } catch (err) {
      console.error('Error saving service:', err);
      alert(t(lang, "Erreur lors de l'enregistrement", 'خطأ أثناء الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black text-saas-text-main flex items-center gap-2">
          <ConciergeBell className="text-saas-primary-via" size={22} />
          {editing ? t(lang, 'Modifier le service', 'تعديل الخدمة') : t(lang, 'Nouveau service', 'خدمة جديدة')}
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-saas-bg rounded-lg text-saas-text-muted"><X size={20} /></button>
      </div>

      <div className="space-y-5">
        <div>
          <label className="label-saas">{t(lang, 'Catégorie', 'الفئة')}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SERVICE_CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-bold transition-all ${
                  category === c.value
                    ? 'border-saas-primary-via bg-saas-primary-via/5 text-saas-primary-via'
                    : 'border-saas-border text-saas-text-muted hover:border-saas-primary-via/40'
                }`}
              >
                <span className="text-lg">{c.icon}</span>
                {t(lang, c.fr, c.ar)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label-saas">{t(lang, 'Nom du service', 'اسم الخدمة')}</label>
            <input className="input-saas" value={name} onChange={e => setName(e.target.value)}
              placeholder={t(lang, 'Ex : Siège bébé', 'مثال: مقعد أطفال')} />
          </div>
          <div>
            <label className="label-saas">{t(lang, 'Prix (DA)', 'السعر (د.ج)')}</label>
            <input type="number" min={0} className="input-saas" value={price}
              onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
          </div>
        </div>

        <div>
          <label className="label-saas">{t(lang, 'Description (optionnel)', 'الوصف (اختياري)')}</label>
          <textarea className="input-saas resize-none" rows={3} value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t(lang, 'Détails du service…', 'تفاصيل الخدمة…')} />
        </div>
      </div>

      <div className="flex gap-3 mt-8 pt-5 border-t border-saas-border">
        <button onClick={onClose} className="btn-saas-outline flex-1">{t(lang, 'Annuler', 'إلغاء')}</button>
        <button onClick={handleSave} disabled={saving} className="btn-saas-primary flex-1 disabled:opacity-60">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
          {editing ? t(lang, 'Enregistrer', 'حفظ') : t(lang, 'Créer', 'إنشاء')}
        </button>
      </div>
    </ModalShell>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Shared modal pieces
// ════════════════════════════════════════════════════════════════════════════

const ModalShell: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
      className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 custom-scrollbar"
      onClick={e => e.stopPropagation()}
    >
      {children}
    </motion.div>
  </motion.div>
);

const ConfirmDeleteModal: React.FC<{
  lang: Language;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ lang, message, onCancel, onConfirm }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    onClick={onCancel}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
      className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center"
      onClick={e => e.stopPropagation()}
    >
      <div className="text-5xl mb-4">⚠️</div>
      <h3 className="text-lg font-black text-saas-text-main mb-2">{t(lang, 'Confirmer la suppression', 'تأكيد الحذف')}</h3>
      <p className="text-saas-text-muted text-sm mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-saas-outline flex-1">{t(lang, 'Annuler', 'إلغاء')}</button>
        <button onClick={onConfirm} className="btn-saas-danger flex-1">
          <Trash2 size={16} /> {t(lang, 'Supprimer', 'حذف')}
        </button>
      </div>
    </motion.div>
  </motion.div>
);
