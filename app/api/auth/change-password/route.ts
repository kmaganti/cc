import { hashPassword, sessionCustomerId, verifyPassword } from "../../_lib/auth";
import { getCustomerById, updateCustomerPassword } from "../../_lib/store-db";

export async function POST(request: Request) {
  const id = await sessionCustomerId(request);
  if (!id) {
    return Response.json({ message: "Please sign in first." }, { status: 401 });
  }
  const payload = (await request.json()) as { currentPassword?: string; newPassword?: string };
  if (!payload.newPassword || payload.newPassword.length < 8) {
    return Response.json({ message: "New password must be at least 8 characters." }, { status: 400 });
  }
  const customer = await getCustomerById(id);
  if (!customer || !(await verifyPassword(payload.currentPassword || "", customer.passwordHash))) {
    return Response.json({ message: "Current password is incorrect." }, { status: 401 });
  }
  await updateCustomerPassword(id, await hashPassword(payload.newPassword));
  return Response.json({ message: "Password changed." });
}
