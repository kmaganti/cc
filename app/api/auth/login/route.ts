import { createSessionCookie, publicCustomer, verifyPassword } from "../../_lib/auth";
import { getCustomerByEmail } from "../../_lib/store-db";

export async function POST(request: Request) {
  const payload = (await request.json()) as { email?: string; password?: string };
  const customer = await getCustomerByEmail(payload.email?.trim().toLowerCase() || "");
  if (!customer || !(await verifyPassword(payload.password || "", customer.passwordHash))) {
    return Response.json({ message: "Invalid email or password." }, { status: 401 });
  }

  return Response.json(
    { customer: publicCustomer(customer), message: "Signed in." },
    { headers: { "Set-Cookie": await createSessionCookie(customer.id, request) } }
  );
}
