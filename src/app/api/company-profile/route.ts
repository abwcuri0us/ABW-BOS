/**
 * /api/company-profile
 * GET — returns company profile
 * PUT — updates company profile (upsert)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let profile = await db.companyProfile.findUnique({ where: { id: "default" } });
  if (!profile) {
    // Create default profile if none exists
    profile = await db.companyProfile.create({
      data: {
        id: "default",
        companyName: "ABWcurious",
        tagline: "Business Operating System",
        addressLine1: "Mumbai, Maharashtra",
        countryCode: "IN",
        taxId: "27AABCA1234L1Z5",
        taxIdType: "GST",
        email: "info@abwcurious.local",
        phone: "+91 22 1234 5678",
        defaultFont: "Times New Roman",
        primaryColor: "#1B6D97",
        invoicePrefix: "INV",
        quotationPrefix: "QUO",
        invoiceTerms: "Payment due within 30 days. 18% GST applicable.",
        quotationTerms: "This quotation is valid for 30 days. 18% GST applicable.",
      },
    });
  }
  return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const allowed = [
    "companyName", "tagline", "logoUrl", "letterheadUrl",
    "addressLine1", "addressLine2", "city", "stateProvince",
    "postalCode", "countryCode", "phone", "email", "website",
    "taxId", "taxIdType", "bankName", "bankAccount", "bankIfsc",
    "bankBranch", "upiId", "signatureUrl", "defaultFont",
    "primaryColor", "invoicePrefix", "quotationPrefix",
    "invoiceTerms", "quotationTerms",
  ];

  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in body) update[k] = body[k] ?? null;
  }

  const profile = await db.companyProfile.upsert({
    where: { id: "default" },
    update,
    create: { id: "default", ...update },
  });

  return NextResponse.json({ profile });
}
