import { sessionAdminUsername } from "../../_lib/auth";
import { getAdminByUsername } from "../../_lib/store-db";

export async function GET(request: Request) {
  const username = await sessionAdminUsername(request);
  const admin = username ? await getAdminByUsername(username) : null;
  return admin
    ? Response.json({ admin: { username: admin.username } })
    : Response.json({ admin: null }, { status: 401 });
}
