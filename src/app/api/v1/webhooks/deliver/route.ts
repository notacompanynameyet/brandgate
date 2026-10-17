import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { deliverWebhook } from "@/lib/storage";

export const runtime = "nodejs";

type DeliveryBody = {
  event?: string;
  destination?: string;
  payload?: Record<string, unknown>;
  simulate?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as DeliveryBody;
    if (!body.payload || typeof body.payload !== "object") {
      return NextResponse.json({ error: "payload is required" }, { status: 400 });
    }

    const event = body.event ?? "publishing.approved";
    const destination = body.destination ?? "YET Postroom";
    const queuedAt = new Date().toISOString();
    const queueReceiptHash = createHash("sha256")
      .update(JSON.stringify({ event, destination, queuedAt, payload: body.payload }))
      .digest("hex");

    if (body.simulate !== false) {
      return NextResponse.json({
        status: "queued",
        transport: "simulated",
        destination,
        event,
        queue_receipt_id: `queue_${randomUUID()}`,
        queue_receipt_hash: queueReceiptHash,
        queued_at: queuedAt,
        payload: body.payload
      });
    }

    const deliveries = await deliverWebhook(event, body.payload, request.headers.get("x-brandgate-postroom-webhook-url") ?? undefined);
    return NextResponse.json({
      status: deliveries.some((delivery) => delivery.ok) ? "delivered" : "failed",
      transport: "webhook",
      destination,
      event,
      queue_receipt_hash: queueReceiptHash,
      queued_at: queuedAt,
      deliveries,
      payload: body.payload
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
