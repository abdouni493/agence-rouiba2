import React, { useState, useEffect } from 'react';
import { DocumentType, DocumentTemplate, Invoice, AgencySettings } from '../types';
import { DocumentTemplateService } from '../services/DocumentTemplateService';
import { supabase } from '../supabase';
import { Edit2, Printer, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentRendererProps {
  documentType: DocumentType;
  invoice: Invoice;
  onEditTemplate?: () => void;
  lang?: 'fr' | 'ar';
}

interface FieldValue {
  [key: string]: string | number;
}

const FIELD_VALUE_MAPPING: Record<DocumentType, FieldValue> = {
  contrat: {
    title: 'Contrat de Location',
    client_name: 'Client Name',
    car_model: 'Vehicle Model',
    rental_dates: 'Rental Dates',
    price_total: 'Total Price',
    signature_line: 'Signature',
  },
  devis: {
    title: 'Devis',
    quote_number: 'Quote Number',
    client_name: 'Client Name',
    car_model: 'Vehicle Model',
    validity_date: 'Valid Until',
    price_total: 'Total Price',
  },
  facture: {
    title: 'Invoice',
    invoice_number: 'Invoice Number',
    invoice_date: 'Date',
    client_name: 'Client Name',
    car_model: 'Vehicle Model',
    amount_due: 'Amount Due',
    payment_terms: 'Payment Terms',
  },
  recu: {
    title: 'Receipt',
    receipt_number: 'Receipt Number',
    receipt_date: 'Date',
    client_name: 'Client Name',
    amount_paid: 'Amount Paid',
    payment_method: 'Payment Method',
  },
  engagement: {
    title: 'Engagement Letter',
    subtitle: 'Engagement de Location de Véhicule',
    engagement_number: 'Engagement Number',
    client_name: 'Client Name',
    client_label: 'Informations du Client:',
    vehicle_info: 'Vehicle Information',
    vehicle_label: 'Informations du Véhicule:',
    commitment_date: 'Date',
    terms_conditions: 'Terms & Conditions',
    terms_label: 'Conditions et Engagements:',
    signature_label: 'Signature du Client:',
    signature_line: '_______________________________',
    date_label: 'Date:',
    date_line: '____________________',
  },
};

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  documentType,
  invoice,
  onEditTemplate,
  lang = 'fr',
}) => {
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [agencySettings, setAgencySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [documentType]);

  const loadAllData = async () => {
    setLoading(true);
    setDataLoaded(false);

    try {
      // Get current user's agency
      const { data: userData } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', userData?.user?.id)
        .single();

      const currentAgencyId = userProfile?.agency_id || '';
      setAgencyId(currentAgencyId);

      // Load template with agency context
      const docTemplate = await DocumentTemplateService.getDocumentTemplate(documentType, currentAgencyId);
      
      // Load agency settings
      const { data: agencyData, error: agencyError } = await supabase
        .from('agency_settings')
        .select('agency_name, logo, address, phone')
        .limit(1)
        .single();

      if (agencyError) {
        console.error('DocumentRenderer: Error fetching agency_settings:', agencyError);
      }

      setTemplate(docTemplate);
      setAgencySettings(agencyData);
      setDataLoaded(true);

      console.log('DocumentRenderer loaded data:', {
        template: !!docTemplate,
        agencySettings: agencyData,
        agencyName: agencyData?.agency_name,
        logoUrl: agencyData?.logo
      });
    } catch (error) {
      console.error('DocumentRenderer: Error loading data:', error);
      console.error('DocumentRenderer: Detailed error:', {
        message: error?.message,
        stack: error?.stack,
        documentType
      });
      // Fallback to default template on error
      setTemplate(DocumentTemplateService.getDefaultTemplate(documentType));
      setDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const getFieldValue = (fieldName: string): string => {
    // Check for custom fields or fields with customText
    if (fieldName.startsWith('custom_') || template?.[fieldName]?.customText) {
      return template?.[fieldName]?.customText || '';
    }

    // Map standard fields to invoice data
    switch (fieldName) {
      case 'client_name':
        return invoice.clientName || 'N/A';
      case 'car_model':
      case 'vehicle_info':
        return invoice.carInfo || 'N/A';
      case 'invoice_number':
      case 'quote_number':
      case 'receipt_number':
      case 'engagement_number':
        return invoice.invoiceNumber || 'N/A';
      case 'invoice_date':
      case 'receipt_date':
      case 'commitment_date':
        return invoice.date || 'N/A';
      case 'amount_due':
      case 'amount_paid':
      case 'price_total':
        return `${invoice.totalAmount.toLocaleString('fr-FR')} DA`;
      case 'rental_dates':
        return invoice.date || 'N/A';
      case 'validity_date':
        return 'Valid for 30 days';
      case 'payment_terms':
      case 'payment_method':
        return 'Cash or Card';
      case 'signature_line':
        return '_____________________';
      case 'terms_conditions':
        return 'Le client s\'engage à respecter toutes les conditions de location, y compris les règles de conduite, les délais de retour, et les responsabilités financières. Tout dommage ou infraction entraînera des frais supplémentaires.';
      default:
        return FIELD_VALUE_MAPPING[documentType][fieldName] || '';
    }
  };

  if (loading || !dataLoaded) {
    return <div className="animate-pulse bg-gray-200 h-96 rounded"></div>;
  }

  // Specialized render for contract - using template from database
  if (documentType === 'contrat') {
    return (
      <div className="relative">
        {/* Document Container */}
        <div className="relative bg-white border-2 border-gray-300 p-8 shadow-lg rounded print:shadow-none print:border-none" style={{ minHeight: '1400px' }}>
          
          {/* Header with Logo and Agency Info */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b-4 border-blue-600">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-blue-900 mb-2">
                {agencySettings?.agency_name || 'SARL OUKKAL LISAYARAT'}
              </h1>
              <p className="text-sm text-gray-600 mb-1 font-semibold">MHD-AUTO</p>
              {agencySettings?.address && (
                <p className="text-sm text-gray-700 mb-1">
                  📍 {agencySettings.address}
                </p>
              )}
              {agencySettings?.phone && (
                <p className="text-sm text-gray-700">
                  📞 Tél: {agencySettings.phone}
                </p>
              )}
            </div>
            {agencySettings?.logo && (
              <div className="ml-6">
                <img
                  src={agencySettings.logo}
                  alt="Agency Logo"
                  style={{ height: 90, width: 'auto' }}
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Template Edit Button */}
          {onEditTemplate && (
            <button
              onClick={onEditTemplate}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10 flex items-center gap-2 text-gray-600 hover:text-gray-900"
              title="Edit template"
            >
              <Edit2 size={16} /> Edit Template
            </button>
          )}

          {/* Dynamically Rendered Template Fields from Database */}
          {template && (
            <div style={{ position: 'relative', minHeight: '1100px' }}>
              {Object.entries(template).map(([fieldName, fieldValue]) => {
                const field = fieldValue as any;
                const fieldContent = getFieldValue(fieldName);

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
                      backgroundColor: field.backgroundColor || 'transparent',
                      maxWidth: `${field.maxWidth || 300}px`,
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                    }}
                  >
                    <p className="m-0">{fieldContent}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer - Signature Section */}
          <div className="border-t-2 border-gray-300 pt-8 mt-12">
            <div className="grid grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-8">توقيع السائق</p>
                <p className="text-xs text-gray-600 mb-8">Signature Conducteur</p>
                <div className="border-b-2 border-gray-900 h-2"></div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 mb-8">توقيع الوكالة</p>
                <p className="text-xs text-gray-600 mb-8">Signature Agence</p>
                <div className="border-b-2 border-gray-900 h-2"></div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 mb-8">التاريخ</p>
                <p className="text-xs text-gray-600 mb-8">Date</p>
                <div className="border-b-2 border-gray-900 h-2"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Print Button */}
        <div className="mt-4 flex gap-4">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors"
          >
            <Printer size={16} /> Print Document
          </button>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            .relative {
              box-shadow: none !important;
              border: none !important;
            }
            button {
              display: none !important;
            }
          }
        `}</style>
      </div>
    );
  }

  // Default render for other document types
  return (
    <div className="relative">
      {/* Document Container */}
      <div className="relative bg-white border-2 border-gray-300 p-8 shadow-lg rounded" style={{ minHeight: '600px' }}>
        {/* Agency Header - Always render with defaults except for engagement */}
        {documentType !== 'engagement' && (
          <div className="document-header mb-8 pb-4 border-b-2 border-gray-300" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {agencySettings?.agency_name || 'LuxDrive Premium Car Rental'}
                </h1>
                {agencySettings?.address && (
                  <p className="text-gray-700 mb-1">
                    {agencySettings.address}
                  </p>
                )}
                {agencySettings?.phone && (
                  <p className="text-gray-700">
                    Tél: {agencySettings.phone}
                  </p>
                )}
              </div>
              {agencySettings?.logo && (
                <div className="ml-4">
                  <img
                    src={agencySettings.logo}
                    alt="Agency Logo"
                    style={{ height: 70 }}
                    className="object-contain"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Template Edit Button */}
        {onEditTemplate && (
          <button
            onClick={onEditTemplate}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10 flex items-center gap-2 text-gray-600 hover:text-gray-900"
            title="Edit template"
          >
            <Edit2 size={16} /> Edit Template
          </button>
        )}

        {/* Rendered Fields */}
        {template &&
          Object.entries(template).map(([fieldName, fieldValue]) => {
            const field = fieldValue as any;
            return (
              <div
                key={fieldName}
                className="absolute whitespace-pre-wrap break-words"
                style={{
                  left: `${field.x}px`,
                  top: `${field.y}px`,
                  color: field.color || '#000000',
                  fontSize: `${field.fontSize || 12}px`,
                  fontWeight: field.fontWeight || 'normal',
                  textAlign: field.textAlign || 'left',
                  maxWidth: `${field.maxWidth || 200}px`,
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                {getFieldValue(fieldName)}
              </div>
            );
          })}

        {/* Fallback if no template */}
        {!template && (
          <div className="text-center text-gray-500 pt-12">
            <p>No template found for {documentType}</p>
          </div>
        )}
      </div>

      {/* Print Button */}
      <div className="mt-4 flex gap-4">
        <button
          onClick={() => window.print()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors"
        >
          <Printer size={16} /> Print Document
        </button>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .relative {
            box-shadow: none !important;
            border: none !important;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
