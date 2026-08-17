# Deploy no Coolify (domínio nexoautomacao.net)

Guia para publicar o painel Nexo no seu servidor **Coolify**, com o domínio `nexoautomacao.net` e HTTPS automático. O n8n e o Supabase continuam onde já estão — só a app vai para o Coolify.

Este projeto já vem com **Dockerfile** e saída **standalone** do Next.js, então o Coolify constrói e roda a imagem direto.

## 1. Suba o código para um repositório Git

Crie um repositório (GitHub/GitLab) e envie a pasta `nexo-app`:

```bash
cd nexo-app
git init
git add .
git commit -m "Painel Nexo"
git branch -M main
git remote add origin <URL_DO_SEU_REPO>
git push -u origin main
```

## 2. Crie o recurso no Coolify

1. No Coolify, escolha um **Project** (ou crie um "Nexo") → **+ New Resource**.
2. Selecione **Public/Private Repository** (conecte o Git) e aponte para o repositório.
3. Em **Build Pack**, escolha **Dockerfile** (o Coolify detecta o `Dockerfile` na raiz).
4. **Branch:** `main`. **Port exposta:** `3000`.

## 3. Variáveis de ambiente (IMPORTANTES)

As variáveis `NEXT_PUBLIC_*` são embutidas no **build**, então precisam estar disponíveis como **Build Variable** no Coolify (não só runtime).

Em **Environment Variables**, adicione as duas e marque a opção **"Build Variable" / "Available at build time"**:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xgdqmbrbzjfjonglfroq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(a anon key do projeto — está no `.env.local.example`)* |

## 4. Domínio + HTTPS

1. Em **Domains**, informe `https://nexoautomacao.net` (e, se quiser, `https://www.nexoautomacao.net`).
2. No seu provedor de DNS, aponte o domínio para o IP do servidor Coolify:
   - Registro **A** `@` → IP do servidor.
   - (Opcional) Registro **A**/**CNAME** `www` → mesmo destino.
3. O Coolify emite o certificado **Let's Encrypt** automaticamente assim que o DNS propagar.

## 5. Deploy

Clique em **Deploy**. O Coolify faz `docker build` (usando o Dockerfile) e sobe o container. Acompanhe os logs; ao final, acesse `https://nexoautomacao.net`.

## 6. Ajuste o Supabase Auth

No Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://nexoautomacao.net`
- **Redirect URLs:** adicione `https://nexoautomacao.net`

Assim o login funciona no domínio de produção.

## Atualizações futuras

Cada `git push` na branch `main` pode disparar um novo deploy automático (ative **Automatic Deployment** no recurso do Coolify).
