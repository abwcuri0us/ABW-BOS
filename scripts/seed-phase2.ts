/**
 * ABW-BOS Seed Phase 2
 * Seeds GL accounts, warehouses, products, and sample invoices.
 * Run AFTER the initial seed.ts.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Phase 2 data (GL, Inventory, Invoicing)...");

  const admin = await prisma.user.findFirst({ where: { username: "admin" } });
  if (!admin) throw new Error("Run scripts/seed.ts first (admin user not found)");

  // ─── GL Accounts ──────────────────────────────────────────────
  const accounts = [
    // Assets
    { code: "1000", name: "Current Assets", accountType: "asset", subType: "current_asset", isGroup: true, openingBalance: 0 },
    { code: "1100", name: "Cash on Hand", accountType: "asset", subType: "current_asset", parentCode: "1000", openingBalance: 250000 },
    { code: "1200", name: "Bank Account - HDFC", accountType: "asset", subType: "current_asset", parentCode: "1000", openingBalance: 1850000 },
    { code: "1300", name: "Accounts Receivable", accountType: "asset", subType: "current_asset", parentCode: "1000", openingBalance: 425000 },
    { code: "1400", name: "Inventory", accountType: "asset", subType: "current_asset", parentCode: "1000", openingBalance: 680000 },
    { code: "1500", name: "Fixed Assets", accountType: "asset", subType: "fixed_asset", isGroup: true, openingBalance: 0 },
    { code: "1510", name: "Office Equipment", accountType: "asset", subType: "fixed_asset", parentCode: "1500", openingBalance: 350000 },
    // Liabilities
    { code: "2000", name: "Current Liabilities", accountType: "liability", subType: "current_liability", isGroup: true, openingBalance: 0 },
    { code: "2100", name: "Accounts Payable", accountType: "liability", subType: "current_liability", parentCode: "2000", openingBalance: 285000 },
    { code: "2200", name: "GST Payable", accountType: "liability", subType: "current_liability", parentCode: "2000", openingBalance: 95000 },
    { code: "2300", name: "TDS Payable", accountType: "liability", subType: "current_liability", parentCode: "2000", openingBalance: 42000 },
    // Equity
    { code: "3000", name: "Owner's Capital", accountType: "equity", openingBalance: 2000000 },
    { code: "3100", name: "Retained Earnings", accountType: "equity", openingBalance: 1430000 },
    // Revenue
    { code: "4000", name: "Sales Revenue", accountType: "revenue", openingBalance: 0 },
    { code: "4100", name: "Service Revenue", accountType: "revenue", openingBalance: 0 },
    { code: "4900", name: "Other Income", accountType: "revenue", openingBalance: 0 },
    // Expenses
    { code: "5000", name: "Cost of Goods Sold", accountType: "expense", openingBalance: 0 },
    { code: "6000", name: "Salaries & Wages", accountType: "expense", openingBalance: 0 },
    { code: "6100", name: "Rent Expense", accountType: "expense", openingBalance: 0 },
    { code: "6200", name: "Utilities", accountType: "expense", openingBalance: 0 },
    { code: "6300", name: "Office Supplies", accountType: "expense", openingBalance: 0 },
    { code: "6400", name: "Marketing & Advertising", accountType: "expense", openingBalance: 0 },
    { code: "6500", name: "Travel & Conveyance", accountType: "expense", openingBalance: 0 },
    { code: "6900", name: "Bank Charges", accountType: "expense", openingBalance: 0 },
  ];

  const accountMap: Record<string, string> = {}; // code -> id
  for (const a of accounts) {
    const existing = await prisma.glAccount.findUnique({ where: { code: a.code } });
    if (existing) {
      accountMap[a.code] = existing.id;
      continue;
    }
    const created = await prisma.glAccount.create({
      data: {
        code: a.code,
        name: a.name,
        accountType: a.accountType,
        subType: a.subType ?? null,
        parentAccountId: a.parentCode ? accountMap[a.parentCode] : null,
        isGroup: a.isGroup ?? false,
        openingBalance: a.openingBalance,
      },
    });
    accountMap[a.code] = created.id;
  }
  console.log(`✓ ${accounts.length} GL accounts`);

  // ─── Warehouses ───────────────────────────────────────────────
  const warehouses = [
    { code: "WH-MAIN", name: "Main Warehouse", address: "Mumbai, Maharashtra" },
    { code: "WH-DEL", name: "Delhi Branch", address: "New Delhi" },
    { code: "WH-BLR", name: "Bangalore Store", address: "Bengaluru, Karnataka" },
  ];
  const whMap: Record<string, string> = {};
  for (const w of warehouses) {
    const existing = await prisma.warehouse.findUnique({ where: { code: w.code } });
    if (existing) { whMap[w.code] = existing.id; continue; }
    const created = await prisma.warehouse.create({ data: w });
    whMap[w.code] = created.id;
  }
  console.log(`✓ ${warehouses.length} warehouses`);

  // ─── Products ─────────────────────────────────────────────────
  const products = [
    { sku: "LAP-001", name: "Dell Latitude 5540 Laptop", category: "Electronics", uom: "pcs", costPrice: 65000, salePrice: 78000, weightGrams: 1800, reorderPoint: 5, reorderQty: 20 },
    { sku: "MOU-001", name: "Logitech Wireless Mouse", category: "Accessories", uom: "pcs", costPrice: 450, salePrice: 850, weightGrams: 120, reorderPoint: 20, reorderQty: 100 },
    { sku: "KEY-001", name: "Mechanical Keyboard RGB", category: "Accessories", uom: "pcs", costPrice: 2200, salePrice: 3800, weightGrams: 850, reorderPoint: 10, reorderQty: 50 },
    { sku: "MON-001", name: '27" 4K Monitor', category: "Electronics", uom: "pcs", costPrice: 18000, salePrice: 24500, weightGrams: 5200, reorderPoint: 5, reorderQty: 15 },
    { sku: "CAB-001", name: "USB-C Cable 2m", category: "Accessories", uom: "pcs", costPrice: 180, salePrice: 450, weightGrams: 60, reorderPoint: 30, reorderQty: 200 },
    { sku: "PRT-001", name: "A4 Printing Paper (500 sheets)", category: "Office Supplies", uom: "ream", costPrice: 220, salePrice: 350, weightGrams: 2500, reorderPoint: 15, reorderQty: 80 },
    { sku: "PEN-001", name: "Ballpoint Pen Blue (Pack of 10)", category: "Office Supplies", uom: "pack", costPrice: 55, salePrice: 120, weightGrams: 80, reorderPoint: 25, reorderQty: 100 },
    { sku: "NOT-001", name: "Spiral Notebook A5", category: "Office Supplies", uom: "pcs", costPrice: 75, salePrice: 150, weightGrams: 220, reorderPoint: 20, reorderQty: 100 },
    { sku: "SRV-001", name: "Annual Maintenance Contract", category: "Services", uom: "hour", costPrice: 0, salePrice: 1200, isStockable: false },
    { sku: "SRV-002", name: "Installation Service", category: "Services", uom: "hour", costPrice: 0, salePrice: 800, isStockable: false },
  ];

  const prodMap: Record<string, string> = {};
  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (existing) { prodMap[p.sku] = existing.id; continue; }
    const created = await prisma.product.create({
      data: {
        ...p,
        isStockable: (p as any).isStockable ?? true,
        productType: p.category === "Services" ? "service" : "goods",
      },
    });
    prodMap[p.sku] = created.id;
  }
  console.log(`✓ ${products.length} products`);

  // ─── Stock ────────────────────────────────────────────────────
  const stockData: Array<{ sku: string; wh: string; qty: number; cost: number }> = [
    { sku: "LAP-001", wh: "WH-MAIN", qty: 15, cost: 65000 },
    { sku: "LAP-001", wh: "WH-DEL", qty: 8, cost: 65000 },
    { sku: "MOU-001", wh: "WH-MAIN", qty: 120, cost: 450 },
    { sku: "KEY-001", wh: "WH-MAIN", qty: 45, cost: 2200 },
    { sku: "MON-001", wh: "WH-MAIN", qty: 12, cost: 18000 },
    { sku: "MON-001", wh: "WH-BLR", qty: 6, cost: 18000 },
    { sku: "CAB-001", wh: "WH-MAIN", qty: 8, cost: 180 }, // low stock
    { sku: "PRT-001", wh: "WH-MAIN", qty: 35, cost: 220 },
    { sku: "PEN-001", wh: "WH-DEL", qty: 4, cost: 55 }, // low stock
    { sku: "NOT-001", wh: "WH-MAIN", qty: 60, cost: 75 },
  ];

  for (const s of stockData) {
    const productId = prodMap[s.sku];
    const warehouseId = whMap[s.wh];
    if (!productId || !warehouseId) continue;
    const existing = await prisma.stock.findFirst({ where: { productId, warehouseId } });
    if (existing) continue;
    await prisma.stock.create({
      data: {
        productId, warehouseId,
        quantityOnHand: s.qty, averageCost: s.cost,
        lastMovementAt: new Date(),
      },
    });
    // Also create opening balance movement
    const movementCount = await prisma.stockMovement.count();
    await prisma.stockMovement.create({
      data: {
        movementNumber: `SM-${String(movementCount + 1).padStart(5, "0")}`,
        movementDate: new Date(),
        productId, warehouseId,
        movementType: "opening_balance",
        quantity: s.qty, unitCost: s.cost, totalCost: s.qty * s.cost,
        referenceType: "manual", referenceId: "opening",
        notes: "Opening balance", balanceAfter: s.qty,
        createdBy: admin.id,
      },
    });
  }
  console.log(`✓ ${stockData.length} stock entries with opening movements`);

  // ─── Sample Invoices ──────────────────────────────────────────
  const parties = await prisma.party.findMany({ where: { deletedAt: null } });
  const customerParties = parties.filter((p) => p.subTypes.includes('"customer"'));
  const productForInvoice = await prisma.product.findFirst({ where: { sku: "LAP-001", deletedAt: null } });
  const mouseProduct = await prisma.product.findFirst({ where: { sku: "MOU-001", deletedAt: null } });

  if (customerParties.length > 0 && productForInvoice) {
    const today = new Date();
    const monthsAgo = (m: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      return d;
    };

    const invoiceSamples = [
      { partyIdx: 0, monthsAgo: 5, lines: [{ product: productForInvoice, qty: 2, price: 78000, taxPct: 18 }, { product: mouseProduct!, qty: 5, price: 850, taxPct: 18 }], status: "paid" },
      { partyIdx: 1, monthsAgo: 4, lines: [{ product: productForInvoice, qty: 1, price: 78000, taxPct: 18 }], status: "paid" },
      { partyIdx: 0, monthsAgo: 3, lines: [{ product: mouseProduct!, qty: 20, price: 850, taxPct: 18 }], status: "paid" },
      { partyIdx: 2, monthsAgo: 2, lines: [{ product: productForInvoice, qty: 3, price: 78000, taxPct: 18 }, { product: mouseProduct!, qty: 10, price: 850, taxPct: 18 }], status: "partial" },
      { partyIdx: 1, monthsAgo: 1, lines: [{ product: mouseProduct!, qty: 50, price: 850, taxPct: 18 }], status: "sent" },
      { partyIdx: 0, monthsAgo: 0, lines: [{ product: productForInvoice, qty: 1, price: 78000, taxPct: 18 }], status: "draft" },
    ];

    for (let i = 0; i < invoiceSamples.length; i++) {
      const sample = invoiceSamples[i];
      const party = customerParties[sample.partyIdx % customerParties.length];
      const existingInv = await prisma.invoice.findFirst({ where: { invoiceNumber: `INV-${today.getFullYear()}-${String(i + 1).padStart(5, "0")}` } });
      if (existingInv) continue;

      let subtotal = 0, taxAmount = 0;
      const lines = sample.lines.map((l, idx) => {
        const lineGross = l.qty * l.price;
        const tax = (lineGross * l.taxPct) / 100;
        const lineTotal = lineGross + tax;
        subtotal += lineGross;
        taxAmount += tax;
        return {
          lineNumber: idx + 1,
          productId: l.product.id,
          description: l.product.name,
          quantity: l.qty, uom: l.product.uom,
          unitPrice: l.price, discountPercent: 0, discountAmount: 0,
          taxPercent: l.taxPct, taxAmount: tax, lineTotal,
        };
      });
      const totalAmount = subtotal + taxAmount;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${today.getFullYear()}-${String(i + 1).padStart(5, "0")}`,
          invoiceType: "tax_invoice",
          invoiceDate: monthsAgo(sample.monthsAgo),
          dueDate: new Date(monthsAgo(sample.monthsAgo).getTime() + 30 * 24 * 60 * 60 * 1000),
          partyId: party.id,
          currencyCode: "INR",
          status: sample.status,
          subtotal, discountAmount: 0, taxAmount, totalAmount,
          paidAmount: sample.status === "paid" ? totalAmount : sample.status === "partial" ? totalAmount * 0.5 : 0,
          balanceDue: sample.status === "paid" ? 0 : sample.status === "partial" ? totalAmount * 0.5 : totalAmount,
          notes: "Thank you for your business.",
          termsConditions: "Payment due within 30 days. 18% GST applicable.",
          createdBy: admin.id,
          lines: { create: lines },
        },
      });

      // Audit
      await prisma.auditLog.create({
        data: {
          ts: monthsAgo(sample.monthsAgo),
          userId: admin.id, actorKind: "user", actorId: admin.id,
          module: "invoicing", entityType: "invoice", entityId: invoice.id,
          action: "create", afterState: JSON.stringify({ invoiceNumber: invoice.invoiceNumber, totalAmount }),
          source: "system",
        },
      });
    }
    console.log(`✓ ${invoiceSamples.length} sample invoices`);
  }

  console.log("\n✅ Phase 2 seed complete.");
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
