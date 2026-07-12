import { sessionAdminUsername } from "../_lib/auth";
import { listCrossSells, saveCrossSells } from "../_lib/store-db";

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) {
    return Response.json({ message: "productId is required." }, { status: 400 });
  }
  return Response.json({ relatedProductIds: await listCrossSells(productId) });
}

export async function POST(request: Request) {
  if (!(await sessionAdminUsername(request))) {
    return Response.json({ message: "Admin login required." }, { status: 401 });
  }
  const payload = (await request.json()) as {
    productId?: string;
    relatedProductIds?: string[];
  };
  if (!payload.productId) {
    return Response.json({ message: "productId is required." }, { status: 400 });
  }
  return Response.json({
    relatedProductIds: await saveCrossSells(
      payload.productId,
      payload.relatedProductIds || []
    ),
  });
}
