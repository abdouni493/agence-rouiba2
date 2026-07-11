import React, { useState, useEffect } from 'react';
import { Language, ReservationDetails, Payment, VehicleInspection, Agency } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Calendar, Clock, MapPin, Fuel, Camera, CreditCard, DollarSign, Printer, AlertTriangle, CheckCircle, XCircle, Plus, Trash2, Edit, Eye, Car as CarIcon, User, Phone, Mail, CreditCard as CardIcon, Shield, Wrench, Sofa, Sparkles, Droplets } from 'lucide-react';
import { ReservationsService } from '../services/ReservationsService';
import { DatabaseService } from '../services/DatabaseService';
import { supabase } from '../supabase';

interface ReservationDetailsViewProps {
  lang: Language;
  reservation: ReservationDetails;
  onBack: () => void;
  onUpdate?: (reservation: ReservationDetails) => void;
}

export const ReservationDetailsView: React.FC<ReservationDetailsViewProps> = ({ lang, reservation, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'financial'>('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const handleAddPayment = () => {
    setShowPaymentModal(true);
  };

  const handleSavePayment = (payment: Payment) => {
    const updatedReservation = {
      ...reservation,
      payments: [...reservation.payments, payment],
      advancePayment: reservation.advancePayment + payment.amount,
      remainingPayment: Math.max(0, reservation.remainingPayment - payment.amount)
    };
    onUpdate?.(updatedReservation);
  };

  const handleDeletePayment = (paymentId: string) => {
    const paymentToDelete = reservation.payments.find(p => p.id === paymentId);
    if (!paymentToDelete) return;

    const updatedReservation = {
      ...reservation,
      payments: reservation.payments.filter(p => p.id !== paymentId),
      advancePayment: reservation.advancePayment - paymentToDelete.amount,
      remainingPayment: reservation.remainingPayment + paymentToDelete.amount
    };
    onUpdate?.(updatedReservation);
  };

  const handlePrintPayment = (payment: Payment) => {
    // Print logic here
    console.log('Print payment:', payment);
    // You could open a print dialog or generate a PDF
  };

  const handleActivate = () => {
    setShowActivationModal(true);
  };

  const handleComplete = () => {
    setShowCompletionModal(true);
  };

  const handlePrint = (type: 'quote' | 'contract' | 'receipt' | 'versement') => {
    // Print logic here
    console.log('Print:', type);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-saas-primary-start hover:text-saas-primary-end font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            {lang === 'fr' ? 'Retour' : 'العودة'}
          </button>
          <div>
            <h2 className="text-3xl font-black text-saas-text-main uppercase tracking-tighter">
              👁️ {lang === 'fr' ? 'Détails de Réservation' : 'تفاصيل الحجز'}
            </h2>
            <p className="text-saas-text-muted font-bold uppercase text-[10px] tracking-widest">
              #{reservation.id}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handlePrint('quote')}
            className="btn-saas-primary text-sm"
          >
            📋 {lang === 'fr' ? 'Devis' : 'عرض أسعار'}
          </button>
          <button
            onClick={() => handlePrint('contract')}
            className="btn-saas-success text-sm"
          >
            📄 {lang === 'fr' ? 'Contrat' : 'عقد'}
          </button>
          <button
            onClick={() => handlePrint('versement')}
            className="btn-saas-secondary text-sm"
          >
            🧾 {lang === 'fr' ? 'Versement' : 'إيصال'}
          </button>
        </div>
      </div>

      {/* Status and Quick Actions */}
      <div className="glass-card p-6 border border-saas-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
              reservation.status === 'accepted' ? 'bg-teal-100 text-teal-800' :
              reservation.status === 'active' ? 'bg-blue-100 text-blue-800' :
              reservation.status === 'completed' ? 'bg-purple-100 text-purple-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {reservation.status === 'confirmed' ? '✅ Confirmé' :
               reservation.status === 'accepted' ? '✅ Accepté' :
               reservation.status === 'active' ? '🔄 Actif' :
               reservation.status === 'completed' ? '🏁 Terminé' :
               '⏳ En attente'}
            </span>
            <div className="text-sm text-saas-text-muted">
              <p>💰 {lang === 'fr' ? 'Total:' : 'المجموع:'} {reservation.totalPrice.toLocaleString()} {lang === 'fr' ? 'DA' : 'د.ج'}</p>
              <p>💳 {lang === 'fr' ? 'Payé:' : 'مدفوع:'} {reservation.advancePayment.toLocaleString()} {lang === 'fr' ? 'DA' : 'د.ج'}</p>
              <p>⚠️ {lang === 'fr' ? 'Reste:' : 'متبقي:'} {reservation.remainingPayment.toLocaleString()} {lang === 'fr' ? 'DA' : 'د.ج'}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {(reservation.status === 'confirmed' || reservation.status === 'accepted') && (
              <button
                onClick={handleActivate}
                className="btn-saas-success"
              >
                ✅ {lang === 'fr' ? 'Activer' : 'تفعيل'}
              </button>
            )}
            {reservation.status === 'active' && (
              <button
                onClick={handleComplete}
                className="btn-saas-secondary"
              >
                🏁 {lang === 'fr' ? 'Terminer' : 'إنهاء'}
              </button>
            )}
            <button
              onClick={handleAddPayment}
              className="btn-saas-primary"
            >
              💳 {lang === 'fr' ? 'Régler Dette' : 'تسوية الدين'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="glass-card border border-saas-border">
        <div className="flex border-b border-saas-border">
          {[
            { id: 'overview', label: lang === 'fr' ? 'Aperçu' : 'نظرة عامة', icon: '👁️' },
            { id: 'payments', label: lang === 'fr' ? 'Paiements' : 'المدفوعات', icon: '💰' },
            { id: 'financial', label: lang === 'fr' ? 'Financier' : 'المالي', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 px-6 text-center font-bold transition-colors ${
                activeTab === tab.id
                  ? 'bg-saas-primary-start/10 text-saas-primary-start border-b-2 border-saas-primary-start'
                  : 'text-saas-text-muted hover:bg-saas-bg'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab lang={lang} reservation={reservation} />}
          {activeTab === 'payments' && <PaymentsTab lang={lang} reservation={reservation} onAddPayment={handleAddPayment} onDeletePayment={handleDeletePayment} onPrintPayment={handlePrintPayment} />}
          {activeTab === 'financial' && <FinancialTab lang={lang} reservation={reservation} />}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showPaymentModal && (
          <PaymentModal lang={lang} reservation={reservation} onClose={() => setShowPaymentModal(false)} onAddPayment={handleSavePayment} />
        )}
        {showActivationModal && (
          <ActivationModal lang={lang} reservation={reservation} onClose={() => setShowActivationModal(false)} onActivate={onUpdate} />
        )}
        {showCompletionModal && (
          <CompletionModal lang={lang} reservation={reservation} onClose={() => setShowCompletionModal(false)} onComplete={onUpdate} />
        )}
      </AnimatePresence>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ lang: Language; reservation: ReservationDetails }> = ({ lang, reservation }) => (
  <div className="space-y-8">
    {/* Chronologie de la Location */}
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
      <h3 className="text-xl font-black text-slate-900 mb-6">
        📅 {lang === 'fr' ? 'Chronologie de la Location' : 'جدولة التأجير'}
      </h3>
      <div className="flex items-center justify-center gap-8">
        <div className="text-center">
          <div className="bg-blue-100 rounded-full p-4 mb-2">
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>
          <p className="font-bold text-slate-900">{lang === 'fr' ? 'Départ' : 'المغادرة'}</p>
          <p className="text-sm text-slate-600">{reservation.step1.departureDate}</p>
          <p className="text-sm text-slate-600">{reservation.step1.departureTime}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-0.5 bg-blue-300"></div>
          <Clock className="w-6 h-6 text-blue-500" />
          <div className="w-16 h-0.5 bg-blue-300"></div>
        </div>
        <div className="text-center">
          <div className="bg-green-100 rounded-full p-4 mb-2">
            <Calendar className="w-8 h-8 text-green-600" />
          </div>
          <p className="font-bold text-slate-900">{lang === 'fr' ? 'Durée' : 'المدة'}</p>
          <p className="text-sm text-slate-600">{reservation.totalDays} {lang === 'fr' ? 'jours' : 'أيام'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-0.5 bg-green-300"></div>
          <Clock className="w-6 h-6 text-green-500" />
          <div className="w-16 h-0.5 bg-green-300"></div>
        </div>
        <div className="text-center">
          <div className="bg-purple-100 rounded-full p-4 mb-2">
            <MapPin className="w-8 h-8 text-purple-600" />
          </div>
          <p className="font-bold text-slate-900">{lang === 'fr' ? 'Retour' : 'العودة'}</p>
          <p className="text-sm text-slate-600">{reservation.step1.returnDate}</p>
          <p className="text-sm text-slate-600">{reservation.step1.returnTime}</p>
        </div>
      </div>
    </div>

    {/* Client & Vehicle Info */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Client Info */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
        <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
          👤 {lang === 'fr' ? 'Locataire' : 'المستأجر'}
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {reservation.client.profilePhoto && (
              <img
                src={reservation.client.profilePhoto}
                alt={`${reservation.client.firstName} ${reservation.client.lastName}`}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <p className="font-bold text-lg">{reservation.client.firstName} {reservation.client.lastName}</p>
              <p className="text-slate-600">📱 {reservation.client.phone}</p>
              <p className="text-slate-600">📧 {reservation.client.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-slate-900">🆔 {lang === 'fr' ? 'Permis' : 'رخصة'}</p>
              <p className="text-slate-600">{reservation.client.licenseNumber}</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">🎂 {lang === 'fr' ? 'Naissance' : 'الميلاد'}</p>
              <p className="text-slate-600">{reservation.client.dateOfBirth || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
        <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
          🚗 {lang === 'fr' ? 'Véhicule' : 'المركبة'}
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <img
              src={reservation.car.images[0]}
              alt={`${reservation.car.brand} ${reservation.car.model}`}
              className="w-16 h-12 rounded-lg object-cover"
            />
            <div>
              <p className="font-bold text-lg">{reservation.car.brand} {reservation.car.model}</p>
              <p className="text-slate-600">🏷️ {reservation.car.registration}</p>
              <p className="text-slate-600">🎨 {reservation.car.color}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold text-slate-900">📅 {lang === 'fr' ? 'Année' : 'السنة'}</p>
              <p className="text-slate-600">{reservation.car.year}</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">⛽ {lang === 'fr' ? 'Carburant' : 'الوقود'}</p>
              <p className="text-slate-600">{reservation.car.energy}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Payments Tab Component
const PaymentsTab: React.FC<{ lang: Language; reservation: ReservationDetails; onAddPayment: () => void; onDeletePayment: (id: string) => void; onPrintPayment: (payment: Payment) => void }> = ({ lang, reservation, onAddPayment, onDeletePayment, onPrintPayment }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Include initial advance payment if not already in payments
  const allPayments = [
    ...(reservation.advancePayment > 0 && !reservation.payments.some(p => p.amount === reservation.advancePayment) ? [{
      id: 'initial',
      amount: reservation.advancePayment,
      method: 'cash' as const,
      date: reservation.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      note: lang === 'fr' ? 'Paiement initial' : 'الدفعة الأولية'
    }] : []),
    ...reservation.payments
  ];

  const handleDeleteClick = (paymentId: string) => {
    setShowDeleteConfirm(paymentId);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      onDeletePayment(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  return (
  <div className="space-y-6">
    {/* Payment Summary */}
    <div className="glass-card p-6 border border-saas-border">
      <h3 className="text-xl font-black text-saas-text-main mb-4">
        💰 {lang === 'fr' ? 'Détails Financiers' : 'التفاصيل المالية'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 text-center border border-saas-border">
          <p className="text-sm text-saas-text-muted">{lang === 'fr' ? 'Montant Total' : 'المبلغ الإجمالي'}</p>
          <p className="text-2xl font-black text-saas-text-main">{reservation.totalPrice.toLocaleString()} DA</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
          <p className="text-sm text-green-700">{lang === 'fr' ? 'Montant Payé' : 'المبلغ المدفوع'}</p>
          <p className="text-2xl font-black text-green-700">{reservation.advancePayment.toLocaleString()} DA</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
          <p className="text-sm text-orange-700">{lang === 'fr' ? 'Reste à Payer' : 'المبلغ المتبقي'}</p>
          <p className="text-2xl font-black text-orange-700">{reservation.remainingPayment.toLocaleString()} DA</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
          {typeof reservation.cautionEnabled === 'undefined' || reservation.cautionEnabled ? (
            <>
              <p className="text-sm text-blue-700">{lang === 'fr' ? 'Caution' : 'الضمان'}</p>
              {/* Display caution in DZD */}
              <p className="text-2xl font-black text-blue-700">
                {((reservation as any).cautionAmountDzd || reservation.deposit).toLocaleString()} DA
              </p>
              {/* Display caution in EUR if currency is EUR */}
              {(reservation as any).cautionCurrency === 'EUR' && (reservation as any).euroRate && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">
                    {lang === 'fr' ? '= ' : '= '} 
                    <span className="font-bold">
                      {(Math.round(((reservation as any).cautionAmountDzd || reservation.deposit) / (reservation as any).euroRate * 100) / 100).toFixed(2)}
                    </span> EUR
                  </p>
                  <p className="text-xs text-blue-500">
                    ({lang === 'fr' ? 'Taux' : 'السعر'}: {(reservation as any).euroRate} DA/€)
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
        {(reservation as any).assuranceEnabled && (
          <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
            <p className="text-sm text-purple-700">{lang === 'fr' ? 'Assurance' : 'التأمين'}</p>
            <p className="text-2xl font-black text-purple-700">
              {Math.round((reservation.totalPrice) * ((reservation as any).assurancePercentage || 0) / 100).toLocaleString()} DA
            </p>
            <p className="text-xs text-purple-600 mt-1">({(reservation as any).assurancePercentage}%)</p>
          </div>
        )}
      </div>
    </div>

    {/* Payment History */}
    <div className="glass-card border border-saas-border">
      <div className="p-6 border-b border-saas-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-saas-text-main">
            🧾 {lang === 'fr' ? 'Historique des Paiements' : 'سجل المدفوعات'}
          </h3>
          <button
            onClick={onAddPayment}
            className="btn-saas-primary"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            {lang === 'fr' ? 'Ajouter Paiement' : 'إضافة دفعة'}
          </button>
        </div>
      </div>
      <div className="p-6">
        {allPayments.length > 0 ? (
          <div className="space-y-4">
            {allPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 bg-saas-bg rounded-lg border border-saas-border">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 rounded-full p-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-saas-text-main">{payment.amount.toLocaleString()} DA</p>
                    <p className="text-sm text-saas-text-muted">{payment.date} • {payment.method === 'cash' ? (lang === 'fr' ? 'Espèces' : 'نقدي') : payment.method === 'card' ? (lang === 'fr' ? 'Carte' : 'بطاقة') : (lang === 'fr' ? 'Virement' : 'تحويل')}</p>
                    {payment.note && <p className="text-xs text-saas-text-muted">{payment.note}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onPrintPayment(payment)}
                    className="p-2 text-saas-primary-start hover:text-saas-primary-end transition-colors"
                    title={lang === 'fr' ? 'Imprimer' : 'طباعة'}
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  {payment.id !== 'initial' && (
                    <button
                      onClick={() => handleDeleteClick(payment.id)}
                      className="p-2 text-red-600 hover:text-red-800 transition-colors"
                      title={lang === 'fr' ? 'Supprimer' : 'حذف'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-saas-text-muted italic text-center py-8">
            {lang === 'fr' ? 'Aucun paiement enregistré' : 'لم يتم تسجيل أي دفعات'}
          </p>
        )}
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="glass-card max-w-sm w-full p-6 border border-saas-border"
        >
          <h3 className="text-lg font-black text-saas-text-main mb-4">
            ⚠️ {lang === 'fr' ? 'Confirmer la Suppression' : 'تأكيد الحذف'}
          </h3>
          <p className="text-saas-text-muted mb-6">
            {lang === 'fr' ? 'Êtes-vous sûr de vouloir supprimer ce paiement ?' : 'هل أنت متأكد من حذف هذه الدفعة؟'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="flex-1 bg-saas-bg hover:bg-saas-secondary-start/10 text-saas-text-muted font-bold py-2 px-4 rounded-lg border border-saas-border hover:border-saas-secondary-start/20 transition-all"
            >
              {lang === 'fr' ? 'Annuler' : 'إلغاء'}
            </button>
            <button
              onClick={confirmDelete}
              className="flex-1 btn-saas-danger"
            >
              🗑️ {lang === 'fr' ? 'Supprimer' : 'حذف'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </div>
);
};

// Financial Tab Component
const FinancialTab: React.FC<{ lang: Language; reservation: ReservationDetails }> = ({ lang, reservation }) => (
  <div className="space-y-6">
    {/* Pricing Breakdown */}
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
      <h3 className="text-xl font-black text-slate-900 mb-6">
        💰 {lang === 'fr' ? 'Décomposition du Tarif' : 'تفصيل الأسعار'}
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-slate-200">
          <span className="font-bold">{lang === 'fr' ? 'Location de base' : 'التأجير الأساسي'}</span>
          <span className="font-bold">{(reservation.totalPrice - reservation.additionalFees).toLocaleString()} DA</span>
        </div>
        {reservation.additionalServices.map((service: any) => (
          <div key={service.id} className="flex justify-between items-center py-2 border-b border-slate-200">
            <span>🛎️ {service.name || service.service_name}</span>
            <span>{Number(service.price).toLocaleString()} DA</span>
          </div>
        ))}
        {(reservation.protectionAssurance || reservation.protectionAssuranceName) && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200">
            <span>🛡️ {reservation.protectionAssurance?.name || reservation.protectionAssuranceName}
              {reservation.protectionAssurancePrice != null && reservation.totalDays > 0 && (
                <span className="text-slate-400 text-sm ml-1">
                  ({(reservation.protectionAssurancePrice).toLocaleString()} DA/{lang === 'fr' ? 'j' : 'ي'} × {reservation.totalDays})
                </span>
              )}
            </span>
            <span>{Math.round((reservation.protectionAssurancePrice || 0) * (reservation.totalDays || 0)).toLocaleString()} DA</span>
          </div>
        )}
        {reservation.excessMileage > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200 text-red-600">
            <span>{lang === 'fr' ? 'Kilométrage excédentaire' : 'عداد الكيلومترات الزائد'}</span>
            <span>{reservation.excessMileage.toLocaleString()} DA</span>
          </div>
        )}
        {reservation.missingFuel > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200 text-red-600">
            <span>{lang === 'fr' ? 'Carburant manquant' : 'الوقود المفقود'}</span>
            <span>{reservation.missingFuel.toLocaleString()} DA</span>
          </div>
        )}
        <div className="flex justify-between items-center py-4 border-t-2 border-slate-300 text-lg font-black">
          <span>{lang === 'fr' ? 'TOTAL GÉNÉRAL' : 'المجموع الكلي'}</span>
          <span>{(reservation.totalPrice + reservation.additionalFees).toLocaleString()} DA</span>
        </div>
      </div>
    </div>

    {/* Caution & Assurance Information */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Caution */}
      {typeof reservation.cautionEnabled === 'undefined' || reservation.cautionEnabled ? (
        <div className="bg-blue-50 rounded-2xl shadow-lg p-6 border border-blue-200">
          <h3 className="text-lg font-black text-blue-900 mb-4">🔐 {lang === 'fr' ? 'Caution' : 'الضمان'}</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-blue-200">
              <span className="text-blue-700 font-bold">{lang === 'fr' ? 'Montant (DA):' : 'المبلغ (DA):'}</span>
              <span className="font-black text-blue-900">{((reservation as any).cautionAmountDzd || reservation.deposit).toLocaleString()} DA</span>
            </div>
            {(reservation as any).cautionCurrency === 'EUR' && (reservation as any).euroRate && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-blue-200">
                  <span className="text-blue-700 font-bold">{lang === 'fr' ? 'Montant (EUR):' : 'المبلغ (EUR):'}</span>
                  <span className="font-black text-blue-900">
                    {(Math.round(((reservation as any).cautionAmountDzd || reservation.deposit) / (reservation as any).euroRate * 100) / 100).toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-blue-700 text-sm">{lang === 'fr' ? 'Taux de change:' : 'سعر الصرف:'}</span>
                  <span className="text-blue-900 text-sm font-bold">{(reservation as any).euroRate} DA/€</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* Assurance Serenity */}
      {(reservation as any).assuranceEnabled && (
        <div className="bg-purple-50 rounded-2xl shadow-lg p-6 border border-purple-200">
          <h3 className="text-lg font-black text-purple-900 mb-4">🛡️ {lang === 'fr' ? 'Assurance Serenity' : 'تأمين Serenity'}</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-purple-200">
              <span className="text-purple-700 font-bold">{lang === 'fr' ? 'Pourcentage:' : 'النسبة:'}</span>
              <span className="font-black text-purple-900">{(reservation as any).assurancePercentage || 0}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-purple-700 font-bold">{lang === 'fr' ? 'Montant:' : 'المبلغ:'}</span>
              <span className="font-black text-purple-900">{Math.round((reservation.totalPrice) * ((reservation as any).assurancePercentage || 0) / 100).toLocaleString()} DA</span>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Assurance de protection sélectionnée (forfait + éléments) */}
    {(reservation.protectionAssurance || reservation.protectionAssuranceName) && (
      <div className="bg-red-50 rounded-2xl shadow-lg p-6 border border-red-200">
        <h3 className="text-lg font-black text-red-900 mb-4">🛡️ {lang === 'fr' ? 'Assurance de Protection' : 'تأمين الحماية'}</h3>
        <div className="flex justify-between items-center py-2 border-b border-red-200 mb-3">
          <span className="font-black text-slate-900">{reservation.protectionAssurance?.name || reservation.protectionAssuranceName}</span>
          <span className="font-black text-red-700">
            {(reservation.protectionAssurancePrice || reservation.protectionAssurance?.pricePerDay || 0).toLocaleString()} DA/{lang === 'fr' ? 'jour' : 'يوم'}
          </span>
        </div>
        {reservation.protectionAssurance && reservation.protectionAssurance.items.length > 0 ? (
          <ul className="space-y-1.5">
            {reservation.protectionAssurance.items.map((item) => (
              <li key={item.linkId || item.itemId} className="flex items-center gap-2 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  {item.status ? '✓' : '✕'}
                </span>
                <span className={item.status ? 'text-slate-700' : 'text-slate-400 line-through'}>{item.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-sm italic">{lang === 'fr' ? 'Détail des éléments indisponible' : 'تفاصيل العناصر غير متوفرة'}</p>
        )}
      </div>
    )}
  </div>
);

// Modal Components
const PaymentModal: React.FC<{ lang: Language; reservation: ReservationDetails; onClose: () => void; onAddPayment: (payment: Payment) => void }> = ({ lang, reservation, onClose, onAddPayment }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [note, setNote] = useState('');

  const paymentAmount = parseFloat(amount) || 0;
  const newRemaining = Math.max(0, reservation.remainingPayment - paymentAmount);

  const handleSave = () => {
    if (paymentAmount <= 0) return;
    
    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      reservationId: reservation.id,
      amount: paymentAmount,
      method,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      note: note || undefined
    };

    onAddPayment(newPayment);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card max-w-md w-full p-6 border border-saas-border"
      >
        <h3 className="text-xl font-black text-saas-text-main mb-6">
          💳 {lang === 'fr' ? 'Ajouter un Paiement' : 'إضافة دفعة'}
        </h3>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-saas-primary-start/10 to-saas-primary-end/10 rounded-xl p-4 border border-saas-primary-start/20">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-saas-text-main">{lang === 'fr' ? 'Reste à payer:' : 'المبلغ المتبقي:'}</span>
              <span className="font-black text-saas-text-main">{reservation.remainingPayment.toLocaleString()} DA</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-saas-text-main">{lang === 'fr' ? 'Après paiement:' : 'بعد الدفع:'}</span>
              <span className={`font-black ${newRemaining === 0 ? 'text-green-600' : 'text-orange-600'}`}>{newRemaining.toLocaleString()} DA</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-saas-text-main mb-2">
              💰 {lang === 'fr' ? 'Montant' : 'المبلغ'}
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 border border-saas-border rounded-lg focus:ring-2 focus:ring-saas-primary-start focus:border-transparent"
              placeholder="0"
              min="0"
              max={reservation.remainingPayment}
            />
          </div>

          <div>
            <label className="block font-bold text-saas-text-main mb-2">
              💳 {lang === 'fr' ? 'Méthode de paiement' : 'طريقة الدفع'}
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full p-3 border border-saas-border rounded-lg focus:ring-2 focus:ring-saas-primary-start focus:border-transparent"
            >
              <option value="cash">{lang === 'fr' ? 'Espèces' : 'نقدي'}</option>
              <option value="card">{lang === 'fr' ? 'Carte' : 'بطاقة'}</option>
              <option value="transfer">{lang === 'fr' ? 'Virement' : 'تحويل'}</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-saas-text-main mb-2">
              📝 {lang === 'fr' ? 'Note (Optionnel)' : 'ملاحظة (اختياري)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 border border-saas-border rounded-lg focus:ring-2 focus:ring-saas-primary-start focus:border-transparent"
              rows={2}
              placeholder={lang === 'fr' ? 'Détails supplémentaires...' : 'تفاصيل إضافية...'}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-saas-bg hover:bg-saas-secondary-start/10 text-saas-text-muted font-bold py-3 px-4 rounded-lg border border-saas-border hover:border-saas-secondary-start/20 transition-all"
          >
            {lang === 'fr' ? 'Annuler' : 'إلغاء'}
          </button>
          <button
            onClick={handleSave}
            disabled={paymentAmount <= 0}
            className="flex-1 btn-saas-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💾 {lang === 'fr' ? 'Enregistrer' : 'حفظ'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};


export const ActivationModal: React.FC<{ lang: Language; reservation: ReservationDetails; onClose: () => void; onActivate?: (reservation: ReservationDetails) => void }> = ({ lang, reservation, onClose, onActivate }) => {
  const [mileage, setMileage] = useState(reservation.car.mileage?.toString() || '');
  const [location, setLocation] = useState(reservation.step1?.departureLocation || '');
  const [notes, setNotes] = useState('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoadingAgencies, setIsLoadingAgencies] = useState(true);

  // Load agencies on component mount
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        setIsLoadingAgencies(true);
        const data = await DatabaseService.getAgencies();
        setAgencies(data || []);
      } catch (err) {
        console.error('Error loading agencies:', err);
        setAgencies([]);
      } finally {
        setIsLoadingAgencies(false);
      }
    };

    loadAgencies();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[95vh] overflow-y-auto"
      >
        <h3 className="text-2xl font-black text-saas-text-main mb-6">
          ✅ {lang === 'fr' ? 'Activer la Location' : 'تفعيل التأجير'}
        </h3>

        <div className="space-y-8">
          {/* CAR INFORMATION SECTION */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
            <h4 className="text-lg font-black text-saas-text-main mb-4">
              🚗 {lang === 'fr' ? 'Informations du Véhicule' : 'معلومات المركبة'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-bold text-saas-text-muted uppercase tracking-widest mb-1">
                  {lang === 'fr' ? 'Marque & Modèle' : 'الماركة والموديل'}
                </p>
                <p className="text-lg font-bold text-saas-text-main">
                  {reservation.car.brand} {reservation.car.model}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-saas-text-muted uppercase tracking-widest mb-1">
                  {lang === 'fr' ? 'Couleur' : 'اللون'}
                </p>
                <p className="text-lg font-bold text-saas-text-main">
                  {reservation.car.color}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-saas-text-muted uppercase tracking-widest mb-1">
                  {lang === 'fr' ? 'Immatriculation' : 'لوحة الترخيص'}
                </p>
                <p className="text-lg font-bold text-saas-text-main font-mono">
                  {reservation.car.registration}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-saas-text-muted uppercase tracking-widest mb-1">
                  {lang === 'fr' ? 'VIN' : 'رقم VIN'}
                </p>
                <p className="text-lg font-bold text-saas-text-main font-mono">
                  {reservation.car.vin || 'N/A'}
                </p>
              </div>
            </div>

            {/* Car Images Display */}
            {reservation.car.images && reservation.car.images.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-saas-text-muted uppercase tracking-widest mb-3">
                  {lang === 'fr' ? 'Photos du Véhicule' : 'صور المركبة'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {reservation.car.images.slice(0, 4).map((image, idx) => (
                    <img
                      key={idx}
                      src={image}
                      alt={`Car ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg border border-blue-200"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* DEPARTURE INSPECTION DETAILS */}
          <div className="text-center bg-gradient-to-r from-saas-primary-start/10 to-saas-primary-end/10 rounded-xl p-4 border border-saas-primary-start/20">
            <h4 className="text-lg font-black text-saas-text-main mb-2">
              🧭 {lang === 'fr' ? 'Détails du Départ' : 'تفاصيل المغادرة'}
            </h4>
            <p className="text-saas-text-muted">
              {lang === 'fr' ? 'Confirmez les informations de départ du véhicule' : 'تأكيد معلومات مغادرة المركبة'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-bold text-saas-text-main mb-2">
                🧭 {lang === 'fr' ? 'Kilométrage au départ' : 'عداد الكيلومترات عند المغادرة'}
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-saas-primary-start focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block font-bold text-saas-text-main mb-2">
                📍 {lang === 'fr' ? 'Lieu de prise en charge' : 'مكان الاستلام'}
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isLoadingAgencies}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-saas-primary-start focus:border-transparent disabled:bg-slate-100"
              >
                <option value="">
                  {isLoadingAgencies
                    ? (lang === 'fr' ? 'Chargement des agences...' : 'جاري تحميل الوكالات...')
                    : (lang === 'fr' ? 'Sélectionner une agence...' : 'اختر وكالة...')}
                </option>
                {agencies.map(agency => (
                  <option key={agency.id} value={agency.name}>
                    {agency.name} {agency.city ? `(${agency.city})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-saas-text-main mb-2">
              📝 {lang === 'fr' ? 'Notes rapides' : 'ملاحظات سريعة'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-saas-primary-start focus:border-transparent"
              rows={3}
              placeholder={lang === 'fr' ? 'Ex: Petit éraflure sur portière droite' : 'مثال: خدش صغير على الباب الأيمن'}
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {lang === 'fr' ? 'Annuler' : 'إلغاء'}
          </button>
          <button
            onClick={async () => {
              try {
                await ReservationsService.activateReservation(reservation.id);

                // Update car mileage (needed for maintenance/vidange alerts)
                await supabase
                  .from('cars')
                  .update({
                    mileage: parseInt(mileage)
                  })
                  .eq('id', reservation.car.id);

                // Update the local reservation state
                const updatedReservation = {
                  ...reservation,
                  status: 'active' as const,
                  activatedAt: new Date().toISOString(),
                  car: { ...reservation.car, mileage: parseInt(mileage) },
                };

                onActivate?.(updatedReservation);
                onClose();
              } catch (error) {
                console.error('Error activating reservation:', error);
                alert(lang === 'fr' ? 'Erreur lors de l\'activation: ' + (error as any).message : 'خطأ في التفعيل: ' + (error as any).message);
              }
            }}
            className="flex-1 btn-saas-primary py-3"
          >
            ✅ {lang === 'fr' ? 'Confirmer et Activer' : 'تأكيد وتفعيل'}
          </button>
        </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const CompletionModal: React.FC<{ lang: Language; reservation: ReservationDetails; onClose: () => void; onComplete?: (reservation: ReservationDetails) => void }> = ({ lang, reservation, onClose, onComplete }) => {
  const [returnMileage, setReturnMileage] = useState('');
  const [returnDate, setReturnDate] = useState(reservation.step1.returnDate);
  const [returnTime, setReturnTime] = useState(reservation.step1.returnTime);
  const [excessMileage, setExcessMileage] = useState('');
  const [documentsRecovered, setDocumentsRecovered] = useState(true);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalDistance = returnMileage && reservation.car.mileage
    ? parseInt(returnMileage) - reservation.car.mileage
    : 0;

  const totalFees = parseFloat(excessMileage) || 0;

  const handleComplete = async () => {
    try {
      // Validate required fields
      if (!returnMileage || returnMileage.trim() === '') {
        const msg = lang === 'fr' ? 'Le kilométrage de retour est obligatoire' : 'عداد العودة مطلوب';
        setErrorMessage(msg);
        console.warn('Validation: Missing return mileage');
        return;
      }

      if (isNaN(parseInt(returnMileage))) {
        const msg = lang === 'fr' ? 'Le kilométrage doit être un nombre valide' : 'العداد يجب أن يكون رقم صحيح';
        setErrorMessage(msg);
        console.warn('Validation: Invalid return mileage');
        return;
      }

      setErrorMessage(null);
      setIsLoading(true);

      console.log('🟢 Starting reservation completion for:', reservation.id);

      await ReservationsService.completeReservation({
        reservationId: reservation.id,
        carId: reservation.carId,
        returnMileage: parseInt(returnMileage),
        excessMileage: parseFloat(excessMileage) || 0,
        notes: notes,
      });

      console.log('🟢 Reservation completion successful, updating car info...');

      // Update car mileage (needed for maintenance/vidange alerts)
      const { error: carError } = await supabase
        .from('cars')
        .update({
          mileage: parseInt(returnMileage)
        })
        .eq('id', reservation.car.id);

      if (carError) {
        console.error('❌ Car update error:', carError);
        throw new Error(`Car update failed: ${carError.message}`);
      }

      console.log('🟢 Car info updated successfully');

      // Update the local reservation state
      const updatedReservation = {
        ...reservation,
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
        car: { ...reservation.car, mileage: parseInt(returnMileage) },
        excessMileage: parseFloat(excessMileage) || 0,
        missingFuel: 0,
        additionalFees: totalFees,
        notes: notes
      };

      console.log('🟢 Reservation completed successfully');
      onComplete?.(updatedReservation);
      onClose();
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      console.error('❌ Error completing reservation:', error);
      console.error('Error details:', {
        message: errorMsg,
        code: error?.code,
        details: error?.details
      });

      // Provide user-friendly error message
      let userMessage = lang === 'fr' 
        ? 'Erreur lors de la finalisation de la location'
        : 'خطأ في إنهاء التأجير';

      if (errorMsg.includes('permission') || errorMsg.includes('Policy')) {
        userMessage = lang === 'fr'
          ? 'Vous n\'avez pas la permission d\'effectuer cette action. Veuillez contacter l\'administrateur.'
          : 'ليس لديك صلاحية لإجراء هذا الإجراء. يرجى الاتصال بالمسؤول.';
      } else if (errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
        userMessage = lang === 'fr'
          ? 'La réservation n\'existe pas ou a été supprimée'
          : 'التأجير غير موجود أو تم حذفه';
      }

      setErrorMessage(`${userMessage}: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-2xl font-black text-saas-text-main mb-6">
          🏁 {lang === 'fr' ? 'Terminer la Location' : 'إنهاء التأجير'}
        </h3>

        <div className="space-y-6">
          {/* Car Information */}
          <div className="bg-gradient-to-r from-saas-primary-start/10 to-saas-primary-end/10 rounded-xl p-4 border border-saas-primary-start/20">
            <h4 className="text-lg font-black text-saas-text-main mb-4">
              🚗 {lang === 'fr' ? 'Informations du Véhicule' : 'معلومات المركبة'}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-bold text-saas-text-main">{reservation.car.brand} {reservation.car.model}</p>
                <p className="text-saas-text-muted">{reservation.car.registration}</p>
              </div>
              <div>
                <p className="font-bold text-saas-text-main">{lang === 'fr' ? 'Couleur' : 'اللون'}</p>
                <p className="text-saas-text-muted">{reservation.car.color}</p>
              </div>
              <div>
                <p className="font-bold text-saas-text-main">{lang === 'fr' ? 'Énergie' : 'الطاقة'}</p>
                <p className="text-saas-text-muted">{reservation.car.energy}</p>
              </div>
              <div>
                <p className="font-bold text-saas-text-main">{lang === 'fr' ? 'Kilométrage Actuel' : 'العداد الحالي'}</p>
                <p className="text-saas-text-muted">{(reservation.car.mileage || 0).toLocaleString()} km</p>
              </div>
            </div>
          </div>

          {/* KM Tracking */}
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
            <h4 className="text-lg font-black text-blue-900 mb-4">
              🧭 {lang === 'fr' ? 'Kilométrage au Départ (Check-in)' : 'عداد الكيلومترات عند المغادرة (الدخول)'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-blue-900 mb-2">
                  {lang === 'fr' ? 'Kilométrage au Départ' : 'عداد المغادرة'}
                </label>
                <input
                  type="number"
                  value={reservation.car.mileage || ''}
                  className="w-full p-3 border border-blue-200 rounded-lg bg-slate-100"
                  readOnly
                />
              </div>
              <div>
                <label className="block font-bold text-blue-900 mb-2">
                  {lang === 'fr' ? 'Kilométrage de Retour (Entrée Requise)' : 'عداد العودة (إدخال مطلوب)'}
                </label>
                <input
                  type="number"
                  value={returnMileage}
                  onChange={(e) => setReturnMileage(e.target.value)}
                  className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-blue-900 mb-2">
                  {lang === 'fr' ? 'Distance Totale Parcourue' : 'المسافة الإجمالية المقطوعة'}
                </label>
                <input
                  type="number"
                  value={totalDistance}
                  className="w-full p-3 border border-blue-200 rounded-lg bg-slate-100"
                  readOnly
                />
              </div>
            </div>
          </div>

          {/* Dates and Times */}
          <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
            <h4 className="text-lg font-black text-purple-900 mb-4">
              📅 {lang === 'fr' ? 'Dates et Heures' : 'التواريخ والأوقات'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-bold text-purple-900 mb-2">{lang === 'fr' ? 'Départ' : 'المغادرة'}</h5>
                <p className="text-purple-800">{reservation.step1.departureDate} à {reservation.step1.departureTime}</p>
              </div>
              <div>
                <h5 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                  {lang === 'fr' ? 'Retour' : 'العودة'}
                  <button className="text-purple-600 hover:text-purple-800">
                    <Edit className="w-4 h-4" />
                  </button>
                </h5>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="flex-1 p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="flex-1 p-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fees */}
          <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
            <h4 className="text-lg font-black text-red-900 mb-4">
              💸 {lang === 'fr' ? 'Frais Supplémentaires de Clôture' : 'رسوم الإغلاق الإضافية'}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-red-900 mb-2">
                  {lang === 'fr' ? 'Kilométrage Excédentaire' : 'عداد الكيلومترات الزائد'}
                </label>
                <p className="text-sm text-red-700 mb-1">{lang === 'fr' ? 'Facturé si dépassement forfait' : 'يتم احتسابه عند تجاوز الحد المسموح'}</p>
                <input
                  type="number"
                  value={excessMileage}
                  onChange={(e) => setExcessMileage(e.target.value)}
                  className="w-full p-3 border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              <div className="bg-red-100 rounded-lg p-4">
                <p className="font-bold text-red-900">
                  {lang === 'fr' ? 'Total Frais de Clôture (TTC)' : 'إجمالي رسوم الإغلاق (شامل الضريبة)'}: {totalFees.toLocaleString()} DA
                </p>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
            <h4 className="text-lg font-black text-yellow-900 mb-4">
              📄 {lang === 'fr' ? 'Documents laissés par le client' : 'الوثائق المتروكة من قبل العميل'}
            </h4>
            <div className="space-y-4">
              <p className="text-yellow-800">
                {lang === 'fr' ? 'Aucun document trouvé pour ce client.' : 'لم يتم العثور على أي وثيقة لهذا العميل.'}
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="documents"
                    checked={documentsRecovered}
                    onChange={() => setDocumentsRecovered(true)}
                    className="text-yellow-600"
                  />
                  <span className="font-bold text-yellow-900">
                    {lang === 'fr' ? 'Client a récupéré' : 'العميل استلم'}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="documents"
                    checked={!documentsRecovered}
                    onChange={() => setDocumentsRecovered(false)}
                    className="text-yellow-600"
                  />
                  <span className="font-bold text-yellow-900">
                    {lang === 'fr' ? 'Notifier client (non récupéré)' : 'إشعار العميل (غير مستلم)'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-900 mb-2">
              📝 {lang === 'fr' ? 'Note (Optionnel)' : 'ملاحظة (اختياري)'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder={lang === 'fr' ? 'Observations supplémentaires...' : 'ملاحظات إضافية...'}
            />
          </div>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4"
          >
            <p className="text-red-700 font-bold text-sm">
              ❌ {lang === 'fr' ? 'Erreur' : 'خطأ'}: {errorMessage}
            </p>
            <p className="text-red-600 text-xs mt-2">
              {lang === 'fr' 
                ? 'Vérifiez votre connexion et les données saisies. Voir la console pour plus de détails.'
                : 'تحقق من الاتصال والبيانات المدخلة. راجع وحدة التحكم لمزيد من التفاصيل.'}
            </p>
          </motion.div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {lang === 'fr' ? 'Annuler' : 'إلغاء'}
          </button>
          <button
            onClick={handleComplete}
            disabled={isLoading}
            className="flex-1 btn-saas-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⏳</span>
                {lang === 'fr' ? 'Traitement...' : 'جاري المعالجة...'}
              </>
            ) : (
              <>✅ {lang === 'fr' ? 'Terminer la Location' : 'إنهاء التأجير'}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};