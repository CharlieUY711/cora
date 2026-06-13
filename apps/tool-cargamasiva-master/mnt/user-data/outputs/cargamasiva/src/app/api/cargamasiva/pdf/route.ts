import { NextRequest, NextResponse } from "next/server";
import { CargaMasivaModule } from "core-cargamasiva";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Se requiere un archivo PDF." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpPath = path.join("/tmp", `upload-${Date.now()}-${file.name}`);
    await writeFile(tmpPath, buffer);

    const module = new CargaMasivaModule();
    const result = await module.importFromPdf(tmpPath);

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
