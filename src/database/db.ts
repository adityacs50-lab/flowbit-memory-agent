import * as fs from 'fs';
import * as path from 'path';
import { VendorMemory, CorrectionMemory, ResolutionMemory } from '../types';

// File paths for JSON storage
const DATA_DIR = path.join(process.cwd(), 'data');
const VENDOR_MEMORY_FILE = path.join(DATA_DIR, 'vendor_memory.json');
const CORRECTION_MEMORY_FILE = path.join(DATA_DIR, 'correction_memory.json');
const RESOLUTION_MEMORY_FILE = path.join(DATA_DIR, 'resolution_memory.json');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit_log.json');
const PROCESSED_INVOICES_FILE = path.join(DATA_DIR, 'processed_invoices.json');

// In-memory storage (loaded from files)
interface MemoryStorage {
  vendorMemories: VendorMemory[];
  correctionMemories: CorrectionMemory[];
  resolutionMemories: ResolutionMemory[];
  auditLogs: Array<{ id: number; invoice_id: string; step: string; timestamp: string; details: string }>;
  processedInvoices: Array<{ id: number; invoice_id: string; vendor: string; invoice_number: string; invoice_date: string; processed_at: string }>;
  nextVendorId: number;
  nextCorrectionId: number;
  nextResolutionId: number;
  nextAuditId: number;
  nextProcessedId: number;
}

let storage: MemoryStorage = {
  vendorMemories: [],
  correctionMemories: [],
  resolutionMemories: [],
  auditLogs: [],
  processedInvoices: [],
  nextVendorId: 1,
  nextCorrectionId: 1,
  nextResolutionId: 1,
  nextAuditId: 1,
  nextProcessedId: 1
};

// Ensure data directory exists
function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Load data from JSON files
function loadStorage(): void {
  ensureDataDir();
  
  if (fs.existsSync(VENDOR_MEMORY_FILE)) {
    storage.vendorMemories = JSON.parse(fs.readFileSync(VENDOR_MEMORY_FILE, 'utf-8'));
    storage.nextVendorId = Math.max(1, ...storage.vendorMemories.map(m => m.id || 0)) + 1;
  }
  
  if (fs.existsSync(CORRECTION_MEMORY_FILE)) {
    storage.correctionMemories = JSON.parse(fs.readFileSync(CORRECTION_MEMORY_FILE, 'utf-8'));
    storage.nextCorrectionId = Math.max(1, ...storage.correctionMemories.map(m => m.id || 0)) + 1;
  }
  
  if (fs.existsSync(RESOLUTION_MEMORY_FILE)) {
    storage.resolutionMemories = JSON.parse(fs.readFileSync(RESOLUTION_MEMORY_FILE, 'utf-8'));
    storage.nextResolutionId = Math.max(1, ...storage.resolutionMemories.map(m => m.id || 0)) + 1;
  }
  
  if (fs.existsSync(AUDIT_LOG_FILE)) {
    storage.auditLogs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf-8'));
    storage.nextAuditId = Math.max(1, ...storage.auditLogs.map(a => a.id || 0)) + 1;
  }
  
  if (fs.existsSync(PROCESSED_INVOICES_FILE)) {
    storage.processedInvoices = JSON.parse(fs.readFileSync(PROCESSED_INVOICES_FILE, 'utf-8'));
    storage.nextProcessedId = Math.max(1, ...storage.processedInvoices.map(p => p.id || 0)) + 1;
  }
}

// Persist data to JSON files
function persistStorage(): void {
  ensureDataDir();
  fs.writeFileSync(VENDOR_MEMORY_FILE, JSON.stringify(storage.vendorMemories, null, 2), 'utf-8');
  fs.writeFileSync(CORRECTION_MEMORY_FILE, JSON.stringify(storage.correctionMemories, null, 2), 'utf-8');
  fs.writeFileSync(RESOLUTION_MEMORY_FILE, JSON.stringify(storage.resolutionMemories, null, 2), 'utf-8');
  fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(storage.auditLogs, null, 2), 'utf-8');
  fs.writeFileSync(PROCESSED_INVOICES_FILE, JSON.stringify(storage.processedInvoices, null, 2), 'utf-8');
}

// Database interface (compatible with existing code)
// Empty interface - we use file-based storage instead
export interface Database {
  // Marker interface for type compatibility
}

