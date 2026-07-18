/**
 * /api/settings
 * GET  — list user settings
 * PUT  — update a user setting
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const settings = await db.setting.findMany({
    where: { OR: [{ scope: "system" }, { userId: session.uid }] },
  });

  // Reshape into a { key: value } map, with user settings overriding system
  const map: Record<string, { value: unknown; type: string; scope: string }> = {};
  for (const s of settings) {
    map[s.key] = {
      value: JSON.parse(s.value),
      type: s.valueType,
      scope: s.scope,
    };
  }

  return NextResponse.json({ settings: map });
}

export async function PUT(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { key, value } = body as { key: string; value: unknown };
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  // Infer type
  let valueType = "string";
  if (typeof value === "boolean") valueType = "boolean";
  else if (typeof value === "number") valueType = "number";
  else if (Array.isArray(value)) valueType = "array";
  else if (typeof value === "object" && value !== null) valueType = "object";

  const existing = await db.setting.findFirst({
    where: { scope: "user", userId: session.uid, key },
  });

  if (existing) {
    const updated = await db.setting.update({
      where: { id: existing.id },
      data: { value: JSON.stringify(value), valueType },
    });
    return NextResponse.json({ setting: updated });
  }

  const created = await db.setting.create({
    data: {
      scope: "user",
      userId: session.uid,
      key,
      value: JSON.stringify(value),
      valueType,
    },
  });
  return NextResponse.json({ setting: created });
}
