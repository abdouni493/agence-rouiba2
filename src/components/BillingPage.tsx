import React, { useState, useEffect } from 'react';
import { Invoice, Language, ReservationDetails, DocumentType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Plus, FileText, Printer, Settings } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { DocumentTemplateEditor } from './DocumentTemplateEditor';
import { DocumentRenderer } from './DocumentRenderer';

interface BillingPageProps {
  lang: Language;
}

interface InvoiceCardProps {
  invoice: Invoice;
  lang: Language;
  onViewDetails: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  onPrint: (invoice: Invoice) => void;
}

// Mock data for invoices
const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    reservationId: 'res-001',
    clientId: 'client-001',
    clientName: 'Karim Benali',
    carId: 'car-001',
    carInfo: 'Mercedes-Benz S-Class - 12345-123-16',
    invoiceNumber: 'FACT-2024-001',
    date: '2024-03-01',
    subtotal: 125000,
    tvaAmount: 18750,
    additionalFees: 5000,
    totalAmount: 148750,
    totalPaid: 148750,
    remainingAmount: 0,
    status: 'paid',
    type: 'invoice',
    payments: [
      { id: 'pay-001', reservationId: 'res-001', amount: 148750, date: '2024-03-01', method: 'cash', note: 'Paiement complet', createdAt: '2024-03-01T10:00:00Z' }
    ],
    createdAt: '2024-03-01T10:00:00Z'
  },
  {
    id: 'inv-002',
    reservationId: 'res-002',
    clientId: 'client-002',
    clientName: 'Sofia Mansouri',
    carId: 'car-002',
    carInfo: 'Range Rover Vogue - 67890-123-16',
    invoiceNumber: 'FACT-2024-002',
    date: '2024-03-05',
    subtotal: 150000,
    tvaAmount: 22500,
    additionalFees: 0,
    totalAmount: 172500,
    totalPaid: 100000,
    remainingAmount: 72500,
    status: 'partial',
    type: 'invoice',
    payments: [
      { id: 'pay-002', reservationId: 'res-002', amount: 100000, date: '2024-03-05', method: 'card', note: 'Acompte', createdAt: '2024-03-05T14:30:00Z' }
    ],
    createdAt: '2024-03-05T14:30:00Z'
  },
  {
    id: 'quote-001',
    reservationId: 'res-003',
    clientId: 'client-003',
    clientName: 'Ahmed Zohra',
    carId: 'car-003',
    carInfo: 'BMW X5 - 11111-111-16',
    invoiceNumber: 'DEVIS-2024-001',
    date: '2024-03-07',
    subtotal: 200000,
    tvaAmount: 0,
    additionalFees: 0,
    totalAmount: 200000,
    totalPaid: 0,
    remainingAmount: 200000,
    status: 'unpaid',
    type: 'quote',
    payments: [],
    createdAt: '2024-03-07T09:15:00Z'
  }
];

