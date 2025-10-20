# LEK BANK — Next.js + Supabase (pronto para deploy)

**O que tem aqui**
- App Next.js simples para controle de empréstimos (interface mínima).
- Integração com Supabase (Auth + Postgres).
- Botão prático para abrir cobrança via WhatsApp (wa.me) — sem custo.
- SQL schema pronto (`sql/schema.sql`).
- Instruções passo-a-passo para subir no GitHub, criar projeto Supabase e fazer deploy no Vercel.

**Antes de começar (contas)**
1. GitHub
2. Supabase (https://supabase.com)
3. Vercel (https://vercel.com)

## Como usar (passo-a-passo rápido)
1. Crie projeto no Supabase.
2. Vá em SQL Editor e rode `sql/schema.sql`.
3. Em Settings → API pegue `URL` e `anon public` key.
4. No Vercel (ou local) defina variáveis de ambiente:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_KEY
5. No diretório do projeto, rode:
   ```
   npm install
   npm run dev
   ```
   ou faça deploy pelo Vercel conectando ao repositório.

## Arquivos principais
- `pages/index.js` — front principal (login, criação de empréstimo, lista, marcar pagamento, enviar wa.me)
- `lib/supabaseClient.js` — cliente Supabase
- `sql/schema.sql` — schema para criar tabelas

## Notas importantes
- Este projeto é **mínimo** e feito para ser fácil de usar. Em produção você pode querer:
  - Validar telefones corretamente.
  - Usar templates de mensagens aprovados (se integrar WhatsApp Business API).
  - Adicionar roles/políticas RLS no Supabase (recomendado).
- Se quiser, eu posso gerar o job pronto para um freelancer implementar features extras.

## Suporte
Se surgir erro, me manda o texto do erro e eu te oriento passo a passo.
