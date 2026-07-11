import { supabase } from '../supabase';
import { DocumentTemplates, DocumentTemplate, DocumentField, DocumentType, AgencySettings } from '../types';

export interface SavedDocumentTemplate {
  id: string;
  agency_id: string;
  template_type: DocumentType;
  template: DocumentTemplate;
  created_at: string;
  updated_at: string;
}

export class DocumentTemplateService {
  /**
   * Get all document templates for the current agency
   */
  static async getDocumentTemplates(): Promise<DocumentTemplates> {
    const { data, error } = await supabase
      .from('agency_settings')
      .select('document_templates')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching document templates:', error);
      return {};
    }

    return data?.document_templates || {};
  }

  /**
   * Get all saved templates for a specific document type from database
   */
  static async getSavedTemplates(documentType: DocumentType, agencyId?: string): Promise<SavedDocumentTemplate[]> {
    let query = supabase
      .from('document_templates')
      .select('*')
      .eq('template_type', documentType);

    if (agencyId) {
      query = query.eq('agency_id', agencyId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved templates:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Save a new document template to the database
   */
  static async saveTemplate(
    documentType: DocumentType,
    template: DocumentTemplate,
    agencyId: string
  ): Promise<SavedDocumentTemplate> {
    const { data, error } = await supabase
      .from('document_templates')
      .insert({
        agency_id: agencyId,
        template_type: documentType,
        template: template,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save template: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing saved template
   */
  static async updateSavedTemplate(
    templateId: string,
    template: DocumentTemplate
  ): Promise<SavedDocumentTemplate> {
    const { data, error } = await supabase
      .from('document_templates')
      .update({
        template: template,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a saved template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Get a specific saved template by ID
   */
  static async getTemplateById(templateId: string): Promise<SavedDocumentTemplate | null> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }

    return data || null;
  }

  /**
   * Get a specific document type template with fallback to defaults
   * Loads from the document_templates table first, then falls back to defaults
   */
  static async getDocumentTemplate(documentType: DocumentType, agencyId?: string): Promise<DocumentTemplate> {
    try {
      // First, try to load saved template from document_templates table
      let query = supabase
        .from('document_templates')
        .select('template')
        .eq('template_type', documentType);

      if (agencyId) {
        query = query.eq('agency_id', agencyId);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).single();

      if (data && !error) {
        console.log(`Loaded saved template for ${documentType} from database`);
        return data.template;
      }
    } catch (error) {
      console.log(`No saved template found for ${documentType}, using default`);
    }

    // Fall back to default template
    return this.getDefaultTemplate(documentType);
  }

  /**
   * Get default template for a document type
   */
  static getDefaultTemplate(documentType: DocumentType): DocumentTemplate {
    const defaultTemplates: DocumentTemplates = {
      contrat: {
        title: { x: 120, y: 40, color: '#000000', fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },
        client_name: { x: 80, y: 140, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        car_model: { x: 80, y: 180, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        rental_dates: { x: 80, y: 220, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        price_total: { x: 80, y: 260, color: '#000000', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        signature_line: { x: 80, y: 450, color: '#000000', fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      },
      devis: {
        title: { x: 120, y: 40, color: '#000000', fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },
        quote_number: { x: 80, y: 100, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        client_name: { x: 80, y: 140, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        car_model: { x: 80, y: 180, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        validity_date: { x: 80, y: 220, color: '#000000', fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        price_total: { x: 80, y: 260, color: '#000000', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      },
      facture: {
        title: { x: 120, y: 40, color: '#000000', fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },
        invoice_number: { x: 80, y: 100, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        invoice_date: { x: 80, y: 120, color: '#000000', fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        client_name: { x: 80, y: 160, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        car_model: { x: 80, y: 200, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        amount_due: { x: 80, y: 380, color: '#000000', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        payment_terms: { x: 80, y: 420, color: '#000000', fontSize: 10, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      },
      recu: {
        logo: { x: 50, y: 50, width: 100, height: 100 },
        agenceName: { x: 200, y: 100, text: 'LUXDRIVE PREMIUM CAR RENTAL', fontSize: 18, fontFamily: 'Arial', color: '#333333', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        title: { x: 120, y: 40, color: '#000000', fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },
        receipt_number: { x: 80, y: 100, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        receipt_date: { x: 80, y: 120, color: '#000000', fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        client_name: { x: 80, y: 160, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        amount_paid: { x: 80, y: 200, color: '#000000', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        payment_method: { x: 80, y: 240, color: '#000000', fontSize: 11, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        totalLabel: { x: 80, y: 280, color: '#000000', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        totalAmount: { x: 200, y: 280, color: '#0066cc', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        paidLabel: { x: 80, y: 320, color: '#000000', fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        paidAmount: { x: 200, y: 320, color: '#00aa00', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        remainingLabel: { x: 80, y: 360, color: '#000000', fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        remainingAmount: { x: 200, y: 360, color: '#cc0000', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
      },
      engagement: {
        // Header section - centered and prominent
        title: { x: 200, y: 120, color: '#1a365d', fontSize: 28, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent' },
        subtitle: { x: 200, y: 160, color: '#4a5568', fontSize: 16, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'center', backgroundColor: 'transparent', customText: 'Engagement de Location de Véhicule' },

        // Document info - left aligned
        engagement_number: { x: 50, y: 220, color: '#2d3748', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },
        commitment_date: { x: 50, y: 250, color: '#2d3748', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },

        // Client information section
        client_label: { x: 50, y: 300, color: '#1a365d', fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'underline', textAlign: 'left', backgroundColor: 'transparent', customText: 'Informations du Client:' },
        client_name: { x: 50, y: 330, color: '#2d3748', fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },

        // Vehicle information section
        vehicle_label: { x: 50, y: 380, color: '#1a365d', fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'underline', textAlign: 'left', backgroundColor: 'transparent', customText: 'Informations du Véhicule:' },
        vehicle_info: { x: 50, y: 410, color: '#2d3748', fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent' },

        // Terms and conditions
        terms_label: { x: 50, y: 470, color: '#1a365d', fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'underline', textAlign: 'left', backgroundColor: 'transparent', customText: 'Conditions et Engagements:' },
        terms_conditions: { x: 50, y: 500, color: '#2d3748', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent', maxWidth: 500 },

        // Signature section
        signature_label: { x: 50, y: 580, color: '#1a365d', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent', customText: 'Signature du Client:' },
        signature_line: { x: 50, y: 610, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent', customText: '_______________________________' },

        // Date section
        date_label: { x: 400, y: 580, color: '#1a365d', fontSize: 14, fontFamily: 'Arial', fontWeight: 'bold', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent', customText: 'Date:' },
        date_line: { x: 400, y: 610, color: '#000000', fontSize: 12, fontFamily: 'Arial', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none', textAlign: 'left', backgroundColor: 'transparent', customText: '____________________' },
      },
    };

    return defaultTemplates[documentType] || {};
  }

  /**
   * Update document templates for all document types
   */
  static async updateDocumentTemplates(templates: DocumentTemplates): Promise<DocumentTemplates> {
    const { data, error } = await supabase
      .from('agency_settings')
      .update({ document_templates: templates, updated_at: new Date().toISOString() })
      .limit(1)
      .select('document_templates')
      .single();

    if (error) {
      throw new Error(`Failed to update document templates: ${error.message}`);
    }

    return data?.document_templates || {};
  }

  /**
   * Update a specific document type template
   */
  static async updateDocumentType(
    documentType: DocumentType,
    template: DocumentTemplate
  ): Promise<DocumentTemplates> {
    const allTemplates = await this.getDocumentTemplates();
    const updatedTemplates = {
      ...allTemplates,
      [documentType]: template,
    };

    return this.updateDocumentTemplates(updatedTemplates);
  }

  /**
   * Update a specific field in a document template
   */
  static async updateDocumentField(
    documentType: DocumentType,
    fieldName: string,
    fieldConfig: DocumentField
  ): Promise<DocumentTemplates> {
    const allTemplates = await this.getDocumentTemplates();
    const template = allTemplates[documentType] || {};

    const updatedTemplate = {
      ...template,
      [fieldName]: fieldConfig,
    };

    return this.updateDocumentType(documentType, updatedTemplate);
  }

  /**
   * Add a custom text block to a document template
   */
  static async addCustomTextField(
    documentType: DocumentType,
    customFieldName: string,
    fieldConfig: DocumentField
  ): Promise<DocumentTemplates> {
    return this.updateDocumentField(documentType, customFieldName, fieldConfig);
  }

  /**
   * Remove a custom field from a document template
   */
  static async removeCustomField(
    documentType: DocumentType,
    fieldName: string
  ): Promise<DocumentTemplates> {
    const allTemplates = await this.getDocumentTemplates();
    const template = allTemplates[documentType] || {};

    const { [fieldName]: removed, ...updatedTemplate } = template;

    return this.updateDocumentType(documentType, updatedTemplate);
  }

  /**
   * Reset a document type template to defaults
   */
  static async resetDocumentType(documentType: DocumentType): Promise<DocumentTemplates> {
    const defaultTemplate = this.getDefaultTemplate(documentType);
    return this.updateDocumentType(documentType, defaultTemplate);
  }

  /**
   * Get agency settings including document templates
   */
  static async getAgencySettings(): Promise<AgencySettings | null> {
    const { data, error } = await supabase
      .from('agency_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching agency settings:', error);
      return null;
    }

    return data ? {
      id: data.id,
      agencyName: data.agency_name,
      slogan: data.slogan,
      address: data.address,
      phone: data.phone,
      logo: data.logo,
      documentTemplates: data.document_templates,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    } : null;
  }
}