const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, lang, onViewDetails, onDelete, onPrint }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-500/25';
      case 'partial': return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/25';
      case 'unpaid': return 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/25';
      default: return 'bg-gradient-to-r from-gray-500 to-slate-600 text-white shadow-gray-500/25';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return lang === 'fr' ? 'Payée' : 'مدفوعة';
      case 'partial': return lang === 'fr' ? 'Partielle' : 'جزئية';
      case 'unpaid': return lang === 'fr' ? 'Impayée' : 'غير مدفوعة';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'invoice': return lang === 'fr' ? 'Facture' : 'فاتورة';
      case 'quote': return lang === 'fr' ? 'Devis' : 'عرض أسعار';
      case 'contract': return lang === 'fr' ? 'Contrat' : 'عقد';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice': return '📄';
      case 'quote': return '📋';
      case 'contract': return '📑';
      default: return '📄';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="glass-card overflow-hidden bg-gradient-to-br from-white via-white to-slate-50/50 flex flex-col group shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/60"
    >
      {/* Header with Type Icon */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{getTypeIcon(invoice.type)}</div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">
                {invoice.invoiceNumber}
              </h3>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                {getTypeText(invoice.type)}
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase shadow-lg ${getStatusColor(invoice.status)}`}>
            {getStatusText(invoice.status)}
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Client and Car Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <span className="text-xl">👤</span>
            <div>
              <p className="font-bold text-slate-800 text-sm">{invoice.clientName}</p>
              <p className="text-xs text-slate-600 uppercase tracking-widest">
                {lang === 'fr' ? 'Client' : 'العميل'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <span className="text-xl">🚗</span>
            <div>
              <p className="font-bold text-slate-800 text-sm">{invoice.carInfo}</p>
              <p className="text-xs text-slate-600 uppercase tracking-widest">
                {lang === 'fr' ? 'Véhicule' : 'المركبة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-100">
            <span className="text-xl">📅</span>
            <div>
              <p className="font-bold text-slate-800 text-sm">
                {new Date(invoice.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}
              </p>
              <p className="text-xs text-slate-600 uppercase tracking-widest">
                {lang === 'fr' ? 'Date' : 'التاريخ'}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-medium text-sm">
              {lang === 'fr' ? 'Sous-total:' : 'المجموع الفرعي:'}
            </span>
            <span className="text-slate-800 font-bold">
              {invoice.subtotal.toLocaleString()} <span className="text-xs text-slate-500">DZD</span>
            </span>
          </div>

          {invoice.tvaAmount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium text-sm">
                TVA (19%):
              </span>
              <span className="text-slate-800 font-bold">
                {invoice.tvaAmount.toLocaleString()} <span className="text-xs text-slate-500">DZD</span>
              </span>
            </div>
          )}

          {invoice.additionalFees > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium text-sm">
                {lang === 'fr' ? 'Frais suppl.:' : 'رسوم إضافية:'}
              </span>
              <span className="text-slate-800 font-bold">
                {invoice.additionalFees.toLocaleString()} <span className="text-xs text-slate-500">DZD</span>
              </span>
            </div>
          )}

          <div className="border-t border-slate-300 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-800 font-bold text-base">
                {lang === 'fr' ? 'Total:' : 'الإجمالي:'}
              </span>
              <span className="text-blue-600 font-black text-xl tracking-tighter">
                {invoice.totalAmount.toLocaleString()} <span className="text-sm text-blue-500">DZD</span>
              </span>
            </div>
          </div>

          {invoice.remainingAmount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-red-700 font-medium text-sm">
                  {lang === 'fr' ? 'Restant à payer:' : 'المبلغ المتبقي:'}
                </span>
                <span className="text-red-600 font-bold">
                  {invoice.remainingAmount.toLocaleString()} <span className="text-xs text-red-500">DZD</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onViewDetails(invoice)}
            className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-300 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl"
            title={lang === 'fr' ? 'Voir détails' : 'عرض التفاصيل'}
          >
            <span className="text-xl">👁️</span>
            <span className="text-[9px] uppercase font-bold tracking-widest">
              {lang === 'fr' ? 'Détails' : 'تفاصيل'}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPrint(invoice)}
            className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white transition-all duration-300 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl"
            title={lang === 'fr' ? 'Imprimer' : 'طباعة'}
          >
            <span className="text-xl">🖨️</span>
            <span className="text-[9px] uppercase font-bold tracking-widest">
              {lang === 'fr' ? 'Imprimer' : 'طباعة'}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(invoice.id)}
            className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 flex flex-col items-center gap-2 shadow-lg hover:shadow-xl"
            title={lang === 'fr' ? 'Supprimer' : 'حذف'}
          >
            <span className="text-xl">🗑️</span>
            <span className="text-[9px] uppercase font-bold tracking-widest">
              {lang === 'fr' ? 'Supprimer' : 'حذف'}
            </span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export const BillingPage: React.FC<BillingPageProps> = ({ lang }) => {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'invoice' | 'quote' | 'contract'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');

  // Modal states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  
  // Document template editor states
  const [editingDocumentType, setEditingDocumentType] = useState<DocumentType | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showDocumentRenderer, setShowDocumentRenderer] = useState(false);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.carInfo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || invoice.type === filterType;
    const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsDetailsModalOpen(true);
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoiceToDelete(id);
    setIsConfirmModalOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete));
      setInvoiceToDelete(null);
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    // Determine document type from invoice
    const documentType: DocumentType = invoice.type === 'invoice' ? 'facture' : 'recu';
    setEditingDocumentType(documentType);
    setShowDocumentRenderer(true);
  };

  const handleEditTemplate = (documentType: DocumentType) => {
    setEditingDocumentType(documentType);
    setShowTemplateEditor(true);
  };

  const handleRenderDocument = (documentType: DocumentType) => {
    setEditingDocumentType(documentType);
    setShowDocumentRenderer(true);
  };

  const stats = {
    totalInvoices: invoices.length,
    totalRevenue: invoices.reduce((sum, inv) => sum + inv.totalPaid, 0),
    pendingPayments: invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
    paidInvoices: invoices.filter(inv => inv.status === 'paid').length
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
              💰 {lang === 'fr' ? 'Facturation' : 'الفواتير'}
              <div className="text-2xl opacity-80">📊</div>
            </h1>
            <p className="text-blue-100 font-bold text-sm uppercase tracking-[0.2em]">
              {lang === 'fr' ? 'Gestion professionnelle de vos documents financiers' : 'إدارة احترافية لوثائقك المالية'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-white transition-colors" size={20} />
              <input
                type="text"
                placeholder={lang === 'fr' ? 'Rechercher une facture...' : 'البحث عن فاتورة...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl outline-none focus:border-white/40 focus:bg-white/15 text-white placeholder-blue-200 transition-all font-medium text-sm w-full sm:w-80 shadow-lg"
              />
            </div>

          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-bold uppercase tracking-widest">
                {lang === 'fr' ? 'Total Factures' : 'إجمالي الفواتير'}
              </p>
              <p className="text-4xl font-black text-blue-800 mt-3">{stats.totalInvoices}</p>
            </div>
            <div className="text-6xl opacity-80">📄</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-700 text-sm font-bold uppercase tracking-widest">
                {lang === 'fr' ? 'Revenus Totaux' : 'إجمالي الإيرادات'}
              </p>
              <p className="text-4xl font-black text-emerald-800 mt-3">
                {stats.totalRevenue.toLocaleString()} <span className="text-lg text-emerald-600">DZD</span>
              </p>
            </div>
            <div className="text-6xl opacity-80">💰</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-200 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-700 text-sm font-bold uppercase tracking-widest">
                {lang === 'fr' ? 'Paiements en Attente' : 'المدفوعات المعلقة'}
              </p>
              <p className="text-4xl font-black text-amber-800 mt-3">
                {stats.pendingPayments.toLocaleString()} <span className="text-lg text-amber-600">DZD</span>
              </p>
            </div>
            <div className="text-6xl opacity-80">⏳</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-bold uppercase tracking-widest">
                {lang === 'fr' ? 'Factures Payées' : 'الفواتير المدفوعة'}
              </p>
              <p className="text-4xl font-black text-green-800 mt-3">{stats.paidInvoices}</p>
            </div>
            <div className="text-6xl opacity-80">✅</div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-saas-border shadow-sm">
        <div className="flex flex-wrap gap-4 items-center">
          <span className="text-saas-text-main font-bold uppercase tracking-widest text-sm">
            {lang === 'fr' ? 'Filtres:' : 'الفلاتر:'}
          </span>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-saas-bg border border-saas-border rounded-xl outline-none focus:border-saas-primary-via transition-all font-medium text-sm"
          >
            <option value="all">{lang === 'fr' ? 'Tous les types' : 'جميع الأنواع'}</option>
            <option value="invoice">{lang === 'fr' ? 'Factures' : 'الفواتير'}</option>
            <option value="quote">{lang === 'fr' ? 'Devis' : 'عروض الأسعار'}</option>
            <option value="contract">{lang === 'fr' ? 'Contrats' : 'العقود'}</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-saas-bg border border-saas-border rounded-xl outline-none focus:border-saas-primary-via transition-all font-medium text-sm"
          >
            <option value="all">{lang === 'fr' ? 'Tous les statuts' : 'جميع الحالات'}</option>
            <option value="paid">{lang === 'fr' ? 'Payées' : 'مدفوعة'}</option>
            <option value="partial">{lang === 'fr' ? 'Partielles' : 'جزئية'}</option>
            <option value="unpaid">{lang === 'fr' ? 'Impayées' : 'غير مدفوعة'}</option>
          </select>
        </div>
      </div>

      {/* Document Template Customization */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-2xl border border-purple-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings size={20} /> {lang === 'fr' ? 'Personnalisation des Documents' : 'تخصيص المستندات'}
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['contrat', 'devis', 'facture', 'recu', 'engagement'] as const).map((docType) => (
            <motion.button
              key={docType}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleEditTemplate(docType)}
              className="px-4 py-3 bg-white border-2 border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 font-bold text-sm uppercase transition-all flex items-center justify-center gap-2"
            >
              <Settings size={16} />
              {docType === 'contrat' ? 'Contrat' : docType === 'devis' ? 'Devis' : docType === 'facture' ? 'Facture' : docType === 'recu' ? 'Reçu' : 'Engagement'}
            </motion.button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          {lang === 'fr' 
            ? '👉 Cliquez sur un type de document pour personnaliser son layout, les couleurs et les tailles de police.'
            : '👉 انقر على نوع مستند لتخصيص التخطيط والألوان وأحجام الخطوط.'}
        </p>
      </div>

      {/* Invoices Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredInvoices.map(invoice => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            lang={lang}
            onViewDetails={handleViewDetails}
            onDelete={handleDeleteInvoice}
            onPrint={handlePrintInvoice}
          />
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400 font-medium">
            {lang === 'fr' ? 'Aucune facture trouvée.' : 'لم يتم العثور على فواتير.'}
          </p>
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        title={{
          fr: 'Confirmation de suppression',
          ar: 'تأكيد الحذف'
        }}
        message={{
          fr: 'Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.',
          ar: 'هل أنت متأكد من رغبتك في حذف هذه الفاتورة؟ هذا الإجراء لا يمكن التراجع عنه.'
        }}
        lang={lang}
      />

      {/* Invoice Details Modal */}
      {isDetailsModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">
                    {selectedInvoice.type === 'invoice' ? '📄' : selectedInvoice.type === 'quote' ? '📋' : '📑'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">
                      {selectedInvoice.invoiceNumber}
                    </h2>
                    <p className="text-blue-100 font-medium">
                      {selectedInvoice.type === 'invoice' ? (lang === 'fr' ? 'Facture' : 'فاتورة') :
                       selectedInvoice.type === 'quote' ? (lang === 'fr' ? 'Devis' : 'عرض أسعار') :
                       (lang === 'fr' ? 'Contrat' : 'عقد')}
                    </p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase shadow-lg ${
                  selectedInvoice.status === 'paid' ? 'bg-green-500 text-white' :
                  selectedInvoice.status === 'partial' ? 'bg-amber-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {selectedInvoice.status === 'paid' ? (lang === 'fr' ? 'Payée' : 'مدفوعة') :
                   selectedInvoice.status === 'partial' ? (lang === 'fr' ? 'Partielle' : 'جزئية') :
                   (lang === 'fr' ? 'Impayée' : 'غير مدفوعة')}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Client Information */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                  <h3 className="text-lg font-bold text-blue-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    👤 {lang === 'fr' ? 'Informations Client' : 'معلومات العميل'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-blue-600 font-medium uppercase tracking-widest">
                        {lang === 'fr' ? 'Nom' : 'الاسم'}
                      </p>
                      <p className="text-blue-800 font-bold">{selectedInvoice.clientName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600 font-medium uppercase tracking-widest">
                        {lang === 'fr' ? 'ID Client' : 'معرف العميل'}
                      </p>
                      <p className="text-blue-800 font-bold">{selectedInvoice.clientId}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-emerald-200">
                  <h3 className="text-lg font-bold text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    🚗 {lang === 'fr' ? 'Informations Véhicule' : 'معلومات المركبة'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-emerald-600 font-medium uppercase tracking-widest">
                        {lang === 'fr' ? 'Véhicule' : 'المركبة'}
                      </p>
                      <p className="text-emerald-800 font-bold">{selectedInvoice.carInfo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-emerald-600 font-medium uppercase tracking-widest">
                        {lang === 'fr' ? 'ID Véhicule' : 'معرف المركبة'}
                      </p>
                      <p className="text-emerald-800 font-bold">{selectedInvoice.carId}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-2xl border border-purple-200">
                  <h3 className="text-lg font-bold text-purple-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    📅 {lang === 'fr' ? 'Détails Facture' : 'تفاصيل الفاتورة'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-purple-600 font-medium uppercase tracking-widest">
                        {lang === 'fr' ? 'Numéro' : 'الرقم'}
                      </p>
                      <p className="text-purple-800 font-bold">{selectedInvoice.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 font-medium uppercase tracking-widest">
                        {lang === 'fr' ? 'Date' : 'التاريخ'}
                      </p>
                      <p className="text-purple-800 font-bold">
                        {new Date(selectedInvoice.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-purple-600 font-medium uppercase tracking-widest">
                        {lang === 'fr' ? 'ID Réservation' : 'معرف الحجز'}
                      </p>
                      <p className="text-purple-800 font-bold">{selectedInvoice.reservationId}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-6 rounded-2xl border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    💰 {lang === 'fr' ? 'Résumé Financier' : 'الملخص المالي'}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">
                        {lang === 'fr' ? 'Sous-total:' : 'المجموع الفرعي:'}
                      </span>
                      <span className="text-slate-800 font-bold">
                        {selectedInvoice.subtotal.toLocaleString()} DZD
                      </span>
                    </div>
                    {selectedInvoice.tvaAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">TVA (19%):</span>
                        <span className="text-slate-800 font-bold">
                          {selectedInvoice.tvaAmount.toLocaleString()} DZD
                        </span>
                      </div>
                    )}
                    {selectedInvoice.additionalFees > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-medium">
                          {lang === 'fr' ? 'Frais suppl.:' : 'رسوم إضافية:'}
                        </span>
                        <span className="text-slate-800 font-bold">
                          {selectedInvoice.additionalFees.toLocaleString()} DZD
                        </span>
                      </div>
                    )}
                    <div className="border-t border-slate-300 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-800 font-bold text-lg">
                          {lang === 'fr' ? 'Total:' : 'الإجمالي:'}
                        </span>
                        <span className="text-blue-600 font-black text-xl">
                          {selectedInvoice.totalAmount.toLocaleString()} DZD
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">
                        {lang === 'fr' ? 'Payé:' : 'المدفوع:'}
                      </span>
                      <span className="text-green-600 font-bold">
                        {selectedInvoice.totalPaid.toLocaleString()} DZD
                      </span>
                    </div>
                    {selectedInvoice.remainingAmount > 0 && (
                      <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                        <span className="text-red-700 font-medium">
                          {lang === 'fr' ? 'Restant:' : 'المتبقي:'}
                        </span>
                        <span className="text-red-600 font-bold">
                          {selectedInvoice.remainingAmount.toLocaleString()} DZD
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment History */}
              {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-200">
                  <h3 className="text-lg font-bold text-amber-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                    📜 {lang === 'fr' ? 'Historique des Paiements' : 'تاريخ المدفوعات'}
                  </h3>
                  <div className="space-y-3">
                    {selectedInvoice.payments.map((payment, index) => (
                      <div key={payment.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">💳</div>
                          <div>
                            <p className="font-bold text-amber-800">
                              {payment.amount.toLocaleString()} DZD
                            </p>
                            <p className="text-sm text-amber-600">
                              {new Date(payment.date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-amber-600 uppercase tracking-widest">
                            {payment.method === 'cash' ? (lang === 'fr' ? 'Espèces' : 'نقدي') :
                             payment.method === 'card' ? (lang === 'fr' ? 'Carte' : 'بطاقة') :
                             payment.method}
                          </p>
                          {payment.note && (
                            <p className="text-xs text-amber-500 mt-1">{payment.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center">
              <div className="text-sm text-slate-600">
                {lang === 'fr' ? 'Créée le:' : 'تم الإنشاء في:'} {new Date(selectedInvoice.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}
              </div>
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-widest text-sm shadow-lg"
                >
                  🖨️ {lang === 'fr' ? 'Imprimer' : 'طباعة'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-6 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-all font-bold uppercase tracking-widest text-sm"
                >
                  {lang === 'fr' ? 'Fermer' : 'إغلاق'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Document Template Editor Modal */}
      <AnimatePresence>
        {showTemplateEditor && editingDocumentType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6"
            >
              <DocumentTemplateEditor
                documentType={editingDocumentType}
                reservationId={selectedInvoice?.reservationId}
                carId={selectedInvoice?.carId}
                clientId={selectedInvoice?.clientId}
                inspectionId={selectedInvoice?.inspectionId}
                onClose={() => {
                  setShowTemplateEditor(false);
                  setEditingDocumentType(null);
                }}
                onSave={() => {
                  // Reload templates if needed
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Renderer Modal */}
      <AnimatePresence>
        {showDocumentRenderer && editingDocumentType && selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  Preview: {editingDocumentType.toUpperCase()}
                </h2>
                <button
                  onClick={() => {
                    setShowDocumentRenderer(false);
                    setEditingDocumentType(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <DocumentRenderer
                documentType={editingDocumentType}
                invoice={selectedInvoice}
                onEditTemplate={() => {
                  setShowDocumentRenderer(false);
                  setShowTemplateEditor(true);
                }}
                lang={lang}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
