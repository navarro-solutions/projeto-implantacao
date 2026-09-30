# Painel de Implantações

Painel de custo e economia por implantação (portaria remota, CFTV, controle de acesso e interfonia).
Lê os dados de uma planilha do Google Sheets e roda na Vercel.

## O que mostra

- **Provisionado, Gasto, Economia, Pago, A vencer e Vencido** — com filtros por tipo, cliente, status e ano.
- **Provisionado × gasto por implantação** — faixa = quanto podia gastar, barra = quanto gastou, vermelho = estouro.
- **Provisionado × gasto por categoria** — equipamentos/materiais, mão de obra própria, terceiros, deslocamento/infraestrutura.
- **De onde veio a economia** — negociação na compra, reaproveitamento de estoque e execução.
- **Tabela de implantações** (provisionado, gasto, % usado, economia ou saldo, em aberto) e **contas em aberto** (vencidas primeiro).

### Regras de cálculo

| Indicador | Regra |
|---|---|
| Provisionado | soma da aba **Provisionado** da implantação (se não houver linhas, usa a coluna `valor_provisionado` da aba Implantacoes, se existir) |
| Gasto | soma dos lançamentos da implantação (pagos + a vencer + vencidos) |
| Situação do lançamento | tem `data_pagamento` → Pago; senão, `vencimento` antes de hoje → Vencido; senão → A vencer |
| **Economia** | `provisionado − gasto`, contada quando a implantação está **Concluída** (negativa = estouro) |
| Saldo disponível | `provisionado − gasto` das implantações ainda não concluídas |
| Negociação / estoque | soma da aba **Economias** (só concluídas) — explica parte da economia |
| Execução | `economia − negociação − estoque` (negativa = estourou na execução) |

## Planilha

Use `modelo/planilha-implantacoes.xlsx` como ponto de partida: no Google Drive, **Novo → Upload de arquivo**,
depois **Abrir com Planilhas Google**. Abas esperadas (nomes da linha 1 exatamente assim):

| Aba | Colunas |
|---|---|
| `Clientes` | id_cliente, nome, cidade |
| `Implantacoes` | id_implantacao, id_cliente, tipo, descricao, data_inicio, data_conclusao, status |
| `Provisionado` | id_implantacao, categoria, valor_provisionado, observacao — uma linha por implantação (categoria em branco) ou uma por categoria |
| `Lancamentos` | id_lancamento, id_implantacao, categoria, fornecedor, descricao, valor, vencimento, data_pagamento |
| `Economias` | id_economia, id_implantacao, origem, descricao, valor, data — opcional |

Valores aceitam `R$ 1.234,56` ou número; datas aceitam `dd/mm/aaaa` ou data do Sheets.

## Ligar a planilha

Copie `.env.example` para `.env.local` (local) ou cadastre as variáveis na Vercel
(**Project → Settings → Environment Variables**).

- **Opção A — link público:** compartilhe como "Qualquer pessoa com o link: Leitor" e preencha só `GOOGLE_SHEET_ID`.
- **Opção B — planilha privada (recomendado):** crie uma conta de serviço no Google Cloud com a API do Google Sheets
  ativada, baixe a chave JSON, compartilhe a planilha com o e-mail da conta (Leitor) e preencha
  `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_PRIVATE_KEY`.

O painel relê a planilha a cada 5 minutos. Para atualizar na hora:
`https://SEU-DOMINIO/api/revalidar?token=REVALIDATE_TOKEN`.

Se a planilha estiver configurada e a leitura falhar, o painel fica vazio com o erro no topo — nunca mostra
dados de exemplo no lugar dos reais.

## Rodar local

```bash
npm install
npm run dev
# http://localhost:3000
```

## Deploy na Vercel

1. Na Vercel: **Add New → Project → Import** `navarro-solutions/projeto-implantacao` (framework: Next.js, sem ajustes).
2. Cadastre as variáveis de ambiente acima.
3. Deploy. Cada push na `main` publica de novo.

Para restringir o acesso, ative **Settings → Deployment Protection** no projeto da Vercel.

## Estrutura

```
src/app/page.tsx              página (lê a planilha no servidor, revalida a cada 5 min)
src/app/api/revalidar/        atualização imediata
src/components/Painel.tsx     painel, filtros, gráficos e tabelas
src/lib/sheets.ts             leitura do Google Sheets (link público ou conta de serviço)
src/lib/calculos.ts           regras de custo, situação e economia
src/lib/parse.ts              conversão de valores e datas pt-BR
src/lib/exemplo.ts            dados fictícios usados sem planilha
modelo/                       planilha-modelo
```
