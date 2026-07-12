import { hashPassword } from "../../_lib/auth";
import { getCustomerByResetToken, updateCustomerPassword } from "../../_lib/store-db";

export async function POST(request: Request) {
  const payload = (await request.json()) as { resetToken?: string; newPassword?: string };
  if (!payload.resetToken || !payload.newPassword || payload.newPassword.length < 8) {
    return Response.json({ message: "Reset code and 8 character password are required." }, { status: 400 });
  }
  const customer = await getCustomerByResetToken(payload.resetToken.trim());
  if (!customer || !customer.resetExpiresAt || new Date(customer.resetExpiresAt).getTime() < Date.now()) {
    return Response.json({ message: "Reset code is invalid or expired." }, { status: 400 });
  }
  await updateCustomerPassword(customer.id, await hashPassword(payload.newPassword));
  return Response.json({ message: "Password reset. You can sign in now." });
}
