import React, { useState, useEffect, useRef } from 'react';
import { DocumentType, DocumentTemplate, DocumentField } from '../types';
import { DocumentTemplateService, SavedDocumentTemplate } from '../services/DocumentTemplateService';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Plus, Trash2, RotateCcw, Save, X } from 'lucide-react';

interface DocumentTemplateEditorProps {
  documentType: DocumentType;
  onClose: () => void;
  onSave?: () => void;
  reservationId?: string;
  carId?: string;
  clientId?: string;
  inspectionId?: string;
}

interface DraggingField {
  fieldName: string;
  offsetX: number;
  offsetY: number;
}

interface SaveDialogState {
  isOpen: boolean;
  isSaveAsNew: boolean;
  selectedTemplateId?: string;
}

interface RealData {
  client?: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  car?: {
    brand: string;
    model: string;
    year: number;
    color: string;
  };
  reservation?: {
    departure_date: string;
    return_date: string;
    total_price: number;
  };
  inspection?: {
    mileage: number;
    fuel_level: string;
  };
  agencySettings?: {
    agency_name: string;
    logo: string;
    phone: string;
    address: string;
  };
}

const DEFAULT_FIELD_NAMES: Record<DocumentType, string[]> = {
  contrat: ['title', 'client_name', 'car_model', 'rental_dates', 'price_total', 'signature_line'],
  devis: ['title', 'quote_number', 'client_name', 'car_model', 'validity_date', 'price_total'],
  facture: ['title', 'invoice_number', 'invoice_date', 'client_name', 'car_model', 'amount_due', 'payment_terms'],
  recu: ['logo', 'agenceName', 'title', 'receipt_number', 'receipt_date', 'client_name', 'amount_paid', 'payment_method'],
  engagement: ['title', 'client_name', 'car_model', 'rental_dates', 'price_total'],
};

