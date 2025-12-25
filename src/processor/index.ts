import { Database } from '../database/db';
import { Invoice, ProcessingResult, AuditTrailEntry, HumanCorrection, PurchaseOrder } from '../types';
import { recallMemories } from '../memory/recall';
import { applyMemories } from '../memory/apply';
import { makeDecision } from './decision';
import { learnFromCorrection } from '../memory/learn';
import { insertAuditLog, markInvoiceProcessed } from '../database/db';

export class InvoiceProcessor {
  constructor(private db: Database) {}

  processInvoice(invoice: Invoice, purchaseOrders: PurchaseOrder[] = []): ProcessingResult {
    const auditTrail: AuditTrailEntry[] = [];
    const startTime = new Date().toISOString();

    // Step 1: Recall memories
    const memories = recallMemories(this.db, invoice);
    auditTrail.push({
      step: 'recall',
      timestamp: new Date().toISOString(),
      details: `Recalled ${memories.vendorMemories.length} vendor memories, ${memories.correctionMemories.length} correction patterns, ${memories.resolutionMemories.length} resolutions`
    });
    insertAuditLog(this.db, invoice.invoiceId, 'recall', `Retrieved ${memories.vendorMemories.length + memories.correctionMemories.length + memories.resolutionMemories.length} total memories`);

    // Step 2: Apply memories
    const applicationResult = applyMemories(invoice, memories, purchaseOrders);
    auditTrail.push({
      step: 'apply',
      timestamp: new Date().toISOString(),
      details: `Applied memories: ${applicationResult.proposedCorrections.length} corrections proposed. ${applicationResult.reasoning}`
    });
    insertAuditLog(this.db, invoice.invoiceId, 'apply', `Applied ${applicationResult.proposedCorrections.length} corrections`);

    // Step 3: Make decision
    const decision = makeDecision(
      this.db,
      applicationResult.normalizedInvoice,
      applicationResult.proposedCorrections,
      applicationResult.confidenceScore
    );
    auditTrail.push({
      step: 'decide',
      timestamp: new Date().toISOString(),
      details: `Decision: ${decision.action}. ${decision.reasoning}`
    });
    insertAuditLog(this.db, invoice.invoiceId, 'decide', `Action: ${decision.action}, Review: ${decision.requiresHumanReview}`);

    // Mark as processed if not duplicate
    if (!decision.reasoning.includes('DUPLICATE')) {
      markInvoiceProcessed(
        this.db,
        invoice.invoiceId,
        invoice.vendor,
        invoice.fields.invoiceNumber,
        invoice.fields.invoiceDate
      );
    }

    return {
      normalizedInvoice: applicationResult.normalizedInvoice,
      proposedCorrections: applicationResult.proposedCorrections,
      requiresHumanReview: decision.requiresHumanReview,
      reasoning: `${decision.reasoning} ${applicationResult.reasoning}`,
      confidenceScore: applicationResult.confidenceScore,
      memoryUpdates: [],
      auditTrail
    };
  }

  applyHumanCorrection(correction: HumanCorrection): string[] {
    const auditTrail: AuditTrailEntry[] = [];
    
    // Learn from correction
    const memoryUpdates = learnFromCorrection(this.db, correction);
    
    auditTrail.push({
      step: 'learn',
      timestamp: new Date().toISOString(),
      details: `Learned from human correction: ${memoryUpdates.join('; ')}`
    });
    insertAuditLog(this.db, correction.invoiceId, 'learn', memoryUpdates.join('; '));

    return memoryUpdates;
  }
}

