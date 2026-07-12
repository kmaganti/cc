import { sessionAdminUsername } from "../_lib/auth";
import { listProductGroups, saveProductGroup } from "../_lib/store-db";
import type { ProductGroup } from "../../data/store";

export async function GET() {
  return Response.json({ groups: await listProductGroups() });
}

export async function POST(request: Request) {
  if (!(await sessionAdminUsername(request))) {
    return Response.json({ message: "Admin login required." }, { status: 401 });
  }
  const group = (await request.json()) as ProductGroup;
  if (!group.name?.trim()) {
    return Response.json({ message: "Group name is required." }, { status: 400 });
  }
  return Response.json({ group: await saveProductGroup(group) });
}
