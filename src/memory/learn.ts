import { Database } from '../database/db';
import { HumanCorrection, VendorMemory, CorrectionMemory, ResolutionMemory } from '../types';
import { 
  saveVendorMemory, 
  saveCorrectionMemory, 
  saveResolutionMemory,
  findVendorMemoryByPattern,
  updateMemoryConfidence
} from '../database/db';

export function learnFromCorrection(db: Database, correction: HumanCorrection): string[] {
  const memoryUpdates: string[] = [];
  const now = new Date().toISOString();

  for (const cor of correction.corrections) {
    // Learn field mappings (e.g., Leistungsdatum -> serviceDate)
    if (cor.field === 'serviceDate' && cor.reason.includes('Leistungsdatum')) {
      const existing = findVendorMemoryByPattern(db, correction.vendor, 'Leistungsdatum');
      
      if (existing) {
        // Reinforce existing memory
        const newConfidence = Math.min(0.95, existing.confidence + 0.1);
        updateMemoryConfidence(db, 'vendor_memory', existing.id!, newConfidence, true);
        memoryUpdates.push(`Reinforced: ${correction.vendor} - Leistungsdatum pattern (confidence: ${newConfidence.toFixed(2)})`);
      } else {
        // Create new memory
        const memory: Omit<VendorMemory, 'id'> = {
          vendorName: correction.vendor,
          patternType: 'field_mapping',
          patternKey: 'Leistungsdatum',
          patternValue: 'serviceDate',
          confidence: 0.7,
          usageCount: 1,
          lastUsed: now,
          createdAt: now
        };
        saveVendorMemory(db, memory);
        memoryUpdates.push(`Learned: ${correction.vendor} - Leistungsdatum maps to serviceDate`);
      }
    }

    // Learn tax correction patterns
    if ((cor.field === 'taxTotal' || cor.field === 'grossTotal') && cor.reason.includes('VAT included')) {
      const corrMem: Omit<CorrectionMemory, 'id'> = {
        correctionType: 'tax_included',
        condition: 'MwSt. inkl. OR incl. VAT in rawText',
        action: 'recalculate tax from gross total',
        confidence: 0.75,
        usageCount: 1,
        lastUsed: now,
        createdAt: now
      };
      saveCorrectionMemory(db, corrMem);
      memoryUpdates.push('Learned: VAT included correction pattern');
    }

    // Learn currency recovery
    if (cor.field === 'currency' && cor.reason.includes('rawText')) {
      const memory: Omit<VendorMemory, 'id'> = {
        vendorName: correction.vendor,
        patternType: 'field_mapping',
        patternKey: 'currency_extraction',
        patternValue: 'EUR',
        confidence: 0.8,
        usageCount: 1,
        lastUsed: now,
        createdAt: now
      };
      saveVendorMemory(db, memory);
      memoryUpdates.push(`Learned: ${correction.vendor} - currency extraction from rawText`);
    }

    // Learn SKU mappings
    if (cor.field.includes('sku') && cor.reason.includes('Seefracht')) {
      const memory: Omit<VendorMemory, 'id'> = {
        vendorName: correction.vendor,
        patternType: 'field_mapping',
        patternKey: 'Seefracht',
        patternValue: 'FREIGHT',
        confidence: 0.7,
        usageCount: 1,
        lastUsed: now,
        createdAt: now
      };
      saveVendorMemory(db, memory);
      memoryUpdates.push(`Learned: ${correction.vendor} - Seefracht/Shipping maps to FREIGHT SKU`);
    }

    // Learn PO matching
    if (cor.field === 'poNumber' && cor.to) {
      const memory: Omit<VendorMemory, 'id'> = {
        vendorName: correction.vendor,
        patternType: 'behavior',
        patternKey: 'po_matching',
        patternValue: `infer from items and date`,
        confidence: 0.65,
        usageCount: 1,
        lastUsed: now,
        createdAt: now
      };
      saveVendorMemory(db, memory);
      memoryUpdates.push(`Learned: ${correction.vendor} - PO matching pattern`);
    }

    // Learn discount terms
    if (cor.field === 'discountTerms') {
      const memory: Omit<VendorMemory, 'id'> = {
        vendorName: correction.vendor,
        patternType: 'field_mapping',
        patternKey: 'skonto_terms',
        patternValue: cor.to as string,
        confidence: 0.8,
        usageCount: 1,
        lastUsed: now,
        createdAt: now
      };
      saveVendorMemory(db, memory);
      memoryUpdates.push(`Learned: ${correction.vendor} - Skonto terms pattern`);
    }
  }

  // Store resolution
  const resMem: Omit<ResolutionMemory, 'id'> = {
    issueType: correction.corrections.map(c => c.field).join(', '),
    resolution: correction.corrections.map(c => c.reason).join('; '),
    humanApproved: correction.finalDecision === 'approved',
    confidence: 0.7,
    usageCount: 1,
    lastUsed: now,
    createdAt: now
  };
  saveResolutionMemory(db, resMem);
  memoryUpdates.push(`Stored resolution: ${correction.finalDecision}`);

  return memoryUpdates;
}

