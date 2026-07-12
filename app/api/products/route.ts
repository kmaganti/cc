import { getProductWithCrossSells, listProducts, saveProduct } from "../_lib/store-db";
import type { Product } from "../../data/store";
import { sessionAdminUsername } from "../_lib/auth";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const detail = await getProductWithCrossSells(id);
    return detail
      ? Response.json(detail)
      : Response.json({ message: "Product not found." }, { status: 404 });
  }
  return Response.json({ products: await listProducts() });
}

export async function POST(request: Request) {
  if (!(await sessionAdminUsername(request))) {
    return Response.json({ message: "Admin login required." }, { status: 401 });
  }
  const product = (await request.json()) as Product;
  if (!product.id || !product.name || !product.category) {
    return Response.json({ message: "Product id, name, and category are required." }, { status: 400 });
  }
  return Response.json({ product: await saveProduct(product) });
}
