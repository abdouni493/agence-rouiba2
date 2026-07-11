import React, { useState, useEffect } from 'react';
import { Agency, Language } from '../types';
import { AgencyCard } from './AgencyCard';
import { AgencyModal } from './AgencyModal';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseService } from '../services/DatabaseService';

interface AgenciesPageProps {
  lang: Language;
}

export const AgenciesPage: React.FC<AgenciesPageProps> = ({ lang }) => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<Agency | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agency.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = await DatabaseService.getAgencies();
        setAgencies(list);
      } catch (err) {
        console.error('Failed to load agencies', err);
        setError('Impossible de charger les agences');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAddAgency = () => {
    setSelectedAgency(undefined);
    setIsModalOpen(true);
  };

  const handleEditAgency = (agency: Agency) => {
    setSelectedAgency(agency);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        await DatabaseService.deleteAgency(deleteTarget);
        setAgencies(prev => prev.filter(a => a.id !== deleteTarget));
      } catch (err) {
        console.error('Failed to delete agency', err);
        setError('Erreur lors de la suppression');
      }
      setDeleteTarget(null);
    }
  };

  const handleSaveAgency = async (agencyData: Partial<Agency>) => {
    try {
      if (selectedAgency) {
        const updated = await DatabaseService.updateAgency(selectedAgency.id, agencyData as Partial<Agency>);
        setAgencies(prev => prev.map(a => (a.id === updated.id ? updated : a)));
      } else {
        const created = await DatabaseService.createAgency(agencyData as Omit<Agency, 'id' | 'created_at'>);
        setAgencies(prev => [...prev, created]);
      }
    } catch (err) {
      console.error('Error saving agency', err);
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsModalOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-800 p-3 rounded-xl mt-2">
            {error}
          </div>
        )}
        {loading && (
          <div className="text-center text-saas-text-muted py-4">
            Chargement des agences...
          </div>
        )}
        <h2 className="text-3xl font-black text-saas-text-main uppercase tracking-tighter">
          🏢 {lang === 'fr' ? 'Agences' : 'الوكالات'}
        </h2>
        <p className="text-saas-text-muted font-bold uppercase text-[10px] tracking-widest">
          {lang === 'fr' 
            ? 'Gestion des agences de location' 
            : 'إدارة وكالات الإيجار'}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-3 text-saas-text-muted" size={18} />
          <input
            type="text"
            placeholder={lang === 'fr' ? 'Rechercher une agence...' : 'ابحث عن وكالة...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-saas pl-10"
          />
        </div>
        <button
          onClick={handleAddAgency}
          className="btn-saas-primary whitespace-nowrap"
        >
          <Plus size={18} />
          {lang === 'fr' ? 'Nouvelle Agence' : 'وكالة جديدة'}
        </button>
      </div>

      {/* Agencies Grid */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredAgencies.length > 0 ? (
            filteredAgencies.map((agency) => (
              <AgencyCard
                key={agency.id}
                agency={agency}
                lang={lang}
                onEdit={() => handleEditAgency(agency)}
                onDelete={() => handleDeleteClick(agency.id)}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="col-span-full glass-card p-12 flex items-center justify-center text-center"
            >
              <div className="space-y-4">
                <div className="text-6xl opacity-30">🏢</div>
                <p className="text-saas-text-muted font-semibold">
                  {lang === 'fr' ? 'Aucune agence trouvée' : 'لم يتم العثور على وكالات'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modals */}
      <AgencyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAgency}
        agency={selectedAgency}
        lang={lang}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={{
          fr: '🗑️ Supprimer Agence',
          ar: '🗑️ حذف الوكالة',
        }}
        message={{
          fr: 'Êtes-vous certain de vouloir supprimer cette agence ? Cette action est irréversible.',
          ar: 'هل تريد بالتأكيد حذف هذه الوكالة؟ هذا الإجراء غير قابل للعكس.',
        }}
        lang={lang}
      />
    </div>
  );
};
