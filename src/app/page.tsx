import Painel from "@/components/Painel";
import { carregarBase } from "@/lib/sheets";

// Recarrega a planilha no máximo a cada 5 minutos (ou na hora, via /api/revalidar).
export const revalidate = 300;

export default async function Page() {
  const base = await carregarBase();
  return <Painel base={base} />;
}
