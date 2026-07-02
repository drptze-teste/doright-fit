const googleTrends = require('google-trends-api');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// ── Datas e semana ─────────────────────────────────────────────────────────
const hoje = new Date();
const inicioAno = new Date(hoje.getFullYear(), 0, 1);
const semana = Math.ceil(
  ((hoje - inicioAno) / 86400000 + inicioAno.getDay() + 1) / 7
);
const ano = hoje.getFullYear();
const pad = (n) => String(n).padStart(2, '0');
const dataHoje = `${ano}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;

// ── Temas rotativos de fallback (foco: brasileiro que mora fora do Brasil) ───
const temasFallback = [
  'Qualidade de vida fora do Brasil: como manter a saúde física morando no exterior',
  'Alimentos brasileiros no exterior: substitutos que você encontra em qualquer supermercado',
  'Rotina saudável morando fora: como criar hábitos que resistem à mudança de país',
  'Home office no exterior: como treinar em casa sem academia e sem desculpas',
  'Treinar com ChatGPT ou com um personal de verdade: a diferença que muda seus resultados',
  'Fuso horário e jornada puxada: como encaixar o treino vivendo fora do Brasil',
  'O que comer quando falta o arroz com feijão: montando o prato do brasileiro no exterior',
  'Saúde mental e movimento: por que o exercício é âncora para quem mora longe de casa',
  'Treino em casa para expatriados: equipamentos mínimos e resultados máximos',
  'Personal trainer online: como funciona o acompanhamento à distância que realmente entrega',
  'Os primeiros meses fora do Brasil: adaptação cultural, sedentarismo e como reagir',
  'Inverno rigoroso lá fora: como não abandonar o treino quando o frio aperta',
  'Falta de tempo vivendo no exterior: treinos curtos e eficientes para a rotina puxada',
  'Alimentação e suplementos fora do Brasil: o que muda e como se adaptar sem perder saúde',
];
const temaFallback = temasFallback[semana % temasFallback.length];

// ── Anti-repetição: não repetir o assunto dos últimos posts ──────────────────
const STOP_WORDS = new Set([
  'a','o','e','de','do','da','dos','das','em','no','na','nos','nas',
  'por','para','com','como','que','se','um','uma','ao','aos','sua','seu',
  'sao','ou','vs','mas','nem','ja','nao','mais','menos','muito','bem','mal',
  'isso','esta','este','qual','quem','quando','onde','porque','pois','tudo',
  'todo','toda','depois','antes','ainda','mesmo','entre','sobre','aqui','agora',
]);

// Palavras comuns ao domínio (aparecem em quase todo título) — não indicam tema
const PALAVRAS_COMUNS = new Set([
  'doright','right','brasil','brasileiro','brasileiros','exterior','fora',
  'morar','morando','pais','paises','treino','treinar','saude','vida','casa',
]);

function tokeniza(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(p => p.length > 2 && !STOP_WORDS.has(p));
}

function palavrasSignificativas(texto) {
  return new Set(tokeniza(texto).filter(p => !PALAVRAS_COMUNS.has(p)));
}

// Classifica o assunto macro de um tema/título (regra de "não repetir o tema")
function assuntoDe(texto) {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const regras = [
    ['alimentos',    /aliment|comida|supermercad|substitut|\bprato\b|arroz|feijao|nutri|suplement|receita/],
    ['homeoffice',   /home ?office|trabalho remoto|escritorio em casa|trabalhar de casa/],
    ['treinocasa',   /treino em casa|treinar em casa|sem academia|equipament|halter|peso corporal/],
    ['ia',           /chatgpt|inteligencia artificial|\bia\b|sozinho|aplicativo|app de treino/],
    ['rotina',       /rotina|habito|disciplina|constancia|manha|planejamento/],
    ['saudemental',  /saude mental|ansiedade|solidao|adaptacao|saudade|cultural|emocional/],
    ['clima',        /inverno|\bfrio\b|calor|clima|estacao/],
    ['tempo',        /falta de tempo|\btempo\b|rapido|\bcurto\b|eficiente/],
    ['online',       /personal online|acompanhamento|distancia|\bremoto\b|online/],
    ['qualidadevida',/qualidade de vida|bem-estar|estilo de vida|sedentar/],
  ];
  for (const [nome, re] of regras) if (re.test(t)) return nome;
  return null; // assunto genérico
}

// Lê os títulos dos últimos N posts publicados (mais recentes primeiro)
function lerPostsRecentes(n = 3) {
  try {
    const dir = path.join(process.cwd(), '_posts');
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.md'))
      .sort().reverse().slice(0, n)
      .map(f => {
        const txt = fs.readFileSync(path.join(dir, f), 'utf8');
        const m = txt.match(/^title:\s*(.+)$/im);
        return (m ? m[1].trim() : f).replace(/^["']|["']$/g, '');
      });
  } catch (e) {
    console.log(`Não foi possível ler posts recentes: ${e.message}`);
    return [];
  }
}

// Um candidato repete se: (1) mesmo assunto macro de um post recente, OU
// (2) compartilha 2+ palavras-chave (ou metade) do título com algum recente
function ehRepetitivo(candidato, recentes) {
  const aCand = assuntoDe(candidato);
  if (aCand && recentes.map(assuntoDe).includes(aCand)) return true;
  const cand = palavrasSignificativas(candidato);
  if (cand.size === 0) return false;
  for (const titulo of recentes) {
    const post = palavrasSignificativas(titulo);
    let comuns = 0;
    for (const p of cand) if (post.has(p)) comuns++;
    if (comuns >= 2 || comuns / cand.size >= 0.5) return true;
  }
  return false;
}

// ── Galeria de fotos (Unsplash, livres) — treino em casa / vida no exterior ──
const galeria = [
  { url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80', alt: 'Treino de força em casa' },
  { url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80', alt: 'Prato saudável e colorido' },
  { url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80', alt: 'Trabalho remoto de casa com notebook' },
  { url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200&q=80', alt: 'Corrida ao ar livre na cidade' },
  { url: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=1200&q=80', alt: 'Alongamento e mobilidade em casa' },
  { url: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=1200&q=80', alt: 'Halteres e treino funcional em casa' },
  { url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80', alt: 'Compras de alimentos no supermercado' },
  { url: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&q=80', alt: 'Treino com acompanhamento profissional' },
];
const n = galeria.length;
const capa    = galeria[semana % n];
const inline1 = galeria[(semana + 3) % n];
const inline2 = galeria[(semana + 6) % n];

// ── Palavras-chave para Google Trends ──────────────────────────────────────
const palavrasChave = [
  'treino em casa',
  'morar fora do brasil',
  'home office',
  'alimentação saudável',
  'personal trainer online',
  'exercício em casa',
  'brasileiros no exterior',
  'qualidade de vida',
];

async function buscarTendencias() {
  const tendencias = [];
  for (const palavra of palavrasChave) {
    try {
      const resultado = await googleTrends.relatedQueries({
        keyword: palavra,
        geo: 'BR',
        hl: 'pt-BR',
      });
      const dados = JSON.parse(resultado);
      const rising = dados?.default?.rankedList?.[0]?.rankedKeyword;
      if (rising && rising.length > 0) {
        rising.slice(0, 2).forEach(({ query, value }) => {
          tendencias.push({ query, value: value || 0, origem: palavra });
        });
      }
    } catch (e) {
      console.log(`Trends indisponível para "${palavra}": ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }
  return tendencias;
}

