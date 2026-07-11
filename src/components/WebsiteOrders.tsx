import React, { useState, useEffect } from 'react';
import { Language, WebsiteOrder, Car, Agency } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Users, Car as CarIcon, Plus, Search, Filter, Eye, Edit, Trash2, CheckCircle, XCircle, Clock, MapPin, Fuel, Camera, FileText, CreditCard, DollarSign, AlertTriangle, Phone, Mail, User, Loader } from 'lucide-react';
import { DatabaseService } from '../services/DatabaseService';
import { ReservationsService } from '../services/ReservationsService';

interface WebsiteOrdersProps {
  lang: Language;
}

export const WebsiteOrders: React.FC<WebsiteOrdersProps> = ({ lang }) => {
  const [orders, setOrders] = useState<WebsiteOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [selectedOrder, setSelectedOrder] = useState<WebsiteOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Load website orders from database
  useEffect(() => {
    loadWebsiteOrders();
  }, []);

  const loadWebsiteOrders = async () => {
    try {
      setIsLoading(true);
      const data = await DatabaseService.getWebsiteOrders();
      setOrders(data || []);
    } catch (err) {
      console.error('Error loading website orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.step2.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.step2.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.car.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.car.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.car.registration.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleViewDetails = (order: WebsiteOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleConfirmOrder = async (orderId: string) => {
    try {
      setIsProcessing(orderId);
      
      // Update the website order status in database to 'accepted' instead of confirmed
      await DatabaseService.updateWebsiteOrderStatus(orderId, 'accepted');

      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: 'accepted' as const } : order
      ));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'accepted' } : null);
      }

      console.log(`Order ${orderId} accepted and will appear in Planner as accepted`);
    } catch (err) {
      console.error('Error accepting order:', err);
      alert(lang === 'fr' ? 'Erreur lors de l\'acceptation de la commande' : 'خطأ في قبول الطلب');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      setIsProcessing(orderId);
      
      // Update the website order status in database
      await DatabaseService.updateWebsiteOrderStatus(orderId, 'cancelled');

      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: 'cancelled' as const } : order
      ));

      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }

      console.log(`Order ${orderId} cancelled`);
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert(lang === 'fr' ? 'Erreur lors de l\'annulation de la commande' : 'خطأ في إلغاء الطلب');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    setShowDeleteConfirm(orderId);
  };

  const confirmDeleteOrder = async () => {
    if (showDeleteConfirm) {
      try {
        setIsProcessing(showDeleteConfirm);
        
        // Delete from database
        await DatabaseService.deleteWebsiteOrder(showDeleteConfirm);

        // Update local state
        setOrders(prev => prev.filter(order => order.id !== showDeleteConfirm));
        setShowDeleteConfirm(null);
        
        if (selectedOrder?.id === showDeleteConfirm) {
          setSelectedOrder(null);
          setShowOrderDetails(false);
        }
      } catch (err) {
        console.error('Error deleting order:', err);
        alert(lang === 'fr' ? 'Erreur lors de la suppression de la commande' : 'خطأ في حذف الطلب');
        setShowDeleteConfirm(null);
      } finally {
        setIsProcessing(null);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            🛒 {lang === 'fr' ? 'Commandes Website' : 'طلبات الموقع'}
          </h1>
          <p className="text-slate-600 mt-1">
            {lang === 'fr' ? 'Gérer les commandes reçues depuis le site web' : 'إدارة الطلبات المستلمة من الموقع'}
          </p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder={lang === 'fr' ? 'Rechercher...' : 'البحث...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">{lang === 'fr' ? 'Tous les statuts' : 'جميع الحالات'}</option>
            <option value="pending">{lang === 'fr' ? 'En attente' : 'في الانتظار'}</option>
            <option value="accepted">{lang === 'fr' ? 'Accepté' : 'مقبول'}</option>
            <option value="confirmed">{lang === 'fr' ? 'Confirmé' : 'مؤكد'}</option>
            <option value="processing">{lang === 'fr' ? 'En traitement' : 'قيد المعالجة'}</option>
            <option value="completed">{lang === 'fr' ? 'Terminé' : 'مكتمل'}</option>
            <option value="cancelled">{lang === 'fr' ? 'Annulé' : 'ملغي'}</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-yellow-600 font-bold">{lang === 'fr' ? 'En attente' : 'في الانتظار'}</p>
              <p className="text-2xl font-black text-yellow-900">{orders.filter(o => o.status === 'pending').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-teal-600 font-bold">{lang === 'fr' ? 'Accepté' : 'مقبول'}</p>
              <p className="text-2xl font-black text-teal-900">{orders.filter(o => o.status === 'accepted').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6 border border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-red-600 font-bold">{lang === 'fr' ? 'Annulé' : 'ملغي'}</p>
              <p className="text-2xl font-black text-red-900">{orders.filter(o => o.status === 'cancelled').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading state
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-600 font-bold">{lang === 'fr' ? 'Chargement des commandes...' : 'جاري تحميل الطلبات...'}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          // Empty state
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-slate-600 font-bold text-center">
              {lang === 'fr' 
                ? 'Aucune commande trouvée' 
                : 'لم يتم العثور على أي طلبات'}
            </p>
            <p className="text-slate-500 text-sm mt-2">
              {lang === 'fr'
                ? 'Les commandes du site web apparaîtront ici'
                : 'ستظهر طلبات الموقع الإلكتروني هنا'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col relative"
          >
            {/* Car Image */}
            <div className="relative h-48 overflow-hidden rounded-t-2xl">
              <img
                src={order.car?.image_url || order.car?.images?.[0] || 'https://picsum.photos/seed/car/400/300'}
                alt={`${order.car?.brand} ${order.car?.model}`}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Client Avatar - Circular with Border */}
              <div className="absolute top-4 right-4 w-16 h-16 rounded-full border-4 border-white overflow-hidden shadow-lg bg-slate-100 flex items-center justify-center">
                {order.step2?.photo ? (
                  <img
                    src={order.step2.photo}
                    alt={`${order.step2.firstName} ${order.step2.lastName}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : order.step2?.scannedDocuments && order.step2.scannedDocuments.length > 0 ? (
                  <img
                    src={order.step2.scannedDocuments[0]}
                    alt={`${order.step2.firstName} ${order.step2.lastName}`}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              {/* Status Badge and Website Badge Stack */}
              <div className="absolute top-4 left-4 flex flex-col gap-1">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  order.status === 'accepted' ? 'bg-teal-100 text-teal-800' :
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {order.status === 'confirmed' ? '✅ Confirmé' :
                   order.status === 'accepted' ? '✅ Accepté' :
                   order.status === 'pending' ? '⏳ En attente' :
                   order.status === 'processing' ? '🔄 Traitement' :
                   order.status === 'completed' ? '🏁 Terminé' :
                   '❌ Annulé'}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 w-fit">
                  🌐 Website
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Client & Car Info */}
              <div className="space-y-3 mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    {order.step2.firstName} {order.step2.lastName}
                  </h3>
                  <p className="text-sm text-slate-600">
                    📱 {order.step2.phone}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">
                    🚗 {order.car?.brand || 'N/A'} {order.car?.model || 'N/A'}
                  </h4>
                  <p className="text-sm text-slate-600">
                    🏷️ {order.car?.plate_number || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>{order.step1.departureDate} → {order.step1.returnDate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span>{order.totalDays} {lang === 'fr' ? 'jours' : 'أيام'}</span>
                </div>
                
                {/* Pricing Section */}
                <div className="mt-3 p-4 bg-gradient-to-r from-white to-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500">{lang === 'fr' ? 'Total Réservation' : 'الإجمالي'}</div>
                      <div className="text-xl font-black text-slate-900">
                        {order.totalPrice.toLocaleString()} {lang === 'fr' ? 'DA' : 'د.ج'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">{lang === 'fr' ? 'Statut' : 'الحالة'}</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'accepted' ? 'bg-teal-100 text-teal-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'confirmed' ? '✅ Confirmé' :
                         order.status === 'accepted' ? '✅ Accepté' :
                         order.status === 'pending' ? '⏳ En attente' :
                         '❌ Annulé'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions - simplified car card style buttons */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <button
                  onClick={() => handleViewDetails(order)}
                  disabled={isProcessing === order.id}
                  className="p-2.5 rounded-xl bg-saas-bg hover:bg-saas-secondary-start/10 text-saas-text-muted transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-border hover:border-saas-secondary-start/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={lang === 'fr' ? 'Détails' : 'التفاصيل'}
                >
                  <span className="text-lg">👁️</span>
                  <span className="text-[8px] uppercase font-bold">{lang === 'fr' ? 'Détails' : 'تفاصيل'}</span>
                </button>

                <button
                  onClick={() => handleConfirmOrder(order.id)}
                  disabled={order.status !== 'pending' || isProcessing === order.id}
                  className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 border ${
                    order.status === 'pending' && isProcessing !== order.id
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-transparent'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                  title={lang === 'fr' ? 'Accepter' : 'قبول'}
                >
                  {isProcessing === order.id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg">✅</span>
                      <span className="text-[8px] uppercase font-bold">{lang === 'fr' ? 'Accepter' : 'قبول'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleCancelOrder(order.id)}
                  disabled={order.status === 'cancelled' || isProcessing === order.id}
                  className={`p-2.5 rounded-xl transition-all flex flex-col items-center gap-1 border ${
                    order.status !== 'cancelled' && isProcessing !== order.id
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-transparent'
                      : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  }`}
                  title={lang === 'fr' ? 'Annuler' : 'إلغاء'}
                >
                  {isProcessing === order.id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span className="text-lg">❌</span>
                      <span className="text-[8px] uppercase font-bold">{lang === 'fr' ? 'Annuler' : 'إلغاء'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDeleteOrder(order.id)}
                  disabled={isProcessing === order.id}
                  className="p-2.5 rounded-xl bg-saas-danger-start/5 hover:bg-saas-danger-start hover:text-white text-saas-danger-start transition-all hover:scale-105 flex flex-col items-center gap-1 border border-saas-danger-start/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={lang === 'fr' ? 'Supprimer' : 'حذف'}
                >
                  <span className="text-lg">🗑️</span>
                </button>
              </div>
            </div>
          </motion.div>
        ))
        )}
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {showOrderDetails && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowOrderDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black text-slate-900">
                    📋 {lang === 'fr' ? 'Détails de la Commande' : 'تفاصيل الطلب'}
                  </h2>
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Info */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200">
                      <h3 className="text-lg font-black text-slate-900 mb-4">
                        📋 {lang === 'fr' ? 'Informations Commande' : 'معلومات الطلب'}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'N° Commande:' : 'رقم الطلب:'}</span>
                          <span className="font-mono">{selectedOrder.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Date création:' : 'تاريخ الإنشاء:'}</span>
                          <span>{new Date(selectedOrder.createdAt).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Statut:' : 'الحالة:'}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            selectedOrder.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {selectedOrder.status === 'pending' ? (lang === 'fr' ? 'En attente' : 'في الانتظار') :
                             selectedOrder.status === 'confirmed' ? (lang === 'fr' ? 'Confirmé' : 'مؤكد') :
                             selectedOrder.status === 'cancelled' ? (lang === 'fr' ? 'Annulé' : 'ملغي') :
                             selectedOrder.status}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Source:' : 'المصدر:'}</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                            🌐 {lang === 'fr' ? 'Site Web' : 'الموقع الإلكتروني'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                      <h3 className="text-lg font-black text-blue-900 mb-4">
                        👤 {lang === 'fr' ? 'Informations Client' : 'معلومات العميل'}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Nom:' : 'الاسم:'}</span>
                          <span>{selectedOrder.step2.firstName} {selectedOrder.step2.lastName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Téléphone:' : 'الهاتف:'}</span>
                          <span>{selectedOrder.step2.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Email:' : 'البريد:'}</span>
                          <span className="text-sm">{selectedOrder.step2.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Wilaya:' : 'الولاية:'}</span>
                          <span>{selectedOrder.step2.wilaya}</span>
                        </div>
                        {selectedOrder.step2.completeAddress && (
                          <div className="flex justify-between">
                            <span className="font-bold">{lang === 'fr' ? 'Adresse:' : 'العنوان:'}</span>
                            <span className="text-sm text-right">{selectedOrder.step2.completeAddress}</span>
                          </div>
                        )}
                        {selectedOrder.step2.licenseNumber && (
                          <div className="flex justify-between">
                            <span className="font-bold">{lang === 'fr' ? 'N° Permis:' : 'رقم الرخصة:'}</span>
                            <span>{selectedOrder.step2.licenseNumber}</span>
                          </div>
                        )}
                        {selectedOrder.step2.dateOfBirth && (
                          <div className="flex justify-between">
                            <span className="font-bold">{lang === 'fr' ? 'Date Naissance:' : 'تاريخ الميلاد:'}</span>
                            <span>{selectedOrder.step2.dateOfBirth}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Documents Section */}
                    {selectedOrder.step2.scannedDocuments && selectedOrder.step2.scannedDocuments.length > 0 && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                        <h3 className="text-lg font-black text-amber-900 mb-4">
                          📄 {lang === 'fr' ? 'Documents Scannés' : 'الوثائق الممسوحة'}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedOrder.step2.scannedDocuments.map((docUrl, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={docUrl}
                                alt={`${lang === 'fr' ? 'Document' : 'وثيقة'} ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-amber-300 cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => window.open(docUrl, '_blank')}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <Eye className="w-6 h-6 text-white" />
                                </div>
                              </div>
                              <div className="absolute bottom-2 left-2 bg-amber-600 text-white text-xs px-2 py-1 rounded">
                                {lang === 'fr' ? `Doc ${index + 1}` : `وثيقة ${index + 1}`}
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-amber-700 mt-3">
                          {lang === 'fr' 
                            ? `📎 ${selectedOrder.step2.scannedDocuments.length} document(s) téléchargé(s) par le client` 
                            : `📎 ${selectedOrder.step2.scannedDocuments.length} وثيقة تم رفعها من قبل العميل`}
                        </p>
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                      <h3 className="text-lg font-black text-green-900 mb-4">
                        🚗 {lang === 'fr' ? 'Informations Véhicule' : 'معلومات المركبة'}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Modèle:' : 'الموديل:'}</span>
                          <span>{selectedOrder.car?.brand || 'N/A'} {selectedOrder.car?.model || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Immatriculation:' : 'رقم اللوحة:'}</span>
                          <span>{selectedOrder.car?.plate_number || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Couleur:' : 'اللون:'}</span>
                          <span>{selectedOrder.car?.color || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Année:' : 'السنة:'}</span>
                          <span>{selectedOrder.car?.year || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Énergie:' : 'الطاقة:'}</span>
                          <span>{selectedOrder.car?.energy || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Transmission:' : 'النقل:'}</span>
                          <span>{selectedOrder.car?.transmission || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Prix/jour:' : 'السعر/يوم:'}</span>
                          <span>{selectedOrder.car?.price_per_day ? parseInt(selectedOrder.car.price_per_day).toLocaleString() : 'N/A'} DA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Caution:' : 'الكفالة:'}</span>
                          <span>{selectedOrder.car?.deposit ? parseInt(selectedOrder.car.deposit).toLocaleString() : 'N/A'} DA</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dates & Pricing */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                      <h3 className="text-lg font-black text-purple-900 mb-4">
                        📅 {lang === 'fr' ? 'Dates de Location' : 'تواريخ التأجير'}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Départ:' : 'المغادرة:'}</span>
                          <span>{selectedOrder.step1.departureDate} à {selectedOrder.step1.departureTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Retour:' : 'العودة:'}</span>
                          <span>{selectedOrder.step1.returnDate} à {selectedOrder.step1.returnTime}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold">{lang === 'fr' ? 'Durée:' : 'المدة:'}</span>
                          <span>{selectedOrder.totalDays} {lang === 'fr' ? 'jours' : 'أيام'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6 border border-orange-200">
                      <h3 className="text-lg font-black text-orange-900 mb-4">
                        💰 {lang === 'fr' ? 'Tarification' : 'التسعير'}
                      </h3>
                      {(() => {
                        const assuranceTotal = selectedOrder.assuranceTotal || 0;
                        const servicesTotal = selectedOrder.servicesTotal || 0;
                        const carPortion = Math.max(0, selectedOrder.totalPrice - servicesTotal - assuranceTotal);
                        return (
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="font-bold">{lang === 'fr' ? 'Prix véhicule:' : 'سعر المركبة:'}</span>
                              <span>{carPortion.toLocaleString()} DA</span>
                            </div>
                            {assuranceTotal > 0 && (
                              <div className="flex justify-between">
                                <span className="font-bold">🛡️ {lang === 'fr' ? 'Assurance:' : 'التأمين:'}</span>
                                <span>{assuranceTotal.toLocaleString()} DA</span>
                              </div>
                            )}
                            {servicesTotal > 0 && (
                              <div className="flex justify-between">
                                <span className="font-bold">{lang === 'fr' ? 'Services:' : 'الخدمات:'}</span>
                                <span>{servicesTotal.toLocaleString()} DA</span>
                              </div>
                            )}
                            <div className="border-t border-orange-300 pt-2 flex justify-between font-black text-lg">
                              <span>{lang === 'fr' ? 'Total:' : 'الإجمالي:'}</span>
                              <span className="text-orange-600">{selectedOrder.totalPrice.toLocaleString()} DA</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Assurance de protection */}
                    {(selectedOrder.protectionAssurance || selectedOrder.protectionAssuranceName) && (
                      <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-6 border border-red-200">
                        <h3 className="text-lg font-black text-red-900 mb-4">
                          🛡️ {lang === 'fr' ? 'Assurance de Protection' : 'تأمين الحماية'}
                        </h3>
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-bold text-slate-900">
                            {selectedOrder.protectionAssurance?.name || selectedOrder.protectionAssuranceName}
                          </span>
                          {selectedOrder.protectionAssurance && (
                            <span className="text-red-700 font-bold">
                              {selectedOrder.protectionAssurance.pricePerDay.toLocaleString()} DA/{lang === 'fr' ? 'j' : 'ي'}
                            </span>
                          )}
                        </div>
                        {selectedOrder.protectionAssurance && selectedOrder.protectionAssurance.items.length > 0 && (
                          <div className="space-y-1.5">
                            {selectedOrder.protectionAssurance.items.map((item) => (
                              <div key={item.linkId || item.itemId} className="flex items-center gap-2 text-sm">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  item.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                }`}>
                                  {item.status ? '✓' : '✕'}
                                </span>
                                <span className={item.status ? 'text-slate-700' : 'text-slate-400 line-through'}>
                                  {item.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Services */}
                    {selectedOrder.step3.additionalServices.length > 0 && (
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-200">
                        <h3 className="text-lg font-black text-indigo-900 mb-4">
                          🛎️ {lang === 'fr' ? 'Services Supplémentaires' : 'الخدمات الإضافية'}
                        </h3>
                        <div className="space-y-2">
                          {selectedOrder.step3.additionalServices.map((service) => (
                            <div key={service.id} className="flex justify-between items-center">
                              <span className="font-bold">{service.name}</span>
                              <span className="text-indigo-700">{service.price.toLocaleString()} DA</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                  <button
                    onClick={() => setShowOrderDetails(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-all"
                  >
                    {lang === 'fr' ? 'Fermer' : 'إغلاق'}
                  </button>
                  {selectedOrder.status === 'pending' && (
                    <button
                      onClick={() => {
                        handleConfirmOrder(selectedOrder.id);
                        setShowOrderDetails(false);
                      }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition-all text-sm"
                    >
                      ✅ {lang === 'fr' ? 'Accepter' : 'قبول'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-black text-slate-900 mb-2">
                  {lang === 'fr' ? 'Confirmer la Suppression' : 'تأكيد الحذف'}
                </h3>
                <p className="text-slate-600 mb-6">
                  {lang === 'fr' 
                    ? 'Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.' 
                    : 'هل أنت متأكد من أنك تريد حذف هذا الطلب؟ هذا الإجراء لا رجعة فيه.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-xl transition-colors"
                  >
                    {lang === 'fr' ? 'Annuler' : 'إلغاء'}
                  </button>
                  <button
                    onClick={confirmDeleteOrder}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 px-4 rounded-xl transition-all"
                  >
                    🗑️ {lang === 'fr' ? 'Supprimer' : 'حذف'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};