import React, { useState, useEffect } from 'react';
import { Worker, Language } from '../types';
import { WorkerCard } from './WorkerCard';
import { WorkerModal } from './WorkerModal';
import { WorkerDetailsModal } from './WorkerDetailsModal';
import { WorkerPaymentModal } from './WorkerPaymentModal';
import { WorkerAdvanceModal } from './WorkerAdvanceModal';
import { WorkerAbsenceModal } from './WorkerAbsenceModal';
import { WorkerHistoryModal } from './WorkerHistoryModal';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseService } from '../services/DatabaseService';

interface EquipePageProps {
  lang: Language;
}

const INITIAL_WORKERS: Worker[] = [
  {
    id: '1',
    fullName: 'Ahmed Boudjellal',
    dateOfBirth: '1990-05-15',
    phone: '+213 5 1234 5678',
    email: 'ahmed.boudjellal@email.com',
    address: 'Alger, Algeria',
    profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    type: 'driver',
    paymentType: 'daily',
    baseSalary: 3500,
    username: 'ahmed.boudj',
    password: 'SecurePass123',
    advances: [
      { id: '1', amount: 500, date: '2026-02-15', note: 'Emergency' },
      { id: '2', amount: 300, date: '2026-02-28', note: '' },
    ],
    absences: [
      { id: '1', cost: 350, date: '2026-03-01', note: 'Sick leave' },
      { id: '2', cost: 350, date: '2026-03-02', note: '' },
    ],
    payments: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    fullName: 'Fatima Zahra',
    dateOfBirth: '1988-03-20',
    phone: '+213 5 9876 5432',
    email: 'fatima.zahra@email.com',
    address: 'Oran, Algeria',
    profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    type: 'admin',
    paymentType: 'monthly',
    baseSalary: 45000,
    username: 'fatima.zahra',
    password: 'Admin@Pass456',
    advances: [
      { id: '1', amount: 2000, date: '2026-02-01', note: 'Salary advance' },
    ],
    absences: [],
    payments: [],
    createdAt: new Date().toISOString(),
  },
];

