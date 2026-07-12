import { createAdminSessionCookie, hashPassword, verifyPassword } from "../../_lib/auth";
import { getAdminByUsername, updateAdminPassword } from "../../_lib/store-db";

export async function POST(request: Request) {
  const payload = (await request.json()) as { username?: string; password?: string };
  const username = payload.username?.trim().toLowerCase() || "";
  const password = payload.password || "";
  const admin = await getAdminByUsername(username);

  if (!admin) {
    return Response.json({ message: "Invalid admin username or password." }, { status: 401 });
  }

  if (!admin.passwordHash && username === "admin" && password === "admin") {
    await updateAdminPassword(username, await hashPassword(password));
    return Response.json(
      { admin: { username }, message: "Admin signed in." },
      { headers: { "Set-Cookie": await createAdminSessionCookie(username, request) } }
    );
  }

  if (!(await verifyPassword(password, admin.passwordHash))) {
    return Response.json({ message: "Invalid admin username or password." }, { status: 401 });
  }

  return Response.json(
    { admin: { username: admin.username }, message: "Admin signed in." },
    { headers: { "Set-Cookie": await createAdminSessionCookie(admin.username, request) } }
  );
}
