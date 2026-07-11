import React, { useState, useEffect } from 'react';
import { Client, Rental, Language } from '../types';
import { ClientCard } from './ClientCard';
import { ClientModal } from './ClientModal';
import { ClientDetailsModal } from './ClientDetailsModal';
import { ClientHistoryModal } from './ClientHistoryModal';
import { ConfirmModal } from './ConfirmModal';
import { Plus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DatabaseService } from '../services/DatabaseService';

interface ClientsPageProps {
  lang: Language;
  isAuthLoading?: boolean;
  user?: any;
}

// Mock rentals for history
const MOCK_RENTALS: Rental[] = [
  {
    id: '1',
    carId: '1',
    clientId: '1',
    startDate: '2024-01-15',
    endDate: '2024-01-20',
    totalCost: 125000,
    status: 'completed',
  },
  {
    id: '2',
    carId: '2',
    clientId: '1',
    startDate: '2024-02-10',
    endDate: '2024-02-15',
    totalCost: 150000,
    status: 'completed',
  },
];

export const ClientsPage: React.FC<ClientsPageProps> = ({ lang, isAuthLoading = false, user = null }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load clients from database
  useEffect(() => {
    // Skip loading if authentication is still in progress or user not available
    if (isAuthLoading) return;
    if (!user) return;

    const loadClients = async () => {
      setLoading(true);
      try {
        const list = await DatabaseService.getClients();
        setClients(list);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load clients:', err);
        if (err.message?.includes('JWT') || err.message?.includes('auth') || err.code === 'PGRST301') {
          setError('Session expirée. Veuillez vous reconnecter.');
        } else {
          setError('Impossible de charger les clients');
        }
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, [user, isAuthLoading]);

  const filteredClients = clients.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddClient = () => {
    setSelectedClient(undefined);
    setIsModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const handleViewHistory = (client: Client) => {
    setSelectedClient(client);
    setIsHistoryOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTarget(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      try {
        await DatabaseService.deleteClient(deleteTarget);
        setClients(prev => prev.filter(c => c.id !== deleteTarget));
      } catch (err) {
        console.error('Failed to delete client:', err);
        setError('Erreur lors de la suppression');
      }
      setDeleteTarget(null);
    }
  };

  const handleSaveClient = async (clientData: Partial<Client>): Promise<void> => {
    try {
      if (selectedClient) {
        // Edit existing
        const updated = await DatabaseService.updateClient(selectedClient.id, clientData);
        setClients(prev => prev.map(c => (c.id === updated.id ? updated : c)));
      } else {
        // Create new
        const created = await DatabaseService.createClient(clientData as Omit<Client, 'id' | 'created_at'>);
        setClients(prev => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving client:', err);
      throw new Error('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-saas-text-main uppercase tracking-tighter">
          👥 {lang === 'fr' ? 'Clients' : 'العملاء'}
        </h2>
        <p className="text-saas-text-muted font-bold uppercase text-[10px] tracking-widest">
          {lang === 'fr' 
            ? 'Gestion des clients et des réservations' 
            : 'إدارة العملاء والحجوزات'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between"
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-3 text-saas-text-muted" size={18} />
          <input
            type="text"
            placeholder={lang === 'fr' ? 'Rechercher un client...' : 'ابحث عن عميل...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-saas pl-10"
          />
        </div>
        <button
          onClick={handleAddClient}
          className="btn-saas-primary whitespace-nowrap"
        >
          <Plus size={18} />
          {lang === 'fr' ? 'Nouveau Client' : 'عميل جديد'}
        </button>
      </div>

      {/* Clients Grid */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                lang={lang}
                onEdit={() => handleEditClient(client)}
                onDelete={() => handleDeleteClick(client.id)}
                onViewDetails={() => handleViewDetails(client)}
                onHistory={() => handleViewHistory(client)}
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
                <div className="text-6xl opacity-30">👥</div>
                <p className="text-saas-text-muted font-semibold">
                  {lang === 'fr' ? 'Aucun client trouvé' : 'لم يتم العثور على عملاء'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modals */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveClient}
        client={selectedClient}
        lang={lang}
      />

      {selectedClient && (
        <>
          <ClientDetailsModal
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            client={selectedClient}
            lang={lang}
          />

          <ClientHistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            client={selectedClient}
            rentals={MOCK_RENTALS.filter(r => r.clientId === selectedClient.id)}
            lang={lang}
          />
        </>
      )}

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={{
          fr: '🗑️ Supprimer Client',
          ar: '🗑️ حذف العميل',
        }}
        message={{
          fr: 'Êtes-vous certain de vouloir supprimer ce client ? Cette action est irréversible.',
          ar: 'هل تريد بالتأكيد حذف هذا العميل؟ هذا الإجراء غير قابل للعكس.',
        }}
        lang={lang}
      />
    </div>
  );
};
