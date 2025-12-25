export interface LineItem {
  sku?: string;
  description?: string;
  qty: number;
  unitPrice: number;
  qtyDelivered?: number;
}

export interface InvoiceFields {
  invoiceNumber: string;
  invoiceDate: string;
  serviceDate?: string | null;
  currency?: string | null;
  poNumber?: string | null;
  netTotal: number;
  taxRate: number;
  taxTotal: number;
  grossTotal: number;
  lineItems: LineItem[];
  discountTerms?: string | null;
}

export interface Invoice {
  invoiceId: string;
  vendor: string;
  fields: InvoiceFields;
  confidence: number;
  rawText: string;
}

export interface VendorMemory {
  id?: number;
  vendorName: string;
  patternType: 'field_mapping' | 'calculation' | 'behavior';
  patternKey: string;
  patternValue: string;
  confidence: number;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

export interface CorrectionMemory {
  id?: number;
  correctionType: string;
  condition: string;
  action: string;
  confidence: number;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

export interface ResolutionMemory {
  id?: number;
  issueType: string;
  resolution: string;
  humanApproved: boolean;
  confidence: number;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

export interface AuditTrailEntry {
  step: 'recall' | 'apply' | 'decide' | 'learn';
  timestamp: string;
  details: string;
}

export interface ProcessingResult {
  normalizedInvoice: Invoice;
  proposedCorrections: string[];
  requiresHumanReview: boolean;
  reasoning: string;
  confidenceScore: number;
  memoryUpdates: string[];
  auditTrail: AuditTrailEntry[];
}

export interface Correction {
  field: string;
  from: any;
  to: any;
  reason: string;
}

export interface HumanCorrection {
  invoiceId: string;
  vendor: string;
  corrections: Correction[];
  finalDecision: 'approved' | 'rejected';
}

export interface PurchaseOrder {
  poNumber: string;
  vendor: string;
  date: string;
  lineItems: LineItem[];
}

export interface DeliveryNote {
  dnNumber: string;
  vendor: string;
  poNumber: string;
  date: string;
  lineItems: LineItem[];
}

export interface RecalledMemories {
  vendorMemories: VendorMemory[];
  correctionMemories: CorrectionMemory[];
  resolutionMemories: ResolutionMemory[];
}

