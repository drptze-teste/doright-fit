# doright-fit — Landing + Blog (Do Right)

> Repositório do site da **Do Right Physical Trainers** (personal trainer online para brasileiros
> que moram fora do Brasil). Servido em **GitHub Pages** no domínio **doright.fit** (custom domain via `CNAME`).

## Estrutura
- `index.html` — **landing** (HTML/CSS/JS puro, SEM front matter → Jekyll copia intacta). Não adicionar front matter.
- `logo.svg` — logo da landing.
- `CNAME` — `doright.fit` (NÃO apagar — mantém o custom domain no Pages).
- `_config.yml` — Jekyll (baseurl vazio; `permalink: /blog/:year/:month/:day/:title/`; plugin jekyll-feed).
- `_layouts/default.html` · `_layouts/post.html` — tema escuro Do Right (#060912 / azul #4f8ef7; Bebas Neue + DM Sans).
- `blog/index.html` — listagem do blog (rota `/blog/`).
- `_posts/` — artigos (`AAAA-MM-DD-titulo.md` com front matter `layout: post`).
- `admin/index.html` — painel simples que abre o editor do GitHub com modelo pronto (rota `/admin/`).
- `.github/workflows/weekly-blog-post.yml` — post automático semanal.
- `.github/scripts/gerar-post.js` — gera o post com **Gemini + Google Trends** (anti-repetição de tema).

## Blog — automação (igual arquitetura dos blogs bnsblog/sanopilates)
- **Agenda:** `cron: '0 18 * * 3'` = **quarta-feira 15h de Brasília** (tarde, após as 14h).
- Roda `gerar-post.js` (Node 20): busca tendências no Google Trends BR, escolhe um tema do pool
  **sem repetir o assunto dos 3 últimos posts**, gera com Gemini, insere fotos (Unsplash), commita e dá push.
- **Secret obrigatório:** `GEMINI_API_KEY` (Settings → Secrets → Actions). Opcionais: `WHATSAPP_PHONE`, `CALLMEBOT_APIKEY`.
- **Temas:** vida fora do Brasil, alimentos substitutos no exterior, rotina saudável, home office + treino em casa,
  IA/ChatGPT vs. personal de verdade, fuso/clima, saúde mental, personal online.

## Analytics
- **GoatCounter** (código `doright`): script no fim do `<body>` do `_layouts/default.html`.
  - Painel: `https://doright.goatcounter.com` (criar conta grátis em goatcounter.com com o código `doright`).
  - Badge "👁️ X visitas no site" no rodapé + contador por matéria no `post.html`
    (requer "Allow adding visitor counts on your website" nas configs do GoatCounter).

## Armadilhas
- **Não apagar o `CNAME`** — o bot dá push em `main`; o CNAME precisa continuar versionado ou o domínio cai.
- **`baseurl` deve ficar VAZIO** enquanto servido em `doright.fit` na raiz.
- A **landing** não pode ganhar front matter (senão o Jekyll processa e pode quebrar).
- É Jekyll (GitHub Pages), **não** React/SPA — sem `npm run build`.
- E-mail `@doright.fit` **não existe** (foi descontinuado). Não referenciar e-mail no site.
