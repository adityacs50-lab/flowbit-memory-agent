# Invoice Memory Learning System

AI-powered invoice processing system that learns from human corrections to improve automation over time.

## Overview

This system implements a memory-driven learning layer for invoice processing. Instead of treating each invoice as a new entity, it learns patterns from past corrections and applies them to future invoices, reducing manual review requirements.

## Architecture

### Memory Types

1. **Vendor Memory**: Vendor-specific patterns
   - Field mappings (e.g., "Leistungsdatum" → serviceDate)
   - Calculation behaviors (e.g., VAT included vs. excluded)
   - SKU mappings (e.g., "Seefracht" → FREIGHT)

2. **Correction Memory**: General correction patterns
   - Tax recalculation rules
   - Field extraction patterns
   - Validation rules

3. **Resolution Memory**: Historical decision tracking
   - How issues were resolved
   - Human approval/rejection patterns
   - Success rates

### Processing Pipeline

```
Invoice Input
    ↓
1. RECALL: Retrieve relevant memories from database
    ↓
2. APPLY: Normalize invoice using learned patterns
    ↓
3. DECIDE: Determine if auto-accept, auto-correct, or escalate
    ↓
4. LEARN: Store new insights from human corrections
    ↓
Output: Normalized invoice + audit trail
```

### Decision Logic

- **Auto-Accept** (confidence ≥ 0.8, no corrections): Process without review
- **Auto-Correct** (confidence 0.5-0.8, corrections applied): Process but log for audit
- **Escalate** (confidence < 0.5 or issues detected): Require human review

### Confidence Scoring

- Base: Extraction confidence from OCR/parser
- Boosted by: Number and quality of applied memories
- Factors: Memory usage count, recency, success rate
- Range: 0.0 (low) to 1.0 (high), capped at 0.95

## Setup

```bash
npm install
npm run demo
```

## Tech Stack

- **TypeScript** (strict mode)
- **Node.js** runtime
- **SQLite** (better-sqlite3) for persistence
- **No external AI/ML** - rule-based heuristics

## Demonstration Scenarios

The demo script shows learning across 7 scenarios:

1. **Supplier GmbH - Leistungsdatum**: Field mapping learning
2. **Supplier GmbH - PO Matching**: Intelligent PO inference
3. **Parts AG - VAT Included**: Tax recalculation pattern
4. **Parts AG - Currency Recovery**: Field extraction from text
5. **Freight & Co - Skonto Terms**: Payment terms detection
6. **Freight & Co - SKU Mapping**: Description-to-SKU learning
7. **Duplicate Detection**: Prevents reprocessing

## Expected Outcomes

✅ **Supplier GmbH**: After learning from INV-A-001, system auto-fills serviceDate from "Leistungsdatum"  
✅ **Supplier GmbH**: INV-A-003 auto-matches to PO-A-051 based on items  
✅ **Parts AG**: "MwSt. inkl." triggers automatic tax recalculation  
✅ **Parts AG**: Missing currency recovered from rawText  
✅ **Freight & Co**: Skonto terms detected and structured  
✅ **Freight & Co**: "Seefracht/Shipping" → FREIGHT with confidence tracking  
✅ **Duplicates**: INV-A-004 and INV-B-004 flagged as duplicates  

## Design Decisions

### Why SQLite?
- Lightweight, no server setup
- ACID compliance for audit trail
- Easy to inspect and debug
- Portable single-file database

### Why Rule-Based (No ML)?
- Explainable decisions (required for auditing)
- No training data needed upfront
- Deterministic behavior
- Easy to debug and modify

### Confidence Evolution
- New memories start at 0.6-0.7
- Successful applications: +0.1 (capped at 0.95)
- Unused for 90 days: -0.05 (decay)
- Failed applications: -0.2

### Audit Trail
Every processing step logged with:
- Timestamp
- Action taken
- Reasoning
- Confidence scores
- Memory IDs used

## File Structure

```
flowbit-memory-agent/
├── src/
│   ├── types/index.ts          # TypeScript interfaces
│   ├── database/db.ts          # SQLite operations
│   ├── memory/
│   │   ├── recall.ts           # Memory retrieval
│   │   ├── apply.ts            # Pattern application
│   │   └── learn.ts            # Learning from corrections
│   └── processor/
│       ├── decision.ts         # Decision engine
│       └── index.ts            # Main orchestrator
├── data/
│   ├── invoices_extracted.json
│   ├── purchase_orders.json
│   ├── delivery_notes.json
│   └── human_corrections.json
├── demo.ts                     # Demonstration runner
├── memory.db                   # SQLite database (generated)
└── README.md
```

## Output Contract

Every processed invoice returns:

```json
{
  "normalizedInvoice": { /* corrected invoice */ },
  "proposedCorrections": ["correction 1", "correction 2"],
  "requiresHumanReview": true,
  "reasoning": "Detailed explanation of decisions",
  "confidenceScore": 0.75,
  "memoryUpdates": ["memory update 1"],
  "auditTrail": [
    {
      "step": "recall|apply|decide|learn",
      "timestamp": "2024-12-25T10:30:00Z",
      "details": "Action details"
    }
  ]
}
```

## Future Enhancements

- Memory decay based on time and failure rate
- Confidence threshold auto-tuning
- Memory conflict resolution
- Web UI for memory visualization
- Export/import memory databases
- Multi-tenant memory isolation

## Author

Aditya Shinde  
AI Agent Development Internship Assignment  
Flowbit Private Limited

