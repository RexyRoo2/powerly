import { NextResponse } from "next/server";
import { PresentationSchema } from "@/lib/schema";
import { exportPresentationToPptx } from "@/lib/exportPptx";

export const runtime = "nodejs";

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "presentation";
}

export async function POST(req: Request) {
  let body: { presentation?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = PresentationSchema.safeParse(body.presentation);
  if (!parsed.success) {
    return NextResponse.json({ error: "This presentation looks malformed — try reloading." }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = await exportPresentationToPptx(parsed.data);
  } catch (err) {
    console.error("PPTX export failed", err);
    return NextResponse.json({ error: "Couldn't build the PowerPoint file. Try again." }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${slugify(parsed.data.title)}.pptx"`,
    },
  });
}
