import { redirect } from "next/navigation";

// Mercado Pago vuelve a /shop?status=…&orderId=… (back_urls de coin-shop en el backend).
// La tienda vive en la home, que es donde AnimatedBalance lee `status`.
export default async function ShopReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }

  const queryString = query.toString();
  redirect(queryString ? `/?${queryString}` : "/");
}
