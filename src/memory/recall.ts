import { Database } from '../database/db';
import { Invoice, RecalledMemories } from '../types';
import { getVendorMemories, getCorrectionMemories, getResolutionMemories } from '../database/db';

export function recallMemories(db: Database, invoice: Invoice): RecalledMemories {
  // Recall vendor-specific memories
  const vendorMemories = getVendorMemories(db, invoice.vendor);
  
  // Recall general correction patterns
  const correctionMemories = getCorrectionMemories(db);
  
  // Recall resolution memories
  const resolutionMemories = getResolutionMemories(db);

  return {
    vendorMemories: vendorMemories.slice(0, 10),
    correctionMemories: correctionMemories.slice(0, 10),
    resolutionMemories: resolutionMemories.slice(0, 10)
  };
}

