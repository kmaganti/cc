import { createSessionCookie, hashPassword, publicCustomer } from "../../_lib/auth";
import { getCustomerByEmail, saveCustomer } from "../../_lib/store-db";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    address?: string;
    club?: string;
  };
  const email = payload.email?.trim().toLowerCase() || "";
  const password = payload.password || "";

  if (!payload.name?.trim() || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return Response.json({ message: "Name, valid email, and 8 character password are required." }, { status: 400 });
  }

  const existing = await getCustomerByEmail(email);
  if (existing?.passwordHash) {
    return Response.json({ message: "An account already exists for this email." }, { status: 409 });
  }

  const customer = await saveCustomer({
    id: existing?.id || `cust-${Date.now()}`,
    name: payload.name.trim(),
    email,
    phone: payload.phone?.trim() || "",
    address: payload.address?.trim() || "",
    club: payload.club?.trim() || "",
    createdAt: existing?.createdAt || new Date().toISOString().slice(0, 10),
    passwordHash: await hashPassword(password),
  });

  return Response.json(
    { customer: publicCustomer(customer), message: "Account registered." },
    { headers: { "Set-Cookie": await createSessionCookie(customer.id, request) } }
  );
}
