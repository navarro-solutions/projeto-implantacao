import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Força o painel a reler a planilha na hora.
 * Uso: GET /api/revalidar?token=SEU_REVALIDATE_TOKEN
 */
export async function GET(req: Request) {
  const esperado = process.env.REVALIDATE_TOKEN;
  const token = new URL(req.url).searchParams.get("token");
  if (!esperado || token !== esperado) {
    return NextResponse.json({ ok: false, erro: "token inválido" }, { status: 401 });
  }
  revalidatePath("/");
  return NextResponse.json({ ok: true, revalidadoEm: new Date().toISOString() });
}
