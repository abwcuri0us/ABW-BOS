/**
 * /api/notifications/[id]
 * PATCH — update delivery status (read | dismissed | actioned)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: string };

  if (!status || !["read", "dismissed", "actioned"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be read, dismissed, or actioned." },
      { status: 400 },
    );
  }

  const delivery = await db.notificationDelivery.findFirst({
    where: { id, userId: session.uid },
  });
  if (!delivery) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  const update: Record<string, unknown> = { status };
  if (status === "read" && !delivery.readAt) update.readAt = now;
  if (status === "dismissed") update.dismissedAt = now;
  if (status === "actioned") update.actionedAt = now;

  const updated = await db.notificationDelivery.update({
    where: { id },
    data: update,
    include: { notification: true },
  });

  return NextResponse.json({ delivery: updated });
}