export const EquipePage: React.FC<EquipePageProps> = ({ lang }) => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [activeModal, setActiveModal] = useState<'details' | 'payment' | 'advance' | 'absence' | 'history' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; workerId: string | null }>({ isOpen: false, workerId: null });

  // Load workers on component mount
  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const data = await DatabaseService.getWorkers();
      setWorkers(data);
    } catch (err) {
      console.error('Error loading workers:', err);
      setError('Erreur lors du chargement des travailleurs');
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = workers.filter(w =>
    w.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveWorker = async (workerData: Partial<Worker>): Promise<void> => {
    try {
      if (editingWorker) {
        // Edit existing
        const updated = await DatabaseService.updateWorker(editingWorker.id, workerData);
        setWorkers(workers.map(w => w.id === updated.id ? { ...updated, advances: w.advances, absences: w.absences, payments: w.payments } : w));
      } else {
        // Create new
        const created = await DatabaseService.createWorker(workerData as Omit<Worker, 'id' | 'createdAt' | 'advances' | 'absences' | 'payments'>);
        setWorkers(prev => [...prev, created]);
      }
      setIsModalOpen(false);
      setEditingWorker(null);
    } catch (err) {
      console.error('Error saving worker:', err);
      // Re-throw the ORIGINAL error so the modal can show a specific, useful
      // message (email already used, session expired, …) instead of a generic one.
      throw err;
    }
  };

  const handleDeleteWorker = (workerId: string) => {
    setDeleteConfirm({ isOpen: true, workerId });
  };

  // Open various modals for a selected worker
  const handleOpenModal = (
    worker: Worker,
    modal: 'details' | 'payment' | 'advance' | 'absence' | 'history'
  ) => {
    setSelectedWorker(worker);
    setActiveModal(modal);
  };

  const confirmDelete = async () => {
    if (deleteConfirm.workerId) {
      try {
        await DatabaseService.deleteWorker(deleteConfirm.workerId);
        setWorkers(workers.filter(w => w.id !== deleteConfirm.workerId));
        setDeleteConfirm({ isOpen: false, workerId: null });
      } catch (err) {
        console.error('Error deleting worker:', err);
        setError('Erreur lors de la suppression');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-saas-bg via-saas-bg-light to-saas-bg p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-black uppercase tracking-tighter text-saas-text-main mb-2 flex items-center gap-3">
            👥 {lang === 'fr' ? 'Équipe' : 'الفريق'}
          </h1>
          <p className="text-saas-text-muted text-sm font-bold uppercase tracking-widest">
            {lang === 'fr' ? 'Gestion des travailleurs' : 'إدارة العمال'}
          </p>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="text-red-500">⚠️</div>
              <p className="text-red-700 font-medium">{error}</p>
            </div>
            {error.includes('Session expirée') && (
              <button
                onClick={() => window.location.reload()}
                className="btn-saas-primary text-sm px-4 py-2"
              >
                {lang === 'fr' ? 'Se reconnecter' : 'إعادة الاتصال'}
              </button>
            )}
          </motion.div>
        )}

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-saas-text-muted" />
            <input
              type="text"
              placeholder={lang === 'fr' ? 'Rechercher un travailleur...' : 'ابحث عن عامل...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-saas-border focus:outline-none focus:border-saas-primary-via focus:ring-2 focus:ring-saas-primary-via/20 transition-all"
            />
          </div>
          <button
            onClick={() => {
              setEditingWorker(null);
              setIsModalOpen(true);
            }}
            className="btn-saas-primary px-6 py-3 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus size={20} />
            {lang === 'fr' ? 'Ajouter' : 'إضافة'}
          </button>
        </motion.div>

        {/* Workers Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-saas-primary-via" />
            <span className="ml-3 text-saas-text-muted">
              {lang === 'fr' ? 'Chargement des travailleurs...' : 'جاري تحميل العمال...'}
            </span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 font-medium mb-4">⚠️ {error}</p>
            <button
              onClick={loadWorkers}
              className="btn-saas-primary"
            >
              {lang === 'fr' ? 'Réessayer' : 'إعادة المحاولة'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              <AnimatePresence>
                {filteredWorkers.map((worker, index) => (
                  <WorkerCard
                    key={worker.id}
                    worker={worker}
                    index={index}
                    lang={lang}
                    onDetails={() => handleOpenModal(worker, 'details')}
                    onPayment={() => handleOpenModal(worker, 'payment')}
                    onAdvance={() => handleOpenModal(worker, 'advance')}
                    onAbsence={() => handleOpenModal(worker, 'absence')}
                    onHistory={() => handleOpenModal(worker, 'history')}
                    onEdit={() => {
                      setEditingWorker(worker);
                      setIsModalOpen(true);
                    }}
                    onDelete={() => handleDeleteWorker(worker.id)}
                  />
                ))}
              </AnimatePresence>
            </div>

            {filteredWorkers.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-saas-text-muted text-lg">
                  {lang === 'fr' ? 'Aucun travailleur trouvé' : 'لم يتم العثور على عامل'}
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <WorkerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingWorker(null);
        }}
        onSave={handleSaveWorker}
        worker={editingWorker || undefined}
        lang={lang}
      />

      {selectedWorker && (
        <>
          <WorkerDetailsModal
            isOpen={activeModal === 'details'}
            onClose={() => setActiveModal(null)}
            worker={selectedWorker}
            lang={lang}
          />

          <WorkerPaymentModal
            isOpen={activeModal === 'payment'}
            onClose={() => setActiveModal(null)}
            worker={selectedWorker}
            lang={lang}
            onCreatePayment={(payment) => {
              setWorkers(workers.map(w =>
                w.id === selectedWorker.id
                  ? { ...w, payments: [...w.payments, payment], advances: [], absences: [] }
                  : w
              ));
              setActiveModal(null);
            }}
          />

          <WorkerAdvanceModal
            isOpen={activeModal === 'advance'}
            onClose={() => setActiveModal(null)}
            worker={selectedWorker}
            onAddAdvance={(advance) => {
              setWorkers(workers.map(w =>
                w.id === selectedWorker.id
                  ? { ...w, advances: [...w.advances, advance] }
                  : w
              ));
              setActiveModal(null);
            }}
            lang={lang}
          />

          <WorkerAbsenceModal
            isOpen={activeModal === 'absence'}
            onClose={() => setActiveModal(null)}
            worker={selectedWorker}
            onAddAbsence={(absence) => {
              setWorkers(workers.map(w =>
                w.id === selectedWorker.id
                  ? { ...w, absences: [...w.absences, absence] }
                  : w
              ));
              setActiveModal(null);
            }}
            lang={lang}
          />

          <WorkerHistoryModal
            isOpen={activeModal === 'history'}
            onClose={() => setActiveModal(null)}
            worker={selectedWorker}
            lang={lang}
          />
        </>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={lang === 'fr' ? 'Supprimer le travailleur' : 'حذف العامل'}
        message={
          deleteConfirm.workerId
            ? `${lang === 'fr' ? 'Êtes-vous sûr de vouloir supprimer' : 'هل أنت متأكد من حذف'} ${workers.find(w => w.id === deleteConfirm.workerId)?.fullName} ? ${lang === 'fr' ? 'Cette action est irréversible.' : 'هذا الإجراء لا يمكن التراجع عنه.'}`
            : lang === 'fr'
            ? 'Êtes-vous sûr de vouloir supprimer ce travailleur ? Cette action est irréversible.'
            : 'هل أنت متأكد من حذف هذا العامل؟ هذا الإجراء لا يمكن التراجع عنه.'
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirm({ isOpen: false, workerId: null })}
        lang={lang}
      />
    </div>
  );
};
