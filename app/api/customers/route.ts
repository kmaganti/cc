import { listCustomers, saveCustomer } from "../_lib/store-db";
import type { Customer } from "../../data/store";

export async function GET() {
  return Response.json({ customers: await listCustomers() });
}

export async function POST(request: Request) {
  const customer = (await request.json()) as Customer;
  if (!customer.name || !customer.email) {
    return Response.json({ message: "Customer name and email are required." }, { status: 400 });
  }
  return Response.json({ customer: await saveCustomer(customer) });
}
