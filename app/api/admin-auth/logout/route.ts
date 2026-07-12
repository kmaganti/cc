import { clearAdminSessionCookie } from "../../_lib/auth";

export async function POST() {
  return Response.json(
    { message: "Admin signed out." },
    { headers: { "Set-Cookie": clearAdminSessionCookie() } }
  );
}
