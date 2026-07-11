type OrderItem = {
  id?: string;
  name?: string;
  quantity?: number;
  price?: number;
};

type OrderPayload = {
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  };
  items?: OrderItem[];
  total?: number;
};

type ValidOrder = {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
};

const storeEmail = process.env.ORDER_TO_EMAIL || "orders@example.com";

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function validateOrder(payload: OrderPayload) {
  const customer = payload.customer || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const validItems = items
    .map((item) => ({
      id: cleanText(item.id),
      name: cleanText(item.name),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
    }))
    .filter((item) => item.name && item.quantity > 0 && item.price >= 0);

  const order = {
    customer: {
      name: cleanText(customer.name),
      email: cleanText(customer.email),
      phone: cleanText(customer.phone),
      address: cleanText(customer.address),
      notes: cleanText(customer.notes),
    },
    items: validItems,
    total: Number(payload.total || 0),
  };

  if (!order.customer.name) {
    return { error: "Please enter your name." };
  }

  if (!/^\S+@\S+\.\S+$/.test(order.customer.email)) {
    return { error: "Please enter a valid email address." };
  }

  if (!order.customer.address) {
    return { error: "Please enter a delivery address." };
  }

  if (order.items.length === 0) {
    return { error: "Please choose at least one product." };
  }

  return { order };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmail(order: ValidOrder) {
  const itemLines = order.items
    .map(
      (item) =>
        `${item.quantity} x ${item.name} - ${currency(item.quantity * item.price)}`
    )
    .join("\n");

  const text = [
    "New Cricket Central order request",
    "",
    `Customer: ${order.customer.name}`,
    `Email: ${order.customer.email}`,
    `Phone: ${order.customer.phone || "Not provided"}`,
    "",
    "Delivery address:",
    order.customer.address,
    "",
    "Items:",
    itemLines,
    "",
    `Estimated total: ${currency(order.total)}`,
    "",
    "Notes:",
    order.customer.notes || "None",
  ].join("\n");

  const html = text
    .split("\n")
    .map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "<br />"))
    .join("");

  return { text, html };
}

export async function POST(request: Request) {
  let payload: OrderPayload;

  try {
    payload = (await request.json()) as OrderPayload;
  } catch {
    return Response.json({ message: "Invalid order payload." }, { status: 400 });
  }

  const validated = validateOrder(payload);
  if ("error" in validated) {
    return Response.json({ message: validated.error }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ORDER_FROM_EMAIL || "Cricket Central <orders@resend.dev>";
  const email = buildEmail(validated.order);

  if (!resendApiKey) {
    return Response.json(
      {
        message:
          "Order validated. Add RESEND_API_KEY and ORDER_TO_EMAIL in hosting settings to send emails automatically.",
      },
      { status: 202 }
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: storeEmail,
      reply_to: validated.order.customer.email,
      subject: `New Cricket Central order from ${validated.order.customer.name}`,
      text: email.text,
      html: email.html,
    }),
  });

  if (!response.ok) {
    return Response.json(
      {
        message:
          "The order was valid, but the email provider rejected the message.",
      },
      { status: 502 }
    );
  }

  return Response.json({
    message: "Order sent. The store team will follow up by email.",
  });
}