// Initialize database (loads from files)
export function initDatabase(dbPath?: string): Database {
  loadStorage();
  return {} as Database; // Return empty object for compatibility
}

export function getVendorMemories(db: Database, vendorName: string): VendorMemory[] {
  return storage.vendorMemories
    .filter(m => m.vendorName.toLowerCase() === vendorName.toLowerCase() && m.confidence > 0.3)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (!a.lastUsed || !b.lastUsed) return 0;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });
}

export function getCorrectionMemories(db: Database): CorrectionMemory[] {
  return storage.correctionMemories
    .filter(m => m.confidence > 0.3)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (!a.lastUsed || !b.lastUsed) return 0;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });
}

export function getResolutionMemories(db: Database): ResolutionMemory[] {
  return storage.resolutionMemories
    .filter(m => m.confidence > 0.3)
    .sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      if (!a.lastUsed || !b.lastUsed) return 0;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    });
}

export function saveVendorMemory(db: Database, memory: Omit<VendorMemory, 'id'>): number {
  const newMemory: VendorMemory = {
    ...memory,
    id: storage.nextVendorId++
  };
  storage.vendorMemories.push(newMemory);
  persistStorage();
  return newMemory.id!;
}

export function saveCorrectionMemory(db: Database, memory: Omit<CorrectionMemory, 'id'>): number {
  const newMemory: CorrectionMemory = {
    ...memory,
    id: storage.nextCorrectionId++
  };
  storage.correctionMemories.push(newMemory);
  persistStorage();
  return newMemory.id!;
}

export function saveResolutionMemory(db: Database, memory: Omit<ResolutionMemory, 'id'>): number {
  const newMemory: ResolutionMemory = {
    ...memory,
    id: storage.nextResolutionId++
  };
  storage.resolutionMemories.push(newMemory);
  persistStorage();
  return newMemory.id!;
}

export function updateMemoryConfidence(
  db: Database,
  table: string,
  id: number,
  newConfidence: number,
  incrementUsage: boolean = true
): void {
  const now = new Date().toISOString();
  
  if (table === 'vendor_memory') {
    const memory = storage.vendorMemories.find(m => m.id === id);
    if (memory) {
      memory.confidence = newConfidence;
      if (incrementUsage) memory.usageCount++;
      memory.lastUsed = now;
      persistStorage();
    }
  } else if (table === 'correction_memory') {
    const memory = storage.correctionMemories.find(m => m.id === id);
    if (memory) {
      memory.confidence = newConfidence;
      if (incrementUsage) memory.usageCount++;
      memory.lastUsed = now;
      persistStorage();
    }
  } else if (table === 'resolution_memory') {
    const memory = storage.resolutionMemories.find(m => m.id === id);
    if (memory) {
      memory.confidence = newConfidence;
      if (incrementUsage) memory.usageCount++;
      memory.lastUsed = now;
      persistStorage();
    }
  }
}

export function insertAuditLog(db: Database, invoiceId: string, step: string, details: string): void {
  storage.auditLogs.push({
    id: storage.nextAuditId++,
    invoice_id: invoiceId,
    step: step,
    timestamp: new Date().toISOString(),
    details: details
  });
  persistStorage();
}

export function checkDuplicateInvoice(db: Database, vendor: string, invoiceNumber: string, invoiceDate: string): boolean {
  return storage.processedInvoices.some(
    p => p.vendor === vendor && p.invoice_number === invoiceNumber
  );
}

export function markInvoiceProcessed(db: Database, invoiceId: string, vendor: string, invoiceNumber: string, invoiceDate: string): void {
  // Check if already exists
  const exists = storage.processedInvoices.some(p => p.invoice_id === invoiceId);
  if (!exists) {
    storage.processedInvoices.push({
      id: storage.nextProcessedId++,
      invoice_id: invoiceId,
      vendor: vendor,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      processed_at: new Date().toISOString()
    });
    persistStorage();
  }
}

export function findVendorMemoryByPattern(db: Database, vendorName: string, patternKey: string): VendorMemory | null {
  const memory = storage.vendorMemories
    .filter(m => m.vendorName.toLowerCase() === vendorName.toLowerCase() && m.patternKey === patternKey)
    .sort((a, b) => b.confidence - a.confidence)[0];
  return memory || null;
}

// Initialize storage on module load
loadStorage();
