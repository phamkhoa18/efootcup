import { NextRequest, NextResponse } from "next/server";

const EFOOTBALL_API_BASE = "https://player.efootball.vn/api";

/**
 * Proxy route to forward requests to player.efootball.vn API.
 * Hides the API key server-side so it's never exposed to the client.
 * 
 * Client calls:  GET /api/efvn/players?q=messi
 * Proxy forwards: GET https://player.efootball.vn/api/players?q=messi
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const apiKey = process.env.EFOOTBALL_VN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: "API key not configured in .env.local" },
      { status: 500 }
    );
  }

  // Build the target URL
  const pathStr = path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${EFOOTBALL_API_BASE}/${pathStr}${searchParams ? `?${searchParams}` : ""}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
      },
      // Cache for 60 seconds to reduce API calls
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { success: false, message: `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("[EFVN Proxy] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch from eFootball API" },
      { status: 502 }
    );
  }
}
