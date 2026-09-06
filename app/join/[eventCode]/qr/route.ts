import QRCode from "qrcode";
import { resolveEventJoin } from "@/lib/queries/event-join";
export async function GET(
  request: Request,
  context: RouteContext<"/join/[eventCode]/qr">,
) {
  const { eventCode } = await context.params;
  const event = await resolveEventJoin(eventCode);
  if (!event) return new Response("Not found", { status: 404 });
  const url = new URL(`/join/${eventCode}`, request.url).toString();
  const svg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
  });
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=300",
    },
  });
}
