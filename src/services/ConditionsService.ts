import { TemplateService, DocumentTemplateRow } from './TemplateService_v2';
import { RenderService } from './RenderService_v2';
import { DocumentType } from '../types';

/**
 * ConditionsService
 * 
 * Handles appending standard conditions/terms to documents
 * when template.has_conditions = true
 */
export class ConditionsService {
  /**
   * Get conditions template for an agency
   * Always fetches the default engagement template
   * Throws error if not found
   */
  static async getConditionsTemplate(agencyId: string): Promise<DocumentTemplateRow> {
    return TemplateService.getDefaultTemplate('engagement', agencyId);
  }

  /**
   * Append conditions to HTML if needed
   * 
   * @param html - Main document HTML
   * @param hasConditions - Whether to append conditions
   * @param data - Data for rendering conditions
   * @param agencyId - Agency ID
   * @returns HTML with conditions appended (if hasConditions=true)
   */
  static async appendConditionsIfNeeded(
    html: string,
    hasConditions: boolean,
    data: Record<string, any>,
    agencyId: string
  ): Promise<string> {
    if (!hasConditions) {
      return html;
    }

    try {
      // Fetch conditions template
      const conditionsTemplate = await this.getConditionsTemplate(agencyId);

      // Render conditions with data
      const renderedConditions = RenderService.renderTemplate(
        conditionsTemplate.template.html,
        data
      );

      // Append with separator
      return html + '\n<hr />\n' + renderedConditions;
    } catch (error) {
      console.error('Error appending conditions:', error);
      // Don't fail - just return original HTML
      return html;
    }
  }

  /**
   * Build a complete document with conditions
   * 
   * @param mainTemplate - Main document template
   * @param data - Data to render with
   * @param agencyId - Agency ID
   * @returns Complete HTML with conditions
   */
  static async buildCompleteDocument(
    mainTemplate: DocumentTemplateRow,
    data: Record<string, any>,
    agencyId: string
  ): Promise<string> {
    // Render main template
    const mainHtml = RenderService.renderTemplate(mainTemplate.template.html, data);

    // Append conditions if needed
    return this.appendConditionsIfNeeded(mainHtml, mainTemplate.has_conditions, data, agencyId);
  }

  /**
   * Check if conditions would be appended
   */
  static async conditionsWillBeApplied(
    hasConditions: boolean,
    agencyId: string
  ): Promise<boolean> {
    if (!hasConditions) return false;

    try {
      await this.getConditionsTemplate(agencyId);
      return true;
    } catch {
      return false;
    }
  }
}
