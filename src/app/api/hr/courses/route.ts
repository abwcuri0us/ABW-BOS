import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const items = await db.course.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ items });
}
export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const count = await db.course.count();
  const courseCode = `CRS-${String(count + 1).padStart(4, "0")}`;
  const course = await db.course.create({
    data: {
      courseCode, title: body.title, description: body.description ?? null,
      category: body.category ?? null, provider: body.provider ?? null,
      duration: body.duration ?? null, mode: body.mode ?? "online",
      cost: Number(body.cost) || 0, certificate: body.certificate ?? true,
      status: body.status ?? "available", instructor: body.instructor ?? null,
    },
  });
  return NextResponse.json({ course }, { status: 201 });
}
