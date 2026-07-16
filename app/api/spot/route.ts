import { NextResponse } from "next/server";
import { getSpotPrices } from "@/lib/spot-prices";

export const revalidate = 180;

export async function GET() {
  const result = await getSpotPrices();

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=180, stale-while-revalidate=60",
    },
  });
}
