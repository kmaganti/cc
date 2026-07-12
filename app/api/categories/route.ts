import { sessionAdminUsername } from "../_lib/auth";
import { listCategories, saveCategory } from "../_lib/store-db";
import type { Category } from "../../data/store";

export async function GET() {
  return Response.json({ categories: await listCategories() });
}

export async function POST(request: Request) {
  if (!(await sessionAdminUsername(request))) {
    return Response.json({ message: "Admin login required." }, { status: 401 });
  }
  const category = (await request.json()) as Category;
  if (!category.name?.trim()) {
    return Response.json({ message: "Category name is required." }, { status: 400 });
  }
  return Response.json({ category: await saveCategory(category) });
}
