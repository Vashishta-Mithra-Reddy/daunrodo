import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "This is something I am building for my recipe automation" });
}
