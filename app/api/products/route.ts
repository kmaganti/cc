import { listProducts, saveProduct } from "../_lib/store-db";
import type { Product } from "../../data/store";
import { sessionAdminUsername } from "../_lib/auth";

export async function GET() {
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
