/**
 * ABW-BOS Phase 3 Seed — team, scrum, schedules, notes, quotations, transactions
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Phase 3 (Team, Scrum, Schedules, Notes, Quotations, Transactions)...");

  const admin = await prisma.user.findFirst({ where: { username: "admin" } });
  if (!admin) throw new Error("Run seed.ts first");

  // ─── Team Members ───────────────────────────────────────────
  const members = [
    { name: "Aarav Patel", email: "aarav@abwcurious.local", phone: "+91 98200 11111", role: "lead", department: "tech", designation: "Tech Lead", avatarColor: "#1B6D97", skills: ["React", "Rust", "Architecture"] },
    { name: "Diya Sharma", email: "diya@abwcurious.local", phone: "+91 98200 22222", role: "manager", department: "sales", designation: "Sales Manager", avatarColor: "#15803D", skills: ["CRM", "Negotiation", "Strategy"] },
    { name: "Vihaan Reddy", email: "vihaan@abwcurious.local", phone: "+91 98200 33333", role: "member", department: "operations", designation: "Operations Executive", avatarColor: "#B45309", skills: ["Logistics", "Inventory"] },
    { name: "Ananya Iyer", email: "ananya@abwcurious.local", phone: "+91 98200 44444", role: "member", department: "finance", designation: "Accountant", avatarColor: "#7C3AED", skills: ["Accounting", "GST", "Tally"] },
    { name: "Arjun Nair", email: "arjun@abwcurious.local", phone: "+91 98200 55555", role: "member", department: "tech", designation: "Frontend Developer", avatarColor: "#DB2777", skills: ["React", "TypeScript", "UI/UX"] },
    { name: "Saanvi Gupta", email: "saanvi@abwcurious.local", phone: "+91 98200 66666", role: "manager", department: "hr", designation: "HR Manager", avatarColor: "#0891B2", skills: ["Recruitment", "Payroll", "Compliance"] },
  ];
  for (const m of members) {
    const existing = await prisma.teamMember.findFirst({ where: { email: m.email } });
    if (!existing) await prisma.teamMember.create({ data: { ...m, skills: JSON.stringify(m.skills) } });
  }
  console.log(`✓ ${members.length} team members`);

  // ─── Scrum Projects ─────────────────────────────────────────
  const projects = [
    { name: "ABW-BOS v2.0 Launch", description: "Next major release with mobile app and AI features", status: "active", priority: "high", startDate: new Date("2026-06-01"), endDate: new Date("2026-12-31") },
    { name: "Website Redesign", description: "Marketing website overhaul", status: "active", priority: "medium", startDate: new Date("2026-07-01"), endDate: new Date("2026-09-30") },
    { name: "GST Compliance Update", description: "Update tax engine for FY 2026-27 changes", status: "planning", priority: "critical" },
  ];
  const projectMap: Record<string, string> = {};
  for (const p of projects) {
    const existing = await prisma.scrumProject.findFirst({ where: { name: p.name } });
    if (existing) { projectMap[p.name] = existing.id; continue; }
    const created = await prisma.scrumProject.create({ data: { ...p, createdBy: admin.id } });
    projectMap[p.name] = created.id;
  }
  console.log(`✓ ${projects.length} scrum projects`);

  // ─── Tasks ──────────────────────────────────────────────────
  const teamMembers = await prisma.teamMember.findMany();
  const tasks = [
    { project: "ABW-BOS v2.0 Launch", title: "Design mobile app wireframes", status: "done", priority: "high", type: "story", points: 5, assignee: 0 },
    { project: "ABW-BOS v2.0 Launch", title: "Implement offline sync engine", status: "in_progress", priority: "urgent", type: "story", points: 8, assignee: 4 },
    { project: "ABW-BOS v2.0 Launch", title: "Build AI advisory module", status: "in_progress", priority: "high", type: "story", points: 5, assignee: 0 },
    { project: "ABW-BOS v2.0 Launch", title: "Write API documentation", status: "todo", priority: "medium", type: "task", points: 3, assignee: 4 },
    { project: "ABW-BOS v2.0 Launch", title: "Setup CI/CD pipeline", status: "review", priority: "high", type: "task", points: 3, assignee: 0 },
    { project: "ABW-BOS v2.0 Launch", title: "Fix login redirect bug", status: "todo", priority: "urgent", type: "bug", points: 2 },
    { project: "Website Redesign", title: "Create new homepage design", status: "done", priority: "high", type: "story", points: 5, assignee: 4 },
    { project: "Website Redesign", title: "Implement responsive navigation", status: "in_progress", priority: "medium", type: "task", points: 3, assignee: 4 },
    { project: "Website Redesign", title: "Optimize page load speed", status: "todo", priority: "medium", type: "task", points: 2 },
    { project: "GST Compliance Update", title: "Research new GST slab changes", status: "todo", priority: "urgent", type: "task", points: 3, assignee: 3 },
    { project: "GST Compliance Update", title: "Update tax calculation engine", status: "todo", priority: "high", type: "story", points: 8 },
    { project: "GST Compliance Update", title: "Test e-invoice compliance", status: "todo", priority: "high", type: "task", points: 5 },
  ];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const projectId = projectMap[t.project];
    if (!projectId) continue;
    const existing = await prisma.task.findFirst({ where: { title: t.title, projectId } });
    if (existing) continue;
    await prisma.task.create({
      data: {
        projectId,
        title: t.title,
        status: t.status,
        priority: t.priority,
        type: t.type,
        storyPoints: t.points,
        assigneeId: t.assignee != null ? teamMembers[t.assignee]?.id : null,
        dueDate: t.status === "todo" ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
        order: i,
      },
    });
  }
  console.log(`✓ ${tasks.length} scrum tasks`);

  // ─── Schedules ──────────────────────────────────────────────
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const events = [
    { title: "Daily Standup", type: "meeting", start: new Date(today.getTime() + 9 * 60 * 60 * 1000), end: new Date(today.getTime() + 9.5 * 60 * 60 * 1000), location: "Conference Room A", color: "#1B6D97" },
    { title: "Client Call - Acme Industries", type: "call", start: new Date(today.getTime() + 11 * 60 * 60 * 1000), end: new Date(today.getTime() + 11.5 * 60 * 60 * 1000), location: "Zoom", color: "#15803D" },
    { title: "Sprint Planning", type: "meeting", start: new Date(today.getTime() + 14 * 60 * 60 * 1000), end: new Date(today.getTime() + 15.5 * 60 * 60 * 1000), location: "Conference Room B", color: "#1B6D97" },
    { title: "Lunch Break", type: "break", start: new Date(today.getTime() + 13 * 60 * 60 * 1000), end: new Date(today.getTime() + 14 * 60 * 60 * 1000), color: "#0891B2" },
    { title: "Follow up: Rajesh Kumar invoice", type: "reminder", start: new Date(today.getTime() + 16 * 60 * 60 * 1000), end: new Date(today.getTime() + 16.25 * 60 * 60 * 1000), color: "#DB2777" },
    { title: "Tomorrow: Team Review", type: "meeting", start: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), end: new Date(today.getTime() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000), location: "Main Hall", color: "#1B6D97" },
  ];
  for (const e of events) {
    const existing = await prisma.schedule.findFirst({ where: { title: e.title } });
    if (!existing) await prisma.schedule.create({
      data: {
        title: e.title, type: e.type,
        startDate: e.start, endDate: e.end,
        location: e.location ?? null,
        color: e.color,
        status: "scheduled", priority: "medium",
        attendees: "[]", createdBy: admin.id,
      },
    });
  }
  console.log(`✓ ${events.length} schedule events`);

  // ─── Notes ──────────────────────────────────────────────────
  const notes = [
    { title: "Q3 Strategy Notes", content: "Key priorities for Q3:\n1. Launch mobile app\n2. Increase customer base by 20%\n3. Reduce outstanding AR to under ₹100k\n4. Hire 2 more developers", color: "#FEF9C3", isPinned: true, tags: ["strategy", "q3", "important"] },
    { title: "Meeting with Acme Industries", content: "Discussed bulk order of 50 laptops.\nQuoted ₹75,000/unit.\nDelivery expected in 2 weeks.\nFollow up on Friday.", color: "#DBEAFE", isPinned: false, tags: ["meeting", "sales"] },
    { title: "GST Filing Reminder", content: "File GSTR-1 by 11th and GSTR-3B by 20th.\nCheck TDS deductions for Q1.\nReconcile input credit with purchase register.", color: "#DCFCE7", isPinned: true, tags: ["compliance", "gst", "urgent"] },
    { title: "Product Ideas", content: "1. AI-powered expense categorization\n2. WhatsApp integration for invoice delivery\n3. Barcode scanning for inventory\n4. Recurring invoice templates", color: "#FCE7F3", isPinned: false, tags: ["ideas", "product"] },
    { title: "Team Feedback", content: "Aarav: Wants more architecture decision authority.\nDiya: Requests CRM training for new hires.\nVihaan: Suggests automated reorder alerts.", color: "#FED7AA", isPinned: false, tags: ["team", "feedback"] },
  ];
  for (const n of notes) {
    const existing = await prisma.note.findFirst({ where: { title: n.title } });
    if (!existing) await prisma.note.create({ data: { ...n, tags: JSON.stringify(n.tags), createdBy: admin.id } });
  }
  console.log(`✓ ${notes.length} notes`);

  // ─── Quotations ─────────────────────────────────────────────
  const parties = await prisma.party.findMany({ where: { deletedAt: null, subTypes: { contains: '"customer"' } } });
  const productForQuote = await prisma.product.findFirst({ where: { sku: "LAP-001" } });
  const mouseForQuote = await prisma.product.findFirst({ where: { sku: "MOU-001" } });
  if (parties.length > 0 && productForQuote) {
    const quoCount = await prisma.quotation.count();
    const samples = [
      { partyIdx: 0, daysAgo: 5, validDays: 30, status: "sent", lines: [{ p: productForQuote, qty: 3, price: 78000, tax: 18 }, { p: mouseForQuote!, qty: 10, price: 850, tax: 18 }] },
      { partyIdx: 2, daysAgo: 2, validDays: 15, status: "accepted", lines: [{ p: productForQuote, qty: 5, price: 75000, tax: 18 }] },
      { partyIdx: 0, daysAgo: 10, validDays: 30, status: "converted", lines: [{ p: mouseForQuote!, qty: 30, price: 800, tax: 18 }] },
      { partyIdx: 1, daysAgo: 1, validDays: 30, status: "draft", lines: [{ p: productForQuote, qty: 2, price: 78000, tax: 18 }, { p: mouseForQuote!, qty: 5, price: 850, tax: 18 }] },
    ];
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const party = parties[s.partyIdx % parties.length];
      const qNum = `QUO-2026-${String(quoCount + i + 1).padStart(5, "0")}`;
      const existing = await prisma.quotation.findFirst({ where: { quotationNumber: qNum } });
      if (existing) continue;
      const quoDate = new Date(Date.now() - s.daysAgo * 24 * 60 * 60 * 1000);
      let subtotal = 0, taxAmount = 0;
      const lines = s.lines.map((l, idx) => {
        const gross = l.qty * l.price; const tax = (gross * l.tax) / 100;
        subtotal += gross; taxAmount += tax;
        return { lineNumber: idx + 1, productId: l.p.id, description: l.p.name, quantity: l.qty, uom: l.p.uom, unitPrice: l.price, discountPercent: 0, taxPercent: l.tax, taxAmount: tax, lineTotal: gross + tax };
      });
      await prisma.quotation.create({
        data: {
          quotationNumber: qNum, partyId: party.id,
          quotationDate: quoDate, validUntil: new Date(quoDate.getTime() + s.validDays * 24 * 60 * 60 * 1000),
          currencyCode: "INR", status: s.status,
          subtotal, discountAmount: 0, taxAmount, totalAmount: subtotal + taxAmount,
          notes: "Thank you for your interest.", termsConditions: "Valid for 30 days. 18% GST applicable.",
          createdBy: admin.id, lines: { create: lines },
        },
      });
    }
    console.log(`✓ ${samples.length} quotations`);
  }

  // ─── Transactions ───────────────────────────────────────────
  const txnCount = await prisma.transaction.count();
  if (txnCount === 0) {
    const txns = [
      { type: "income", category: "sales", amount: 92040, paymentMode: "bank", description: "Invoice INV-2026-000003 payment", daysAgo: 2 },
      { type: "income", category: "sales", amount: 20060, paymentMode: "upi", description: "Invoice INV-2026-000001 payment", daysAgo: 5 },
      { type: "expense", category: "salary", amount: 450000, paymentMode: "bank", description: "June payroll", daysAgo: 7 },
      { type: "expense", category: "rent", amount: 85000, paymentMode: "bank", description: "Office rent - July", daysAgo: 3 },
      { type: "expense", category: "utility", amount: 12500, paymentMode: "upi", description: "Electricity bill", daysAgo: 4 },
      { type: "expense", category: "purchase", amount: 65000, paymentMode: "bank", description: "Inventory purchase - 1 laptop", daysAgo: 6 },
      { type: "income", category: "sales", amount: 50000, paymentMode: "cash", description: "Walk-in sale", daysAgo: 1 },
      { type: "expense", category: "other", amount: 3200, paymentMode: "card", description: "Office supplies", daysAgo: 2 },
    ];
    for (let i = 0; i < txns.length; i++) {
      const t = txns[i];
      await prisma.transaction.create({
        data: {
          transactionNumber: `TXN-2026-${String(i + 1).padStart(5, "0")}`,
          type: t.type, category: t.category, amount: t.amount,
          transactionDate: new Date(Date.now() - t.daysAgo * 24 * 60 * 60 * 1000),
          paymentMode: t.paymentMode, description: t.description,
          status: "completed", createdBy: admin.id,
        },
      });
    }
    console.log(`✓ ${txns.length} transactions`);
  }

  console.log("\n✅ Phase 3 seed complete.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
