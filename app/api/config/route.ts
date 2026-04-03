import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasServerKey: !!process.env.GROQ_API_KEY,
  });
}
