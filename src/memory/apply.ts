import { Invoice, RecalledMemories, VendorMemory } from '../types';

export interface ApplicationResult {
  normalizedInvoice: Invoice;
  proposedCorrections: string[];
  confidenceScore: number;
  reasoning: string;
}

export function applyMemories(invoice: Invoice, memories: RecalledMemories, purchaseOrders: any[]): ApplicationResult {
  const normalizedInvoice = JSON.parse(JSON.stringify(invoice)) as Invoice;
  const proposedCorrections: string[] = [];
  let reasoning = '';
  let confidenceSum = invoice.confidence;
  let confidenceCount = 1;

  // Apply vendor field mappings - Leistungsdatum
  const leistungsdatumMemory = memories.vendorMemories.find(
    m => m.patternKey === 'Leistungsdatum' && m.patternType === 'field_mapping'
  );
  
  if (leistungsdatumMemory && !normalizedInvoice.fields.serviceDate && invoice.rawText.includes('Leistungsdatum')) {
    const match = invoice.rawText.match(/Leistungsdatum:\s*(\d{2}\.\d{2}\.\d{4})/);
    if (match) {
      const dateStr = match[1];
      const [day, month, year] = dateStr.split('.');
      normalizedInvoice.fields.serviceDate = `${year}-${month}-${day}`;
      proposedCorrections.push(`Applied serviceDate from Leistungsdatum pattern (confidence: ${leistungsdatumMemory.confidence.toFixed(2)})`);
      reasoning += `Vendor ${invoice.vendor} uses "Leistungsdatum" for service dates. `;
      confidenceSum += leistungsdatumMemory.confidence;
      confidenceCount++;
    }
  }

  // Apply tax correction for "MwSt. inkl." / "incl. VAT"
  const taxIncludedPattern = /MwSt\.\s*inkl\.|incl\.\s*VAT|VAT already included|Prices incl\. VAT/i;
  if (taxIncludedPattern.test(invoice.rawText)) {
    const taxMemory = memories.correctionMemories.find(m => m.correctionType === 'tax_included');
    if (taxMemory || true) { // Always apply this pattern
      // Recalculate: current grossTotal is actually the final total
      const actualGross = normalizedInvoice.fields.grossTotal;
      const recalcNet = actualGross / (1 + normalizedInvoice.fields.taxRate);
      const recalcTax = actualGross - recalcNet;
      
      if (Math.abs(recalcTax - normalizedInvoice.fields.taxTotal) > 1) {
        normalizedInvoice.fields.netTotal = Math.round(recalcNet * 100) / 100;
        normalizedInvoice.fields.taxTotal = Math.round(recalcTax * 100) / 100;
        proposedCorrections.push(`Recalculated tax: VAT included in total (net: ${normalizedInvoice.fields.netTotal}, tax: ${normalizedInvoice.fields.taxTotal})`);
        reasoning += `Detected "VAT included" pattern - recalculated net and tax from gross total. `;
        confidenceSum += taxMemory?.confidence || 0.7;
        confidenceCount++;
      }
    }
  }

  // Apply currency recovery
  if (!normalizedInvoice.fields.currency && invoice.rawText.includes('EUR')) {
    normalizedInvoice.fields.currency = 'EUR';
    proposedCorrections.push('Recovered currency EUR from rawText');
    reasoning += 'Extracted missing currency from invoice text. ';
    confidenceSum += 0.8;
    confidenceCount++;
  }

  // Apply SKU mapping for freight
  const freightPattern = /Seefracht|Shipping/i;
  if (normalizedInvoice.fields.lineItems.some(item => !item.sku && freightPattern.test(item.description || ''))) {
    const freightMemory = memories.vendorMemories.find(
      m => m.patternKey === 'Seefracht' && m.patternType === 'field_mapping'
    );
    
    normalizedInvoice.fields.lineItems = normalizedInvoice.fields.lineItems.map(item => {
      if (!item.sku && freightPattern.test(item.description || '')) {
        return { ...item, sku: 'FREIGHT' };
      }
      return item;
    });
    
    if (freightMemory) {
      proposedCorrections.push(`Mapped "Seefracht/Shipping" to SKU FREIGHT (confidence: ${freightMemory.confidence.toFixed(2)})`);
      reasoning += 'Applied learned freight description mapping. ';
      confidenceSum += freightMemory.confidence;
      confidenceCount++;
    }
  }

  // Apply PO matching for single matching PO
  if (!normalizedInvoice.fields.poNumber && purchaseOrders.length > 0) {
    const matchingPOs = purchaseOrders.filter(po => 
      po.vendor === invoice.vendor &&
      po.lineItems.some((poItem: any) => 
        normalizedInvoice.fields.lineItems.some(invItem => 
          invItem.sku === poItem.sku && invItem.qty === poItem.qty
        )
      )
    );

    if (matchingPOs.length === 1) {
      normalizedInvoice.fields.poNumber = matchingPOs[0].poNumber;
      proposedCorrections.push(`Matched to PO ${matchingPOs[0].poNumber} (single matching PO with same items)`);
      reasoning += `Auto-matched to PO based on vendor and line items. `;
      confidenceSum += 0.75;
      confidenceCount++;
    }
  }

  // Extract Skonto/discount terms
  const skontoPattern = /(\d+)%\s*Skonto.*?(\d+)\s*days/i;
  const skontoMatch = invoice.rawText.match(skontoPattern);
  if (skontoMatch && !normalizedInvoice.fields.discountTerms) {
    normalizedInvoice.fields.discountTerms = `${skontoMatch[1]}% Skonto within ${skontoMatch[2]} days`;
    proposedCorrections.push(`Extracted discount terms: ${normalizedInvoice.fields.discountTerms}`);
    reasoning += 'Detected and stored Skonto payment terms. ';
    confidenceSum += 0.8;
    confidenceCount++;
  }

  const confidenceScore = confidenceSum / confidenceCount;

  return {
    normalizedInvoice,
    proposedCorrections,
    confidenceScore,
    reasoning: reasoning.trim() || 'No memory-based corrections applied.'
  };
}

