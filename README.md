# Nexo — Painel (app web de produção)

Painel da agência multiagente Nexo em **Next.js 14 + Supabase**. Mostra o organograma (orquestrador + subagentes), tarefas com timeline e resultado, e métricas — tudo em tempo real, com **login** (Supabase Auth).

## Pré-requisitos

- Node.js 18+ instalado.
- O projeto Supabase do Nexo já criado (com as tabelas `agents`, `tasks`, `task_logs`, `results`).
- Pelo menos um **usuário de login** criado no Supabase (Authentication → Users → Add user → marque *Auto Confirm User*).

## Rodar localmente

```bash
cp .env.local.example .env.local   # os valores do projeto Nexo já vêm preenchidos
npm install
npm run dev
```

Abra http://localhost:3000 e entre com o e-mail/senha do usuário criado no Supabase.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anon (pública) do Supabase |

A `anon key` é pública por design; o acesso aos dados é protegido pelas políticas de **RLS** (só usuário autenticado lê).

## Deploy na Vercel

1. Suba esta pasta para um repositório no GitHub.
2. Em https://vercel.com → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (os mesmos do `.env.local`).
4. **Deploy**. A Vercel detecta o Next.js automaticamente.
5. No Supabase → Authentication → URL Configuration, adicione a URL da Vercel em **Site URL / Redirect URLs**.

## Estrutura

```
app/
  layout.tsx        # layout raiz
  globals.css       # estilos (tema escuro)
  page.tsx          # login + dashboard (client component, realtime)
lib/
  supabase.ts       # cliente Supabase + tipos
```

## Segurança e próximos passos

- **Login**: usa Supabase Auth (e-mail/senha). Crie usuários pelo painel do Supabase.
- **RLS**: as tabelas permitem SELECT apenas para o papel `authenticated`. Escrita fica com o n8n (service role).
- **Evolução sugerida**: mover a autenticação para Server Components com `@supabase/ssr` (cookies) para hardening; adicionar a tela de **Nova demanda** que injeta direto no orquestrador (substituindo o Telegram); e uma aba de **Conversas**.
