import { publicCustomer, sessionCustomerId } from "../../_lib/auth";
import { getCustomerById } from "../../_lib/store-db";

export async function GET(request: Request) {
  const id = await sessionCustomerId(request);
  const customer = id ? await getCustomerById(id) : null;
  return customer
    ? Response.json({ customer: publicCustomer(customer) })
    : Response.json({ customer: null }, { status: 401 });
}
