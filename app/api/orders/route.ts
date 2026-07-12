import { getOrder, listOrders, updateOrderStatus } from "../_lib/store-db";
import { sessionAdminUsername } from "../_lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const email = url.searchParams.get("email") || undefined;
  if (id) {
    const order = await getOrder(id);
    return order
      ? Response.json({ order })
      : Response.json({ message: "Order not found." }, { status: 404 });
  }
  if (!email && !(await sessionAdminUsername(request))) {
    return Response.json({ message: "Admin login required." }, { status: 401 });
  }
  return Response.json({ orders: await listOrders(email) });
}

export async function PATCH(request: Request) {
  if (!(await sessionAdminUsername(request))) {
    return Response.json({ message: "Admin login required." }, { status: 401 });
  }
  const payload = (await request.json()) as {
    id?: string;
    status?: "Quote sent" | "Confirmed" | "Packed" | "Shipped" | "Delivered";
    trackingNumber?: string;
    carrier?: string;
    eta?: string;
  };

  if (!payload.id || !payload.status) {
    return Response.json({ message: "Order id and status are required." }, { status: 400 });
  }

  const order = await updateOrderStatus({
    id: payload.id,
    status: payload.status,
    trackingNumber: payload.trackingNumber || "",
    carrier: payload.carrier || "Cricket Central",
    eta: payload.eta || "Pending",
  });
  return Response.json({ order });
}
