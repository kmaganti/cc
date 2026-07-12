import { randomResetToken } from "../../_lib/auth";
import { getCustomerByEmail, saveResetToken } from "../../_lib/store-db";

export async function POST(request: Request) {
  const payload = (await request.json()) as { email?: string };
  const email = payload.email?.trim().toLowerCase() || "";
  const customer = await getCustomerByEmail(email);
  if (!customer) {
    return Response.json({ message: "If an account exists, a reset code will be created." });
  }
  const resetToken = randomResetToken();
  const resetExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  await saveResetToken(email, resetToken, resetExpiresAt);
  return Response.json({
    message: "Reset code created. In production this code should be emailed to the customer.",
    resetToken,
  });
}
