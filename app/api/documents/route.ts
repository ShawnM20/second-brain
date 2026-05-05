import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/supabase/types";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ documents: (data ?? []) as Document[] });
  } catch (e: unknown) {
    console.error("[GET /api/documents]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = createServiceClient();

    const { data: doc } = await supabase
      .from("documents")
      .select("id, storage_path")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const typedDoc = doc as Pick<Document, "id" | "storage_path">;
    if (typedDoc.storage_path) {
      await supabase.storage.from("documents").remove([typedDoc.storage_path]);
    }

    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[DELETE /api/documents]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
