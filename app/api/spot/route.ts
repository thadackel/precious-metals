import { NextResponse } from "next/server";
import { getSpotPrices } from "@/lib/spot-prices";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getSpotPrices();

  return NextResponse.json(
    {
      ...result,
      provider: "gold-api.com",
      build: "gold-api-v3-2026-07-16",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
