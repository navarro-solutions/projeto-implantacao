import { NextResponse, type NextRequest } from "next/server";

/**
 * Login com usuário e senha (HTTP Basic) para todo o painel.
 * Credenciais vêm das variáveis de ambiente PAINEL_USUARIO e PAINEL_SENHA (cadastradas na Vercel).
 * Se elas não estiverem configuradas em produção, o acesso fica bloqueado (nunca aberto por engano).
 */
export function proxy(req: NextRequest) {
  const usuario = process.env.PAINEL_USUARIO;
  const senha = process.env.PAINEL_SENHA;

  if (!usuario || !senha) {
    // Local (npm run dev) sem credenciais: libera para facilitar o desenvolvimento.
    if (!process.env.VERCEL) return NextResponse.next();
    return new NextResponse("Acesso bloqueado: configure PAINEL_USUARIO e PAINEL_SENHA na Vercel.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    try {
      const decodificado = new TextDecoder().decode(
        Uint8Array.from(atob(auth.slice(6)), (c) => c.charCodeAt(0)),
      );
      const i = decodificado.indexOf(":");
      if (i >= 0 && iguais(decodificado.slice(0, i), usuario) && iguais(decodificado.slice(i + 1), senha)) {
        return NextResponse.next();
      }
    } catch {
      // cabeçalho malformado: cai no pedido de login
    }
  }

  return new NextResponse("Login necessário.", {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="Painel de Implantacoes", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

/** Comparação em tempo constante, para não vazar a senha por tempo de resposta. */
function iguais(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let dif = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) dif |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return dif === 0;
}

export const config = {
  // Protege tudo, menos arquivos estáticos e a rota de atualização (que tem token próprio).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/revalidar).*)"],
};