export const DocumentTemplateEditor: React.FC<DocumentTemplateEditorProps> = ({
  documentType,
  onClose,
  onSave,
  reservationId,
  carId,
  clientId,
  inspectionId,
}) => {
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedDocumentTemplate[]>([]);
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [realData, setRealData] = useState<RealData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggingField, setDraggingField] = useState<DraggingField | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedFontSize, setSelectedFontSize] = useState(12);
  const [newFieldName, setNewFieldName] = useState('');
  const [saveDialog, setSaveDialog] = useState<SaveDialogState>({
    isOpen: false,
    isSaveAsNew: true,
  });
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAllData();
  }, [documentType, reservationId, carId, clientId]);

  const loadAllData = async () => {
    try {
      setLoading(true);

      // Get current user's agency
      const { data: userData } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', userData?.user?.id)
        .single();

      const currentAgencyId = userProfile?.agency_id || '';
      setAgencyId(currentAgencyId);

      // Load saved templates from database - CONTRAT TYPE ONLY
      if (documentType === 'contrat') {
        const templates = await DocumentTemplateService.getSavedTemplates(documentType, currentAgencyId);
        console.log('DocumentTemplateEditor: Loaded templates from database:', templates);
        setSavedTemplates(templates);

        // Load the first template if available, otherwise create new one
        if (templates.length > 0) {
          console.log('DocumentTemplateEditor: Setting template from database:', templates[0].template);
          setTemplate(templates[0].template);
          setCurrentTemplateId(templates[0].id);
        } else {
          console.log('DocumentTemplateEditor: No templates found, using default');
          setTemplate(DocumentTemplateService.getDefaultTemplate(documentType));
          setCurrentTemplateId(null);
        }
      } else {
        // For other types, just use default
        console.log('DocumentTemplateEditor: Using default template for', documentType);
        setTemplate(DocumentTemplateService.getDefaultTemplate(documentType));
        setCurrentTemplateId(null);
        setSavedTemplates([]);
      }

      // Load real data
      await loadRealData(currentAgencyId);
    } catch (error) {
      console.error('Error loading data:', error);
      setTemplate(DocumentTemplateService.getDefaultTemplate(documentType));
    } finally {
      setLoading(false);
    }
  };

  const loadRealData = async (currentAgencyId: string) => {
    try {
      const data: RealData = {};

      // Load agency settings
      const { data: agencyData } = await supabase
        .from('agency_settings')
        .select('agency_name, logo, phone, address')
        .limit(1)
        .single();

      if (agencyData) {
        data.agencySettings = agencyData;
      }

      // Load client info
      if (clientId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('first_name, last_name, phone, email')
          .eq('id', clientId)
          .single();

        if (clientData) {
          data.client = clientData;
        }
      }

      // Load car info
      if (carId) {
        const { data: carData } = await supabase
          .from('cars')
          .select('brand, model, year, color')
          .eq('id', carId)
          .single();

        if (carData) {
          data.car = carData;
        }
      }

      // Load reservation info
      if (reservationId) {
        const { data: resData } = await supabase
          .from('reservations')
          .select('departure_date, return_date, total_price')
          .eq('id', reservationId)
          .single();

        if (resData) {
          data.reservation = resData;
        }
      }

      // Load inspection info
      if (inspectionId) {
        const { data: inspData } = await supabase
          .from('vehicle_inspections')
          .select('mileage, fuel_level')
          .eq('id', inspectionId)
          .single();

        if (inspData) {
          data.inspection = inspData;
        }
      }

      setRealData(data);
    } catch (error) {
      console.error('Error loading real data:', error);
    }
  };

  const buildPreviewData = (): Record<string, string> => {
    const { client, car, reservation, agencySettings, inspection } = realData;

    return {
      title: `${documentType.toUpperCase()} de Location`,
      client_name: client ? `${client.first_name} ${client.last_name}` : 'Client Name',
      car_model: car ? `${car.brand} ${car.model} ${car.year} - ${car.color}` : 'Car Model',
      rental_dates: reservation ? `${reservation.departure_date} - ${reservation.return_date}` : 'Dates',
      price_total: reservation ? `${reservation.total_price.toLocaleString()} DA` : 'Price',
      signature_line: '_________________________________',
      agenceName: agencySettings?.agency_name || 'Agency Name',
      quote_number: `DEVIS-${Date.now().toString().slice(-6)}`,
      validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      invoice_number: `FAC-${Date.now().toString().slice(-6)}`,
      invoice_date: new Date().toLocaleDateString('fr-FR'),
      amount_due: reservation ? `${reservation.total_price.toLocaleString()} DA` : 'Amount',
      payment_terms: 'Net 30',
      receipt_number: `REC-${Date.now().toString().slice(-6)}`,
      receipt_date: new Date().toLocaleDateString('fr-FR'),
      amount_paid: reservation ? `${reservation.total_price.toLocaleString()} DA` : 'Amount',
      payment_method: 'Virement Bancaire',
      mileage: inspection?.mileage?.toString() || '0',
      fuel_level: inspection?.fuel_level || 'Full',
    };
  };

  const handleSelectTemplate = async (template: SavedDocumentTemplate) => {
    setTemplate(template.template);
    setCurrentTemplateId(template.id);
    setEditingField(null);
  };
  const handleFieldMouseDown = (fieldName: string, e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const field = template?.[fieldName];
    if (!field) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDraggingField({
      fieldName,
      offsetX: e.clientX - rect.left - field.x,
      offsetY: e.clientY - rect.top - field.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingField || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(e.clientX - rect.left - draggingField.offsetX, rect.width - 100));
    const newY = Math.max(0, Math.min(e.clientY - rect.top - draggingField.offsetY, rect.height - 30));

    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [draggingField.fieldName]: {
          ...prev[draggingField.fieldName],
          x: Math.round(newX),
          y: Math.round(newY),
        },
      };
    });
  };

  const handleMouseUp = () => {
    setDraggingField(null);
  };

  const handleUpdateField = (fieldName: string, updates: Partial<DocumentField>) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          ...updates,
        },
      };
    });
  };

  const handleDeleteField = (fieldName: string) => {
    setTemplate((prev) => {
      if (!prev) return prev;
      const { [fieldName]: _, ...rest } = prev;
      return rest;
    });
    setEditingField(null);
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;

    const fieldName = `custom_${newFieldName.replace(/\s+/g, '_').toLowerCase()}`;
    
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [fieldName]: {
          x: 80,
          y: 300,
          color: '#000000',
          fontSize: 12,
          customText: newFieldName,
        },
      };
    });
    setNewFieldName('');
  };

  const handleSave = async () => {
    if (!template || !agencyId) return;

    // Show save dialog
    setSaveDialog({
      isOpen: true,
      isSaveAsNew: !currentTemplateId,
      selectedTemplateId: currentTemplateId || undefined,
    });
  };

  const handleConfirmSave = async () => {
    if (!template || !agencyId) return;

    try {
      setSaving(true);

      if (saveDialog.isSaveAsNew || !currentTemplateId) {
        // Save as new template
        const newTemplate = await DocumentTemplateService.saveTemplate(
          documentType,
          template,
          agencyId
        );
        setCurrentTemplateId(newTemplate.id);
        setSavedTemplates([newTemplate, ...savedTemplates]);
      } else {
        // Update existing template
        const updated = await DocumentTemplateService.updateSavedTemplate(
          currentTemplateId,
          template
        );
        setSavedTemplates(
          savedTemplates.map((t) => (t.id === currentTemplateId ? updated : t))
        );
      }

      setSaveDialog({ isOpen: false, isSaveAsNew: true });
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Error saving template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await DocumentTemplateService.deleteTemplate(templateId);
      setSavedTemplates(savedTemplates.filter((t) => t.id !== templateId));

      if (currentTemplateId === templateId) {
        if (savedTemplates.length > 1) {
          const remaining = savedTemplates.filter((t) => t.id !== templateId)[0];
          handleSelectTemplate(remaining);
        } else {
          setTemplate(DocumentTemplateService.getDefaultTemplate(documentType));
          setCurrentTemplateId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template');
    }
  };

  const previewData = buildPreviewData();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-700">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
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
        className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Customize {documentType.toUpperCase()} Template
            </h2>
            {currentTemplateId && (
              <p className="text-sm text-gray-600 mt-1">
                Editing: Template {currentTemplateId.substring(0, 8)}...
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-4 gap-6">
          {/* Sidebar - Saved Templates */}
          <div className="col-span-1 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-900 mb-3">📋 Saved Templates</h3>
              <div className="space-y-2">
                {savedTemplates.length === 0 ? (
                  <p className="text-xs text-indigo-700">No saved templates yet</p>
                ) : (
                  savedTemplates.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      className={`p-2 rounded border cursor-pointer transition-colors ${
                        currentTemplateId === tmpl.id
                          ? 'bg-indigo-500 text-white border-indigo-600'
                          : 'bg-white border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectTemplate(tmpl)}
                        className="w-full text-left text-sm font-medium mb-1"
                      >
                        Template {tmpl.id.substring(0, 8)}...
                      </button>
                      {currentTemplateId === tmpl.id && (
                        <button
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="w-full text-xs bg-red-600 text-white py-1 rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Preview Data Editor */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 max-h-48 overflow-y-auto">
              <h3 className="font-semibold text-purple-900 mb-2 text-sm">👁️ Preview Data</h3>
              <div className="space-y-1 text-xs">
                {Object.entries(previewData).slice(0, 8).map(([key, value]) => (
                  <div key={key} className="text-purple-700">
                    <span className="font-medium">{key}:</span> {value}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Custom Field */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm flex items-center gap-1">
                <Plus size={14} /> Custom Text
              </h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Field name..."
                  className="w-full px-2 py-1 border border-blue-300 rounded text-xs"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddCustomField();
                  }}
                />
                <button
                  onClick={handleAddCustomField}
                  className="w-full bg-blue-600 text-white py-1 rounded text-xs font-medium hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          {/* Canvas - Document Preview */}
          <div className="col-span-2">
            <div
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="relative bg-white border-2 border-gray-300 rounded-lg overflow-hidden"
              style={{
                width: '100%',
                height: '800px',
                minHeight: '800px',
                cursor: draggingField ? 'grabbing' : 'default',
                position: 'relative',
              }}
            >
              {/* Document Background */}
              <div
                className="absolute inset-0 bg-white"
                style={{ pointerEvents: 'none' }}
              />

              {/* Agency Header */}
              {realData.agencySettings && documentType !== 'engagement' && (
                <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #ccc' }}>
                    <div style={{ flex: 1 }}>
                      <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                        {realData.agencySettings.agency_name}
                      </h1>
                    </div>
                    {realData.agencySettings.logo && (
                      <div style={{ marginLeft: '20px' }}>
                        <img
                          src={realData.agencySettings.logo}
                          alt="Agency Logo"
                          style={{ height: 50, width: 'auto', objectFit: 'contain' }}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Render Fields */}
              {template &&
                Object.entries(template).map(([fieldName, fieldValue]) => {
                  const field = fieldValue as any;
                  const fieldContent = previewData[fieldName] || `[${fieldName}]`;

                  return (
                    <div
                      key={fieldName}
                      style={{
                        position: 'absolute',
                        left: `${field.x || 0}px`,
                        top: `${field.y || 0}px`,
                        color: field.color || '#000000',
                        fontSize: `${field.fontSize || 12}px`,
                        fontFamily: field.fontFamily || 'Arial',
                        fontWeight: field.fontWeight || 'normal',
                        fontStyle: field.fontStyle || 'normal',
                        textDecoration: field.textDecoration || 'none',
                        textAlign: field.textAlign || 'left',
                        backgroundColor: editingField === fieldName ? '#dbeafe' : 'transparent',
                        padding: '4px 8px',
                        border: editingField === fieldName ? '2px solid #3b82f6' : '1px dashed #999',
                        borderRadius: '4px',
                        cursor: 'grab',
                        zIndex: editingField === fieldName ? 50 : 40,
                        minWidth: '120px',
                        maxWidth: '300px',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        overflow: 'visible',
                      }}
                      onMouseDown={(e) => handleFieldMouseDown(fieldName, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingField(fieldName);
                        setSelectedColor(field.color || '#000000');
                        setSelectedFontSize(field.fontSize || 12);
                      }}
                      title={`${fieldName} (${field.x}, ${field.y})`}
                    >
                      <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#666', marginBottom: '2px', opacity: 0.7 }}>
                        {fieldName}
                      </div>
                      <div style={{ 
                        fontSize: `${field.fontSize || 12}px`, 
                        color: field.color || '#000000',
                        fontWeight: field.fontWeight || 'normal',
                        maxWidth: '250px',
                      }}>
                        {String(fieldContent).substring(0, 100)}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Sidebar - Field Editor */}
          <div className="col-span-1 max-h-[calc(90vh-200px)] overflow-y-auto">
            <div className="space-y-4">
              {/* Field Editor */}
              {editingField && template?.[editingField] && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                    <Edit2 size={14} /> {editingField}
                  </h3>

                  <div className="space-y-3 text-xs">
                    {/* Position X */}
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">
                        X: {template[editingField].x}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="800"
                        value={template[editingField].x}
                        onChange={(e) =>
                          handleUpdateField(editingField, { x: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>

                    {/* Position Y */}
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">
                        Y: {template[editingField].y}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="700"
                        value={template[editingField].y}
                        onChange={(e) =>
                          handleUpdateField(editingField, { y: parseInt(e.target.value) })
                        }
                        className="w-full"
                      />
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Color</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={selectedColor}
                          onChange={(e) => {
                            setSelectedColor(e.target.value);
                            handleUpdateField(editingField, { color: e.target.value });
                          }}
                          className="w-10 h-8 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedColor}
                          onChange={(e) => {
                            setSelectedColor(e.target.value);
                            handleUpdateField(editingField, { color: e.target.value });
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">
                        Size: {selectedFontSize}px
                      </label>
                      <input
                        type="range"
                        min="8"
                        max="36"
                        value={selectedFontSize}
                        onChange={(e) => {
                          const size = parseInt(e.target.value);
                          setSelectedFontSize(size);
                          handleUpdateField(editingField, { fontSize: size });
                        }}
                        className="w-full"
                      />
                    </div>

                    {/* Custom Text */}
                    {template[editingField].customText && (
                      <div>
                        <label className="block font-medium text-gray-700 mb-1">Text</label>
                        <input
                          type="text"
                          value={template[editingField].customText || ''}
                          onChange={(e) =>
                            handleUpdateField(editingField, { customText: e.target.value })
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    )}

                    {/* Delete Button */}
                    {editingField.startsWith('custom_') && (
                      <button
                        onClick={() => handleDeleteField(editingField)}
                        className="w-full bg-red-600 text-white py-2 rounded text-xs font-medium hover:bg-red-700 flex items-center justify-center gap-2"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Fields List */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">Fields</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {template &&
                    Object.keys(template).map((fieldName) => (
                      <button
                        key={fieldName}
                        onClick={() => setEditingField(fieldName)}
                        className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                          editingField === fieldName
                            ? 'bg-blue-500 text-white'
                            : 'hover:bg-gray-200 text-gray-900'
                        }`}
                      >
                        {fieldName}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm('Reset to default template?')) {
                  setTemplate(DocumentTemplateService.getDefaultTemplate(documentType));
                  setCurrentTemplateId(null);
                }
              }}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2 text-sm"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 flex items-center gap-2 text-sm"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} /> Save
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Save Dialog Modal */}
      <AnimatePresence>
        {saveDialog.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Save Template</h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={saveDialog.isSaveAsNew}
                      onChange={() =>
                        setSaveDialog((prev) => ({ ...prev, isSaveAsNew: true }))
                      }
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-900">Save as new template</span>
                  </label>
                  {saveDialog.isSaveAsNew && (
                    <p className="ml-6 text-xs text-gray-600 mt-2">
                      Template will be saved with a unique ID
                    </p>
                  )}
                </div>

                {currentTemplateId && (
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!saveDialog.isSaveAsNew}
                        onChange={() =>
                          setSaveDialog((prev) => ({ ...prev, isSaveAsNew: false }))
                        }
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-gray-900">Update current template</span>
                    </label>
                    {!saveDialog.isSaveAsNew && (
                      <p className="ml-6 text-xs text-gray-600 mt-2">
                        Template ID: {currentTemplateId.substring(0, 8)}...
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() =>
                    setSaveDialog({ isOpen: false, isSaveAsNew: true })
                  }
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={saving}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 text-sm"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