async function main() {
  // ── Tendências ─────────────────────────────────────────────────────────────
  let contextoTrends = '';
  let trendQueries = [];

  try {
    console.log('Buscando tendências no Google Trends Brasil...');
    const tendencias = await buscarTendencias();

    if (tendencias.length > 0) {
      tendencias.sort((a, b) => b.value - a.value);
      const top5 = tendencias.slice(0, 5);
      trendQueries = top5.map(t => t.query);
      contextoTrends = `\n\nTendências atuais no Google Brasil (use como inspiração):\n` +
        top5.map((t, i) => `${i + 1}. "${t.query}" (relacionado a: ${t.origem})`).join('\n');
      console.log('Top tendências:');
      top5.forEach(t => console.log(`  - ${t.query} (valor: ${t.value})`));
    } else {
      console.log('Sem tendências — usando tema rotativo.');
    }
  } catch (e) {
    console.log(`Erro trends: ${e.message}. Usando tema rotativo.`);
  }

  // ── Escolher tema evitando repetir o assunto dos últimos posts ───────────────
  const recentes = lerPostsRecentes(3);
  console.log(`Posts recentes: ${recentes.join(' | ') || '(nenhum)'}`);

  // Candidatos: tendências primeiro (se forem sobre nosso universo), depois fallback rotativo.
  // As tendências entram como INSPIRAÇÃO; o tema final é sempre desenvolvido dentro do universo Do Right.
  const candidatos = [];
  for (let i = 0; i < temasFallback.length; i++) {
    candidatos.push(temasFallback[(semana + i) % temasFallback.length]);
  }

  let temaDestaque = candidatos.find(c => !ehRepetitivo(c, recentes));
  if (!temaDestaque) {
    temaDestaque = candidatos[0] || temaFallback;
    console.log('Todos os candidatos repetem posts recentes — usando o primeiro mesmo assim.');
  }

  console.log(`\nSemana: ${semana} | Assuntos recentes: ${recentes.map(assuntoDe).join(',') || '—'}`);
  console.log(`Tema escolhido: ${temaDestaque} (assunto: ${assuntoDe(temaDestaque) || 'genérico'})`);

  // ── Gemini ──────────────────────────────────────────────────────────────────
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: 'Você é o editor de conteúdo do blog da Do Right, empresa de treinamento físico ONLINE para brasileiros que moram fora do Brasil (expatriados). O personal trainer é brasileiro, atende à distância em português e inglês. O público são brasileiros vivendo no exterior que querem manter saúde, treino, boa alimentação e qualidade de vida longe de casa. Escreva sempre em português brasileiro, com tom acolhedor, motivador e prático, como quem entende na pele o desafio de treinar e se alimentar bem vivendo em outro país. Siga exatamente o formato pedido pelo usuário.',
  });

  const recentesTxt = recentes.length ? recentes.map(t => `- ${t}`).join('\n') : '- (nenhuma)';

  const userPrompt = `Gere um post de blog para a semana ${semana} do ano ${ano}.

Escreva ESPECIFICAMENTE e SOMENTE sobre este tema: **${temaDestaque}**
${contextoTrends}

⚠️ REGRA OBRIGATÓRIA DE NÃO-REPETIÇÃO: as matérias abaixo já foram publicadas. É PROIBIDO repetir o assunto delas — escolha ângulo, exemplos e dicas diferentes. Se o tema acima parecer próximo de uma delas, aprofunde num recorte novo (outro país, outra rotina, outro obstáculo).

Matérias recentes já publicadas (NÃO repita o assunto delas):
${recentesTxt}

O público é sempre o brasileiro que MORA FORA do Brasil. Traga a realidade de quem está longe de casa (fuso, clima, saudade, supermercado diferente, rotina de trabalho no exterior, treinar sozinho em casa). Quando fizer sentido, contraste "treinar sozinho / com app / com IA" versus "ter um personal brasileiro de verdade acompanhando à distância" — esse é o diferencial da Do Right.

Responda EXATAMENTE neste formato, sem nada antes nem depois:

TITULO: Título chamativo e direto com número ou promessa concreta (sem aspas)
RESUMO: Uma frase que desperta curiosidade e resume o benefício principal (sem aspas)
CORPO:
[introdução de 2-3 linhas conectando o tema à vida do brasileiro no exterior — use um dado, cena do cotidiano ou pergunta que o leitor reconheça]

---

## A Realidade: [subtítulo sobre o desafio de quem mora fora]
[2-3 parágrafos com situações reais de quem vive no exterior]

## O Caminho: [subtítulo sobre a solução]
[2-3 parágrafos explicando como resolver — pode usar listas com ✅ ou ❌]

## Na Prática: [subtítulo com passo a passo ou dicas]
[2-3 parágrafos com orientações concretas e aplicáveis — use numeração ou lista]

## Erros Comuns
[3-4 erros que brasileiros no exterior cometem, no formato: ❌ **Erro X** — explicação breve + como fazer certo]

## Conclusão
[Parágrafo final resumindo o benefício + convite caloroso e sem pressão para treinar com a Do Right]

Links obrigatórios — insira naturalmente no texto em pelo menos 3 pontos diferentes:
- Site: [Do Right](https://doright.fit) — use ao mencionar a empresa pela primeira vez e na conclusão
- Instagram: [@doright.fit](https://www.instagram.com/doright.fit) — use em 1 dica ou callout no meio do texto
- Exemplo de callout: > 💡 Acompanhe treinos e dicas para brasileiros no exterior: [@doright.fit](https://www.instagram.com/doright.fit)

Regras obrigatórias:
- Não use front matter YAML
- Não escreva "hashtags" nem "tags"
- Não inclua imagens (serão inseridas depois)
- Use Markdown: ## para títulos, **negrito**, *itálico*, listas com - ou números
- Tom: acolhedor, motivador e prático, voltado ao brasileiro que mora fora do Brasil
- Sempre chame a empresa de "Do Right" (nunca abreviar)`;

  async function gerarComRetry(tentativa = 1) {
    try {
      console.log(`\nChamando Gemini... (tentativa ${tentativa})`);
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    } catch (err) {
      const isQuota = err.message && err.message.includes('quota');
      const isRate  = err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'));
      if ((isQuota || isRate) && tentativa < 4) {
        const espera = tentativa * 30000;
        console.log(`Limite de quota. Aguardando ${espera/1000}s...`);
        await new Promise(r => setTimeout(r, espera));
        return gerarComRetry(tentativa + 1);
      }
      throw err;
    }
  }

  const bruto = await gerarComRetry();

  // ── Montar post final ───────────────────────────────────────────────────────
  const limpaAspas = (s) => s.replace(/^["']|["']$/g, '').replace(/"/g, '').trim();

  const mTitulo = bruto.match(/TITULO:\s*(.+)/i);
  const mResumo = bruto.match(/RESUMO:\s*(.+)/i);
  const mCorpo  = bruto.match(/CORPO:\s*([\s\S]*)$/i);

  const titulo = mTitulo ? limpaAspas(mTitulo[1]) : temaDestaque;
  const resumo = mResumo ? limpaAspas(mResumo[1]) : `Dicas de saúde e treino para brasileiros no exterior — Do Right.`;

  let corpo = mCorpo ? mCorpo[1] : bruto;
  corpo = corpo
    .replace(/^---[\s\S]*?---/, '')
    .replace(/^\s*TITULO:.*$/gim, '')
    .replace(/^\s*RESUMO:.*$/gim, '')
    .replace(/^\s*CORPO:\s*$/gim, '')
    .replace(/^\s*hashtags?:.*$/gim, '')
    .trim();

  // Inserir fotos
  corpo = corpo.replace(/\n#{2,3} /, `\n\n![${inline1.alt}](${inline1.url})\n\n## `);
  if (/\n#{2,3}\s*Conclus/i.test(corpo)) {
    corpo = corpo.replace(/\n#{2,3}\s*Conclus[^\n]*/i, (m) =>
      `\n\n![${inline2.alt}](${inline2.url})${m}`);
  }

  // Callout SEO interno no 2º subtítulo
  let nTitulos = 0;
  corpo = corpo.replace(/\n#{2,3} /g, (m) => {
    nTitulos++;
    if (nTitulos === 2) {
      return `\n\n> 💡 **Quer treinar com acompanhamento de verdade, onde você estiver?** Conheça a [Do Right](https://doright.fit) e fale com a gente.\n${m}`;
    }
    return m;
  });

  const frontMatter = [
    '---',
    'layout: post',
    `title: "${titulo}"`,
    `date: ${dataHoje} ${pad(hoje.getUTCHours())}:${pad(hoje.getUTCMinutes())}:${pad(hoje.getUTCSeconds())} +0000`,
    `excerpt: "${resumo}"`,
    'author: "Equipe Do Right"',
    `cover: "${capa.url}"`,
    '---',
    '',
  ].join('\n');

  const conteudo = `${frontMatter}\n${corpo}\n`;

  const nomeArquivo = `_posts/${dataHoje}-post-semana-${String(semana).padStart(2, '0')}.md`;
  fs.writeFileSync(path.join(process.cwd(), nomeArquivo), conteudo, 'utf8');

  console.log(`\nPost salvo: ${nomeArquivo}`);
  console.log('--- Prévia ---');
  console.log(conteudo.substring(0, 400));

  const temaSanitizado = temaDestaque
    .replace(/[^\w\sáéíóúãõâêîôûàèìòùçÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙÇ-]/g, '')
    .trim()
    .substring(0, 60);

  const slug = `post-semana-${String(semana).padStart(2, '0')}`;
  const postUrl = `https://doright.fit/blog/${ano}/${pad(hoje.getMonth() + 1)}/${pad(hoje.getDate())}/${slug}/`;

  const envFile = process.env.GITHUB_ENV;
  if (envFile) {
    fs.appendFileSync(envFile, `NOME_ARQUIVO=${nomeArquivo}\n`);
    fs.appendFileSync(envFile, `SEMANA=${semana}\n`);
    fs.appendFileSync(envFile, `TEMA=${temaSanitizado}\n`);
    fs.appendFileSync(envFile, `TITULO=${titulo}\n`);
    fs.appendFileSync(envFile, `POST_URL=${postUrl}\n`);
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
