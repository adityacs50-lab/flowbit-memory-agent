import { Database } from '../database/db';
import { Invoice } from '../types';
import { checkDuplicateInvoice } from '../database/db';

export interface DecisionResult {
  requiresHumanReview: boolean;
  reasoning: string;
  action: 'auto-accept' | 'auto-correct' | 'escalate';
}

export function makeDecision(
  db: Database,
  normalizedInvoice: Invoice,
  corrections: string[],
  confidenceScore: number
): DecisionResult {
  const issues: string[] = [];

  // Check for duplicates
  const isDuplicate = checkDuplicateInvoice(
    db,
    normalizedInvoice.vendor,
    normalizedInvoice.fields.invoiceNumber,
    normalizedInvoice.fields.invoiceDate
  );

  if (isDuplicate) {
    return {
      requiresHumanReview: true,
      reasoning: `DUPLICATE DETECTED: Invoice ${normalizedInvoice.fields.invoiceNumber} from ${normalizedInvoice.vendor} already processed.`,
      action: 'escalate'
    };
  }

  // Check for missing required fields
  if (!normalizedInvoice.fields.invoiceNumber) issues.push('missing invoiceNumber');
  if (!normalizedInvoice.fields.grossTotal) issues.push('missing grossTotal');
  if (!normalizedInvoice.fields.currency) issues.push('missing currency');

  // Check for negative amounts
  if (normalizedInvoice.fields.grossTotal < 0) issues.push('negative grossTotal');

  // Check for tax calculation discrepancies
  const expectedTax = normalizedInvoice.fields.netTotal * normalizedInvoice.fields.taxRate;
  const taxDiscrepancy = Math.abs(expectedTax - normalizedInvoice.fields.taxTotal);
  const taxDiscrepancyPercent = (taxDiscrepancy / expectedTax) * 100;
  
  if (taxDiscrepancyPercent > 5) {
    issues.push(`tax calculation discrepancy ${taxDiscrepancyPercent.toFixed(1)}%`);
  }

  // Decision logic
  if (issues.length > 0) {
    return {
      requiresHumanReview: true,
      reasoning: `Issues detected: ${issues.join(', ')}. Requires human review.`,
      action: 'escalate'
    };
  }

  if (confidenceScore >= 0.8 && corrections.length === 0) {
    return {
      requiresHumanReview: false,
      reasoning: `High confidence (${confidenceScore.toFixed(2)}), no corrections needed. Auto-accepted.`,
      action: 'auto-accept'
    };
  }

  if (confidenceScore >= 0.5 && corrections.length > 0) {
    return {
      requiresHumanReview: true,
      reasoning: `Applied ${corrections.length} correction(s) with confidence ${confidenceScore.toFixed(2)}. Review recommended for audit.`,
      action: 'auto-correct'
    };
  }

  return {
    requiresHumanReview: true,
    reasoning: `Low confidence (${confidenceScore.toFixed(2)}). Escalating for human review.`,
    action: 'escalate'
  };
}

