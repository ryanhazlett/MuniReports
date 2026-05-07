import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const allowed = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = !!user?.email && allowed.includes(user.email.toLowerCase());
    return NextResponse.json({ isAdmin }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ isAdmin: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
