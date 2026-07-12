import { clearSessionCookie } from "../../_lib/auth";

export async function POST() {
  return Response.json(
    { message: "Signed out." },
    { headers: { "Set-Cookie": clearSessionCookie() } }
  );
}
