import { publicCustomer, sessionCustomerId } from "../../_lib/auth";
import { updateCustomerProfile } from "../../_lib/store-db";

export async function PATCH(request: Request) {
  const id = await sessionCustomerId(request);
  if (!id) {
    return Response.json({ message: "Please sign in first." }, { status: 401 });
  }
  const payload = (await request.json()) as {
    name?: string;
    phone?: string;
    address?: string;
    club?: string;
  };
  if (!payload.name?.trim()) {
    return Response.json({ message: "Name is required." }, { status: 400 });
  }
  const customer = await updateCustomerProfile(id, {
    name: payload.name.trim(),
    phone: payload.phone?.trim() || "",
    address: payload.address?.trim() || "",
    club: payload.club?.trim() || "",
  });
  return customer
    ? Response.json({ customer: publicCustomer(customer), message: "Profile updated." })
    : Response.json({ message: "Account not found." }, { status: 404 });
}
