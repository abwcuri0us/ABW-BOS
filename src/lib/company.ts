/**
 * Company Profile helpers — fetch and cache company profile for use in
 * PDF generation (invoices, quotations, reports).
 */

export interface CompanyProfile {
  id: string;
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  letterheadUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  countryCode: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  taxIdType: string;
  bankName: string | null;
  bankAccount: string | null;
  bankIfsc: string | null;
  bankBranch: string | null;
  upiId: string | null;
  signatureUrl: string | null;
  defaultFont: string;
  primaryColor: string;
  invoicePrefix: string;
  quotationPrefix: string;
  invoiceTerms: string | null;
  quotationTerms: string | null;
}

let cachedProfile: CompanyProfile | null = null;

/**
 * Fetch company profile (cached for the session).
 */
export async function getCompanyProfile(): Promise<CompanyProfile | null> {
  if (cachedProfile) return cachedProfile;
  try {
    const res = await fetch("/api/company-profile", { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      cachedProfile = d.profile;
      return cachedProfile;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Build the letterhead HTML for use in printHTML().
 * If a letterheadUrl image is set, use it as a full-width header.
 * Otherwise, build a text-based header with logo + company details.
 */
export function buildLetterhead(profile: CompanyProfile | null): string {
  if (!profile) {
    return `<div class="header">
      <div><div class="brand">ABWcurious</div><div class="muted">Business Operating System</div></div>
    </div>`;
  }

  // If letterhead image is set, use it as full-width header
  if (profile.letterheadUrl) {
    return `<img src="${profile.letterheadUrl}" style="width:100%;max-height:200px;object-fit:contain;margin-bottom:16px" />`;
  }

  // Otherwise build text-based header with logo
  const logoHtml = profile.logoUrl
    ? `<img src="${profile.logoUrl}" style="height:60px;object-fit:contain" />`
    : `<div class="brand" style="color:${profile.primaryColor}">${profile.companyName}</div>`;

  const addressParts = [
    profile.addressLine1,
    profile.addressLine2,
    [profile.city, profile.stateProvince, profile.postalCode].filter(Boolean).join(", "),
    profile.countryCode,
  ].filter(Boolean);

  const contactParts = [
    profile.phone ? `Tel: ${profile.phone}` : null,
    profile.email ? `Email: ${profile.email}` : null,
    profile.website ? `Web: ${profile.website}` : null,
    profile.taxId ? `${profile.taxIdType}: ${profile.taxId}` : null,
  ].filter(Boolean);

  return `<div class="header" style="border-bottom:2px solid ${profile.primaryColor};padding-bottom:12px;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        ${logoHtml}
        ${profile.tagline ? `<div class="muted">${profile.tagline}</div>` : ""}
      </div>
      <div class="meta" style="text-align:right;font-size:11px;color:#64748b">
        ${addressParts.map(a => `<div>${a}</div>`).join("")}
        ${contactParts.map(c => `<div>${c}</div>`).join("")}
      </div>
    </div>
  </div>`;
}

/**
 * Build the footer HTML for printed documents.
 */
export function buildFooter(profile: CompanyProfile | null): string {
  if (!profile) {
    return `<div style="margin-top:48px;text-align:center;color:#64748b;font-size:11px;border-top:1px solid #e2e8f0;padding-top:12px">This is a computer-generated document.</div>`;
  }

  const bankDetails = profile.bankName
    ? `<div><strong>Bank:</strong> ${profile.bankName} | <strong>A/C:</strong> ${profile.bankAccount ?? "—"} | <strong>IFSC:</strong> ${profile.bankIfsc ?? "—"}</div>`
    : "";

  return `<div style="margin-top:48px;border-top:2px solid ${profile.primaryColor};padding-top:12px;text-align:center;color:#64748b;font-size:10px">
    <div style="font-weight:bold;color:${profile.primaryColor};margin-bottom:4px">${profile.companyName}</div>
    ${bankDetails}
    ${profile.upiId ? `<div>UPI: ${profile.upiId}</div>` : ""}
    <div style="margin-top:4px">This is a computer-generated document and does not require a signature.</div>
  </div>`;
}

/**
 * Get the CSS for printed documents — uses Times New Roman.
 */
export function getPrintCss(primaryColor: string = "#1B6D97"): string {
  return `
    body { font-family: 'Times New Roman', Times, serif; color: #1a1a1a; padding: 24px; }
    h1 { color: ${primaryColor}; font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th { background: #f1f5f9; text-align: left; padding: 6px 8px; border-bottom: 2px solid ${primaryColor}; font-weight: 600; }
    td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .muted { color: #64748b; font-size: 11px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .brand { font-size: 24px; font-weight: bold; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    .totals { margin-top: 16px; margin-left: auto; width: 300px; }
    .totals td { border: none; padding: 4px 8px; }
    .totals .total { font-weight: bold; border-top: 2px solid ${primaryColor}; font-size: 14px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-danger { background: #fee2e2; color: #b91c1c; }
    .badge-info { background: #dbeafe; color: #1d4ed8; }
    .badge-muted { background: #f1f5f9; color: #475569; }
    @page { margin: 20mm 15mm; }
    @media print { body { padding: 0; } }
  `;
}
