import { NextRequest, NextResponse } from "next/server";
import { CargaMasivaModule } from "core-cargamasiva";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { success: false, error: "Se requiere una URL válida." },
        { status: 400 }
      );
    }

    const module = new CargaMasivaModule();
    const result = await module.importFromUrl(url);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
