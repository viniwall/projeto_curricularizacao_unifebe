/*
 * atividades.js — planetas, cenas e tipos de resposta
 *
 * Cada planeta é uma atividade e só tem perguntas do seu tema:
 *   Planeta dos Sons     (Sons e Sílabas)     sons, rimas, sílabas, letras e palavras
 *   Planeta dos Lugares  (Noções de Espaço)   dentro, fora, em cima, embaixo, entre, lados, caminhos
 *   Planeta dos Números  (Matemática Simples) contar, comparar e ordenar quantidades
 *   Planeta das Cores    (Cores)              nomes das cores, pintura, padrões, misturas
 *
 * Tipos de resposta (campo "tipo" em data/perguntas.json):
 *   escolha  – tocar em uma alternativa (2 a 4)
 *   montar   – montar uma palavra com pecinhas de sílabas ou letras (sobra uma)
 *   ordenar  – tocar nas figuras ou números na ordem pedida
 *   colocar  – tocar no lugar da cena onde o objeto deve ficar
 *   rota     – programar o robô com setas e tocar em IR
 *   pintar   – escolher a tinta e tocar no desenho
 *
 * Cada componente de resposta chama aoResponder(correto, elemento) a cada
 * tentativa completa e expõe: tentarDeNovo(), revelar(), travar(),
 * destacar() (guia o olhar depois da narração) e chamarAtencao().
 */
const Atividades = (() => {
  const ORDEM = ['Sons e Sílabas', 'Noções de Espaço', 'Matemática Simples', 'Cores'];

  const INFO = {
    'Sons e Sílabas': {
      chave: 'sons', planeta: 'Planeta dos Sons', curto: 'Sons', imagem: 'assets/img/planeta-sons.svg',
      brilho: '#FF6FAE', tema: 'sons', intro: 'intro_sons', explorou: 'explorou_sons'
    },
    'Noções de Espaço': {
      chave: 'lugares', planeta: 'Planeta dos Lugares', curto: 'Lugares', imagem: 'assets/img/planeta-lugares.svg',
      brilho: '#2EE6C5', tema: 'lugares', intro: 'intro_lugares', explorou: 'explorou_lugares'
    },
    'Matemática Simples': {
      chave: 'numeros', planeta: 'Planeta dos Números', curto: 'Números', imagem: 'assets/img/planeta-numeros.svg',
      brilho: '#FFC94D', tema: 'numeros', intro: 'intro_numeros', explorou: 'explorou_numeros'
    },
    'Cores': {
      chave: 'cores', planeta: 'Planeta das Cores', curto: 'Cores', imagem: 'assets/img/planeta-cores.svg',
      brilho: '#B39DFF', tema: 'cores', intro: 'intro_cores', explorou: 'explorou_cores'
    }
  };

  // ---------- falas gravadas (data/falas.json) ----------
  let falas = { frases: {}, letras: {}, numeros: {}, cores: {} };
  const definirFalas = d => { if (d) falas = d; };
  const frase = k => falas.frases[k] || { texto: k };
  const falaNumero = n => falas.numeros[String(n)] || { texto: String(n) };
  const falaLetra = l => falas.letras[l] || { texto: l };
  const falaCor = c => falas.cores[c] || { texto: String(c).toLowerCase() };

  // ---------- utilidades ----------
  function el(tag, classe, filhos) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    (filhos || []).forEach(f => e.appendChild(f));
    return e;
  }
  function img(src, classe) {
    const i = el('img', classe);
    i.src = src;
    i.alt = '';
    i.draggable = false;
    i.decoding = 'async';
    return i;
  }
  function botao(classe, rotulo) {
    const b = el('button', classe);
    b.type = 'button';
    if (rotulo) b.setAttribute('aria-label', rotulo);
    return b;
  }
  function embaralhar(lista) {
    const c = lista.slice();
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  }
  // Evita que a ordem embaralhada já seja a resposta (perde a graça).
  function embaralharDiferente(lista, igual) {
    let c = embaralhar(lista);
    for (let k = 0; k < 6 && igual(c); k++) c = embaralhar(lista);
    return c;
  }
  function reiniciarAnimacao(e, classe) {
    e.classList.remove(classe);
    void e.offsetWidth;
    e.classList.add(classe);
  }
  const esperar = ms => new Promise(r => window.setTimeout(r, ms));
  const reduzirMovimento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const e = document.createElementNS(SVGNS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, String(v)));
    return e;
  }

  // ---------- desenhos de colorir (assets/img/pintar) ----------
  const DESENHOS = ['bola', 'estrela', 'sol', 'banana', 'maca', 'uva', 'sapo', 'flor', 'peixe', 'balao'];
  const modelos = new Map();
  function carregarDesenhos() {
    return Promise.all(DESENHOS.map(nome =>
      fetch(`assets/img/pintar/${nome}.svg`)
        .then(r => (r.ok ? r.text() : Promise.reject(new Error(nome))))
        .then(texto => {
          const doc = new DOMParser().parseFromString(texto, 'image/svg+xml');
          modelos.set(nome, doc.documentElement);
        })
        .catch(() => { /* sem o arquivo: usa a imagem simples */ })));
  }
  function pintarSvg(svg, cor) {
    svg.querySelectorAll('.regiao').forEach(e => e.setAttribute('fill', cor || '#FFFFFF'));
    svg.querySelectorAll('.regiao-clara').forEach(e => {
      e.setAttribute('fill', cor || '#FFFFFF');
      e.setAttribute('fill-opacity', cor ? '0.45' : '1');
    });
    svg.querySelectorAll('.regiao-traco').forEach(e => e.setAttribute('stroke', cor || '#D9D9D9'));
  }
  function desenho(nome, cor) {
    const modelo = modelos.get(nome);
    if (!modelo) return img(`assets/img/pintar/${nome}.svg`, 'desenho');
    const svg = document.importNode(modelo, true);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('desenho');
    if (cor) pintarSvg(svg, cor);
    return svg;
  }

  // Seta desenhada (não depende de fonte instalada).
  const ROTACAO = { direita: 0, baixo: 90, esquerda: 180, cima: 270 };
  function seta(direcao) {
    const s = svgEl('svg', { viewBox: '0 0 100 100', class: 'seta-svg', 'aria-hidden': 'true', focusable: 'false' });
    const g = svgEl('g', { transform: `rotate(${ROTACAO[direcao]} 50 50)` });
    g.appendChild(svgEl('path', { d: 'M14 40 H56 V20 L88 50 L56 80 V60 H14 Z', fill: 'currentColor', 'stroke-linejoin': 'round' }));
    s.appendChild(g);
    return s;
  }

  // ---------- Órbi, o robô ----------
  const T = 'stroke="#0B1026" stroke-width="2.5" stroke-linejoin="round"';
  const ORBI_SVG =
    '<svg viewBox="0 0 110 110" aria-hidden="true" focusable="false"><defs>' +
    '<linearGradient id="orbi-metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#B9C4F2"/></linearGradient>' +
    '</defs><g class="orbi-corpo">' +
    '<path class="orbi-chama" d="M47 92 Q55 112 63 92 Z" fill="#FFC94D"/>' +
    '<path class="orbi-braco" d="M88 70 Q100 60 98 46" fill="none" stroke="#0B1026" stroke-width="8" stroke-linecap="round"/>' +
    '<path class="orbi-braco" d="M88 70 Q100 60 98 46" fill="none" stroke="#C7D2FE" stroke-width="4" stroke-linecap="round"/>' +
    '<line x1="55" y1="20" x2="55" y2="8" stroke="#C7D2FE" stroke-width="3"/>' +
    `<circle class="orbi-antena" cx="55" cy="7" r="5" fill="#FFC94D" ${T}/>` +
    `<rect x="14" y="38" width="10" height="18" rx="4" fill="#FF6FAE" ${T}/>` +
    `<rect x="86" y="38" width="10" height="18" rx="4" fill="#FF6FAE" ${T}/>` +
    `<rect x="21" y="20" width="68" height="52" rx="24" fill="url(#orbi-metal)" ${T}/>` +
    '<rect x="30" y="31" width="50" height="30" rx="15" fill="#0B1026"/>' +
    '<g class="orbi-olhos"><ellipse cx="45" cy="44" rx="5" ry="7" fill="#4DE1FF"/><ellipse cx="65" cy="44" rx="5" ry="7" fill="#4DE1FF"/></g>' +
    '<g class="orbi-feliz"><path d="M39 46 Q45 38 51 46 M59 46 Q65 38 71 46" fill="none" stroke="#9BF06A" stroke-width="4" stroke-linecap="round"/></g>' +
    '<rect class="orbi-boca" x="49" y="53" width="12" height="4" rx="2" fill="#4DE1FF"/>' +
    `<rect x="37" y="72" width="36" height="20" rx="10" fill="url(#orbi-metal)" ${T}/>` +
    '<circle cx="55" cy="82" r="4" fill="#9BF06A"/>' +
    '</g></svg>';
  let orbis = 0;
  function criarOrbi(container) {
    container.innerHTML = ORBI_SVG.replace(/orbi-metal/g, 'orbi-metal-' + (++orbis));
  }

  const MAOS_SVG =
    '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<path d="M24 58 L13 35 Q11 29 16 28 Q20 27 22 32 L25 39 L19 16 Q18 11 23 10 Q27 10 28 15 L32 30 L31 11 Q31 6 36 6 Q40 6 40 11 L41 30 L43 17 Q44 13 48 14 Q51 15 50 20 L47 44 Q45 55 37 58 Z" fill="#FFD8B0" stroke="#2b2b2b" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M8 20 L3 16 M10 11 L7 5 M16 7 L16 1 M56 26 L62 24 M56 34 L62 36" stroke="#E07000" stroke-width="3" stroke-linecap="round"/></svg>';

  // ---------- conteúdo visual ----------
  // Uma figura de grupo pode ser imagem comum ou desenho pintado com uma cor.
  const figura = it => (it.desenho ? desenho(it.desenho, it.cor) : img(it.imagem));

  function grupo(itens, colunasFixas, contar, saindo = 0) {
    const figuras = [];
    itens.forEach(it => { for (let k = 0; k < it.quantidade; k++) figuras.push(it); });
    const n = figuras.length;
    const g = el('div', 'grupo');
    g.style.setProperty('--colunas', String(Math.min(colunasFixas || Math.max(1, Math.ceil(Math.sqrt(n))), n)));
    figuras.forEach((it, i) => {
      if (i >= n - saindo) {
        const f = figura(it);
        f.classList.add('saindo');
        g.appendChild(f);
      } else if (contar) {
        const b = botao('contavel', 'Contar esta figura');
        b.appendChild(el('span', 'contavel-figura', [figura(it), el('span', 'selo')]));
        b.addEventListener('click', () => contar(b));
        g.appendChild(b);
      } else g.appendChild(figura(it));
    });
    return g;
  }

  function composicao(camadas) {
    const c = el('div', 'composicao alt-conteudo');
    camadas.forEach(cam => {
      const i = img(cam.imagem, cam.espelhar ? 'espelhado' : '');
      i.style.left = cam.x + '%';
      i.style.top = cam.y + '%';
      i.style.width = cam.largura + '%';
      i.style.zIndex = String(cam.z || 1);
      c.appendChild(i);
    });
    return c;
  }

  function tabuleiro(g, classe) {
    const tab = el('div', 'tabuleiro' + (classe ? ' ' + classe : ''));
    tab.style.setProperty('--colunas', String(g.colunas));
    tab.style.setProperty('--linhas', String(g.linhas));
    const quadros = {};
    for (let l = g.linhas - 1; l >= 0; l--) {
      for (let c = 0; c < g.colunas; c++) {
        const q = el('div', 'quadro');
        quadros[c + ',' + l] = q;
        tab.appendChild(q);
      }
    }
    quadros[g.alvo.join(',')].appendChild(img('assets/img/cristal.svg'));
    (g.obstaculos || []).forEach(o => quadros[o.join(',')].appendChild(img('assets/img/cratera.svg')));
    const robo = img('assets/img/rover.svg', 'robo');
    quadros[g.inicio.join(',')].appendChild(robo);
    tab.setAttribute('role', 'img');
    tab.setAttribute('aria-label', 'Tabuleiro com o robô, o cristal' + ((g.obstaculos || []).length ? ' e buracos' : ''));
    return { tab, quadros, robo };
  }

  function arcoIris(cores, falta) {
    const s = svgEl('svg', { viewBox: '0 0 240 128', class: 'arco-iris', role: 'img', 'aria-label': 'Arco-íris com uma cor faltando' });
    cores.forEach((cor, i) => {
      const R = 112 - i * 15, r = R - 15;
      const d = `M${120 - R} 122 A${R} ${R} 0 0 1 ${120 + R} 122 L${120 + r} 122 A${r} ${r} 0 0 0 ${120 - r} 122 Z`;
      if (i === falta) {
        s.appendChild(svgEl('path', { d, fill: '#FFFFFF', stroke: '#5B7CFF', 'stroke-width': 2.5, 'stroke-dasharray': '6 5' }));
        const t = svgEl('text', { x: 120, y: 122 - (R + r) / 2 + 6, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: '#5B7CFF' });
        t.textContent = '?';
        s.appendChild(t);
      } else {
        s.appendChild(svgEl('path', { d, fill: cor }));
      }
    });
    return s;
  }

  function conteudoAlternativa(alt) {
    switch (alt.tipo) {
      case 'texto': {
        const t = el('span', 'texto-grande' + (alt.rotulo.length > 1 ? ' texto-palavra' : ''));
        t.textContent = alt.rotulo;
        return t;
      }
      case 'numero': {
        const caixa = el('div', 'alt-conteudo numero');
        const v = el('span', 'numero-valor');
        v.textContent = alt.rotulo;
        const pontos = el('div', 'pontos');
        for (let k = 0; k < alt.valor; k++) pontos.appendChild(el('span'));
        caixa.append(v, pontos);
        return caixa;
      }
      case 'cor': {
        const a = el('div', 'amostra');
        a.style.backgroundColor = alt.cor;
        return el('div', 'alt-conteudo', [a]);
      }
      case 'seta': return el('div', 'alt-conteudo seta-alt', [seta(alt.direcao)]);
      case 'pintada': return el('div', 'alt-conteudo', [desenho(alt.desenho, alt.cor)]);
      case 'grupo': {
        const g = grupo(alt.itens);
        g.style.width = '100%';
        g.style.height = '100%';
        return el('div', 'alt-conteudo', [g]);
      }
      case 'composicao': return composicao(alt.camadas);
      default: {
        const caixa = el('div', 'alt-conteudo figura' + (alt.sombra ? ' sombra' : ''), [img(alt.imagem, alt.espelhar ? 'espelhado' : '')]);
        if (alt.escala) caixa.style.setProperty('--escala', String(alt.escala));
        return caixa;
      }
    }
  }

  // ---------- cenas ----------
  function criarContador() {
    let total = 0;
    return alvo => {
      let n = Number(alvo.dataset.n);
      if (!n) {
        n = ++total;
        alvo.dataset.n = String(n);
        alvo.classList.add('contado');
        const selo = alvo.querySelector('.selo');
        if (selo) selo.textContent = String(n);
      }
      reiniciarAnimacao(alvo, 'pulou');
      Som.efeito('contar', n);
      Som.falar([falaNumero(n)]);
    };
  }

  function palmas(p) {
    const caixa = el('div', 'palmas');
    const b = botao('btn-palmas', 'Bater palmas para cada parte da palavra');
    b.innerHTML = MAOS_SVG;
    const marcas = el('div', 'marcas');
    marcas.setAttribute('aria-hidden', 'true');
    let i = 0;
    b.addEventListener('click', () => {
      if (i >= p.silabas.length) { i = 0; marcas.textContent = ''; }
      const m = el('span', 'marca');
      m.textContent = String(i + 1);
      marcas.appendChild(m);
      reiniciarAnimacao(b, 'bateu');
      Som.efeito('palma');
      Som.falar([{ texto: p.silabas[i], arquivo: (p.silabas_audio || [])[i] }]);
      i++;
    });
    caixa.append(b, marcas);
    return caixa;
  }

  const colunasCena = n => (n <= 4 ? n : Math.ceil(n / 2));

  function renderCena(p, area) {
    area.textContent = '';
    const c = p.cena;
    if (c) {
      switch (c.tipo) {
        case 'imagem': area.appendChild(img(c.imagem)); break;
        case 'desenho': area.appendChild(el('div', 'cena-desenho', [desenho(c.desenho, null)])); break;
        case 'grupo': {
          const total = c.itens.reduce((s, it) => s + it.quantidade, 0);
          area.appendChild(grupo(c.itens, colunasCena(total), criarContador()));
          break;
        }
        case 'operacao': {
          const contar = criarContador();
          const [a, sinal, b] = c.partes;
          const op = el('div', 'operacao');
          if (sinal === '+') {
            [a, b].forEach((parte, k) => {
              const g = grupo([parte], parte.quantidade, contar);
              g.style.flexGrow = String(parte.quantidade);
              op.appendChild(g);
              if (k === 0) { const s = el('span', 'sinal'); s.textContent = '+'; op.appendChild(s); }
            });
          } else {
            op.appendChild(grupo([a], a.quantidade, contar, b.quantidade));
          }
          area.appendChild(op);
          break;
        }
        case 'palavra': {
          if (c.texto.length === 1) {
            const l = el('span', 'letra-solta');
            l.textContent = c.texto;
            area.appendChild(l);
            break;
          }
          const contar = criarContador();
          const pal = el('div', 'palavra');
          [...c.texto].forEach(letra => {
            const b = botao('letra-caixa', 'Contar a letra ' + letra);
            b.append(document.createTextNode(letra), el('span', 'selo'));
            b.addEventListener('click', () => contar(b));
            pal.appendChild(b);
          });
          area.appendChild(pal);
          break;
        }
        case 'sequencia': {
          const s = el('div', 'sequencia');
          c.itens.forEach(it => {
            if (it.tipo === 'imagem') s.appendChild(el('span', '', [img(it.imagem)]));
            else if (it.tipo === 'pintada') s.appendChild(el('span', '', [desenho(it.desenho, it.cor)]));
            else if (it.tipo === 'numero') { const n = el('span', 'num-seq'); n.textContent = String(it.valor); s.appendChild(n); }
            else { const l = el('span', 'lacuna num-seq'); l.textContent = '?'; s.appendChild(l); }
          });
          area.appendChild(s);
          break;
        }
        case 'pictograma': {
          const g = el('div', 'pictograma');
          g.setAttribute('role', 'img');
          g.setAttribute('aria-label', c.titulo);
          c.colunas.forEach(col => {
            const coluna = el('div', 'picto-coluna');
            coluna.appendChild(img(col.imagem, 'picto-rotulo'));
            for (let k = 0; k < col.quantidade; k++) coluna.appendChild(img('assets/img/estrela.svg'));
            g.appendChild(coluna);
          });
          area.appendChild(g);
          break;
        }
        case 'mistura': {
          const m = el('div', 'mistura');
          c.cores.forEach((cor, k) => {
            const gota = el('span', 'gota');
            gota.style.background = cor;
            m.appendChild(gota);
            const s = el('span', 'sinal');
            s.textContent = k === 0 ? '+' : '=';
            m.appendChild(s);
          });
          const q = el('span', 'gota misterio');
          const t = el('span');
          t.textContent = '?';
          q.appendChild(t);
          m.appendChild(q);
          area.appendChild(m);
          break;
        }
        case 'arco-iris': area.appendChild(arcoIris(c.cores, c.falta)); break;
        case 'tabuleiro': area.appendChild(tabuleiro(c, 'mini').tab); break;
        default: break;
      }
    }
    if (p.silabas) area.appendChild(palmas(p));
    const tipo = c ? c.tipo : '';
    area.classList.toggle('cena-contagem', tipo === 'grupo' || tipo === 'operacao' || tipo === 'pictograma');
    area.hidden = !area.childElementCount;
  }

  // ---------- respostas ----------
  function respostaEscolha(p, area, aoResponder) {
    const grade = el('div', 'alternativas');
    const alts = embaralhar(p.alternativas);
    grade.dataset.n = String(alts.length);
    grade.style.setProperty('--n', String(alts.length));
    // Moldura colorida, exceto quando a resposta é uma cor (a moldura confundiria).
    const usarCores = !alts.some(a => a.tipo === 'cor' || a.tipo === 'pintada');
    const botoes = {};
    let travado = false;
    alts.forEach((alt, i) => {
      const b = botao('alt alt-' + alt.tipo + (usarCores ? ' cor-' + (i % 4) : ''), alt.rotulo);
      b.style.setProperty('--i', String(i));
      b.dataset.id = alt.id;
      b.appendChild(conteudoAlternativa(alt));
      b.addEventListener('click', () => {
        if (travado || b.disabled) return;
        const certo = alt.id === p.resposta_correta;
        if (certo) {
          travado = true;
          Object.values(botoes).forEach(o => { o.disabled = o !== b; });
          b.classList.add('certa');
        } else {
          b.disabled = true;
          b.classList.add('tentou');
        }
        aoResponder(certo, b);
      });
      botoes[alt.id] = b;
      grade.appendChild(b);
    });
    area.appendChild(grade);
    const ativos = () => Object.values(botoes).filter(b => !b.disabled);
    return {
      tentarDeNovo() {},
      revelar() {
        travado = true;
        Object.values(botoes).forEach(b => { b.disabled = true; });
        const c = botoes[p.resposta_correta];
        c.classList.add('revelada');
        return c;
      },
      travar() { travado = true; Object.values(botoes).forEach(b => { b.disabled = true; }); },
      destacar() {
        Object.values(botoes).forEach((b, i) => window.setTimeout(() => {
          if (!b.isConnected || b.disabled) return;
          b.classList.add('olhe');
          window.setTimeout(() => b.classList.remove('olhe'), 420);
        }, i * 480));
      },
      chamarAtencao() { ativos().forEach(b => { reiniciarAnimacao(b, 'chamar'); window.setTimeout(() => b.classList.remove('chamar'), 1000); }); }
    };
  }

  // Montar e ordenar: pecinhas que vão para as casinhas na ordem dos toques.
  function respostaPecas(p, area, aoResponder, modo) {
    const montar = modo === 'montar';
    const caixa = el('div', 'montagem');
    const casas = el('div', 'casas');
    const banco = el('div', 'banco');
    banco.setAttribute('aria-label', 'Pecinhas');
    const total = montar ? p.resposta_correta.length : p.alternativas.length;
    const vagas = [];
    for (let k = 0; k < total; k++) {
      const v = el('div', 'casa-peca' + (montar ? '' : ' ordem'));
      v.dataset.pos = String(k + 1);
      vagas.push(v);
      casas.appendChild(v);
    }
    let travado = false;

    const pecas = montar
      ? p.pecas.map((t, i) => ({ id: 'p' + i, rotulo: t, fala: { texto: t, arquivo: (p.pecas_audio || [])[i] } }))
      : p.alternativas.map(a => ({ id: a.id, rotulo: a.rotulo, alt: a, fala: a.tipo === 'numero' ? falaNumero(a.valor) : null }));
    const esperado = p.resposta_correta;
    const chave = pc => (montar ? pc.rotulo : pc.id);
    const ordem = embaralharDiferente(pecas, lista => lista.slice(0, total).map(chave).join('|') === esperado.join('|'));

    const elementos = {};
    ordem.forEach(pc => {
      const figuraPeca = pc.alt && pc.alt.tipo !== 'numero';
      const b = botao('peca' + (figuraPeca ? ' figura-peca' : ''), pc.rotulo);
      b.dataset.id = pc.id;
      if (figuraPeca) b.appendChild(conteudoAlternativa(pc.alt));
      else b.textContent = pc.rotulo;
      b.addEventListener('click', () => tocar(b, pc));
      elementos[pc.id] = b;
      banco.appendChild(b);
    });

    function sequencia() {
      return vagas.map(v => v.firstElementChild).filter(Boolean)
        .map(b => (montar ? pecas.find(x => x.id === b.dataset.id).rotulo : b.dataset.id));
    }
    function tocar(b, pc) {
      if (travado) return;
      if (b.parentElement === banco) {
        const livre = vagas.find(v => !v.firstElementChild);
        if (!livre) return;
        livre.appendChild(b);
        if (pc.fala) Som.falar([pc.fala]);
        else Som.efeito('toque');
      } else {
        banco.appendChild(b);
        Som.efeito('toque');
      }
      if (vagas.every(v => v.firstElementChild)) {
        travado = true;
        window.setTimeout(() => {
          const certo = sequencia().join('|') === esperado.join('|');
          caixa.classList.toggle('certo', certo);
          if (!certo) reiniciarAnimacao(caixa, 'errou');
          aoResponder(certo, casas);
        }, 450);
      }
    }
    caixa.append(casas, banco);
    area.appendChild(caixa);

    function devolverTudo() {
      vagas.forEach(v => { if (v.firstElementChild) banco.appendChild(v.firstElementChild); });
    }
    return {
      tentarDeNovo() {
        window.setTimeout(() => { devolverTudo(); caixa.classList.remove('errou'); travado = false; }, 700);
      },
      revelar() {
        travado = true;
        devolverTudo();
        esperado.forEach((valor, k) => {
          const pc = montar
            ? pecas.find(x => x.rotulo === valor && !vagas.some(v => v.firstElementChild === elementos[x.id]))
            : pecas.find(x => x.id === valor);
          vagas[k].appendChild(elementos[pc.id]);
        });
        caixa.classList.add('revelada');
        return casas;
      },
      travar() { travado = true; },
      destacar() {},
      chamarAtencao() { [...banco.children].forEach(b => reiniciarAnimacao(b, 'pulou')); }
    };
  }

  function respostaColocar(p, area, aoResponder) {
    const cen = p.cenario;
    const caixa = el('div', 'colocar');
    const palco = el('div', 'palco');
    const bandeja = el('div', 'bandeja');
    const item = el('div', 'bandeja-item', [img(cen.item)]);
    bandeja.appendChild(item);
    let travado = false;
    let cena = null;

    function mostrar(camadas) {
      if (cena) cena.remove();
      cena = composicao(camadas);
      palco.insertBefore(cena, palco.firstChild);
    }
    mostrar(cen.base);
    cen.zonas.forEach(z => {
      const b = botao('zona', 'Colocar ' + z.id);
      b.style.left = z.x + '%';
      b.style.top = z.y + '%';
      b.addEventListener('click', () => {
        if (travado || b.classList.contains('tentou')) return;
        travado = true;
        mostrar(z.camadas);
        item.classList.add('vazio');
        Som.efeito('toque');
        const certo = z.id === cen.resposta;
        if (certo) palco.classList.add('resolvido');
        else b.classList.add('tentou');
        window.setTimeout(() => aoResponder(certo, palco), 350);
      });
      palco.appendChild(b);
    });
    caixa.append(palco, bandeja);
    area.appendChild(caixa);
    return {
      tentarDeNovo() {
        window.setTimeout(() => { mostrar(cen.base); item.classList.remove('vazio'); travado = false; }, 1100);
      },
      revelar() {
        travado = true;
        mostrar(cen.zonas.find(x => x.id === cen.resposta).camadas);
        item.classList.add('vazio');
        palco.classList.add('resolvido');
        return palco;
      },
      travar() { travado = true; },
      destacar() {},
      chamarAtencao() { reiniciarAnimacao(item, 'pulou'); }
    };
  }

  const DIRECOES = {
    cima: { dc: 0, dl: 1, nome: 'para cima' },
    esquerda: { dc: -1, dl: 0, nome: 'para a esquerda' },
    baixo: { dc: 0, dl: -1, nome: 'para baixo' },
    direita: { dc: 1, dl: 0, nome: 'para a direita' }
  };

  function menorCaminho(g) {
    const igual = (a, b) => a[0] === b[0] && a[1] === b[1];
    const bloqueio = new Set(g.obstaculos.map(o => o.join(',')));
    const fila = [[g.inicio, []]];
    const visto = new Set([g.inicio.join(',')]);
    while (fila.length) {
      const [pos, cmds] = fila.shift();
      if (igual(pos, g.alvo)) return cmds;
      for (const [nome, d] of Object.entries(DIRECOES)) {
        const n = [pos[0] + d.dc, pos[1] + d.dl];
        const k = n.join(',');
        if (n[0] < 0 || n[0] >= g.colunas || n[1] < 0 || n[1] >= g.linhas || bloqueio.has(k) || visto.has(k)) continue;
        visto.add(k);
        fila.push([n, cmds.concat(nome)]);
      }
    }
    return [];
  }

  function respostaRota(p, area, aoResponder) {
    const g = p.grade;
    const caixa = el('div', 'rota');
    const { tab, quadros, robo } = tabuleiro(g);
    const k = (c, l) => c + ',' + l;

    const comandos = el('div', 'comandos');
    const setas = el('div', 'setas');
    const programa = el('div', 'programa');
    programa.setAttribute('aria-label', 'Programa do robô');
    const botoesRota = el('div', 'botoes-rota');
    const apagar = botao('btn-icone', 'Apagar a última seta');
    apagar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 3H7c-.7 0-1.2.3-1.6.9L0 12l5.4 8.1c.4.5.9.9 1.6.9h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.6L17.6 17 14 13.4 10.4 17 9 15.6 12.6 12 9 8.4 10.4 7 14 10.6 17.6 7 19 8.4 15.4 12z" fill="currentColor"/></svg>';
    const ir = el('button', 'btn btn-primario');
    ir.type = 'button';
    ir.textContent = 'IR!';
    botoesRota.append(apagar, ir);
    let cmds = [];
    let travado = false;

    function desenhar() {
      programa.textContent = '';
      for (let i = 0; i < g.max; i++) {
        if (i < cmds.length) {
          const s = el('span', 'cmd', [seta(cmds[i])]);
          s.setAttribute('aria-label', DIRECOES[cmds[i]].nome);
          programa.appendChild(s);
        } else programa.appendChild(el('span', 'vaga'));
      }
      setas.querySelectorAll('button').forEach(b => { b.disabled = travado || cmds.length >= g.max; });
      apagar.disabled = travado || !cmds.length;
      ir.disabled = travado || !cmds.length;
    }
    Object.entries(DIRECOES).forEach(([nome, d]) => {
      const b = botao('seta', 'Seta ' + d.nome);
      b.dataset.dir = nome;
      b.appendChild(seta(nome));
      b.addEventListener('click', () => {
        if (travado || cmds.length >= g.max) return;
        cmds.push(nome);
        Som.efeito('toque');
        desenhar();
      });
      setas.appendChild(b);
    });
    apagar.addEventListener('click', () => { if (!travado) { cmds.pop(); desenhar(); } });

    async function executar(lista) {
      Object.values(quadros).forEach(q => q.classList.remove('rastro'));
      let pos = g.inicio.slice();
      quadros[k(...pos)].appendChild(robo);
      const bloqueio = new Set(g.obstaculos.map(o => k(...o)));
      const marcas = [...programa.querySelectorAll('.cmd')];
      for (let i = 0; i < lista.length; i++) {
        const d = DIRECOES[lista[i]];
        marcas.forEach(m => m.classList.remove('ativo'));
        if (marcas[i]) marcas[i].classList.add('ativo');
        const n = [pos[0] + d.dc, pos[1] + d.dl];
        const fora = n[0] < 0 || n[0] >= g.colunas || n[1] < 0 || n[1] >= g.linhas;
        if (fora || bloqueio.has(k(...n))) {
          reiniciarAnimacao(robo, 'batida');
          Som.efeito('batida');
          await esperar(reduzirMovimento() ? 60 : 600);
          return false;
        }
        quadros[k(...pos)].classList.add('rastro');
        pos = n;
        quadros[k(...pos)].appendChild(robo);
        Som.efeito('passo');
        await esperar(reduzirMovimento() ? 60 : 420);
      }
      marcas.forEach(m => m.classList.remove('ativo'));
      return pos[0] === g.alvo[0] && pos[1] === g.alvo[1];
    }

    ir.addEventListener('click', async () => {
      if (travado || !cmds.length) return;
      travado = true;
      desenhar();
      const certo = await executar(cmds);
      aoResponder(certo, tab);
    });

    comandos.append(setas, programa, botoesRota);
    caixa.append(tab, comandos);
    area.appendChild(caixa);
    desenhar();

    return {
      tentarDeNovo() {
        window.setTimeout(() => {
          quadros[k(...g.inicio)].appendChild(robo);
          Object.values(quadros).forEach(q => q.classList.remove('rastro'));
          cmds = [];
          travado = false;
          desenhar();
        }, 900);
      },
      revelar() {
        cmds = menorCaminho(g);
        travado = true;
        desenhar();
        executar(cmds);
        return tab;
      },
      travar() { travado = true; desenhar(); },
      destacar() {},
      chamarAtencao() { setas.querySelectorAll('button').forEach(b => reiniciarAnimacao(b, 'pulou')); }
    };
  }

  // Pintar: escolhe a tinta e toca no desenho. Com um desenho só, a tinta já pinta.
  function respostaPintar(p, area, aoResponder) {
    const caixa = el('div', 'pintura');
    const paleta = el('div', 'paleta');
    paleta.setAttribute('role', 'radiogroup');
    paleta.setAttribute('aria-label', 'Tintas');
    const quadro = el('div', 'quadro-pintura');
    quadro.dataset.n = String(p.objetos.length);
    let tinta = null;
    let travado = false;
    const objetos = p.objetos.map(o => {
      const b = botao('obj-pintar', 'Desenho para pintar');
      b.dataset.id = o.id;
      const svg = desenho(o.desenho, null);
      b.appendChild(svg);
      const ob = { o, b, svg, cor: null, certo: false };
      b.addEventListener('click', () => {
        if (travado || ob.certo) return;
        if (!tinta) { [...paleta.children].forEach(t => reiniciarAnimacao(t, 'chamar')); return; }
        pintar(ob);
      });
      quadro.appendChild(b);
      return ob;
    });
    const tintas = p.paleta.map(t => {
      const b = botao('tinta', 'Tinta ' + t.nome.toLowerCase());
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.dataset.cor = t.nome;
      b.style.setProperty('--tinta', t.cor);
      b.addEventListener('click', () => {
        if (travado) return;
        tintas.forEach(x => x.setAttribute('aria-checked', 'false'));
        b.setAttribute('aria-checked', 'true');
        tinta = t;
        if (objetos.length === 1) pintar(objetos[0]);
        else Som.falar([falaCor(t.nome)]);
      });
      paleta.appendChild(b);
      return b;
    });

    function pintar(ob) {
      if (ob.certo) return;
      pintarSvg(ob.svg, tinta.cor);
      ob.cor = tinta.nome;
      Som.efeito('pintar');
      reiniciarAnimacao(ob.b, 'pulou');
      if (objetos.every(x => x.cor)) {
        travado = true;
        window.setTimeout(() => {
          objetos.forEach(x => {
            x.certo = x.cor === x.o.nome_cor;
            x.b.classList.toggle('certo', x.certo);
          });
          aoResponder(objetos.every(x => x.certo), quadro);
        }, 450);
      }
    }

    caixa.append(paleta, quadro);
    area.appendChild(caixa);
    return {
      tentarDeNovo() {
        window.setTimeout(() => {
          objetos.filter(x => !x.certo).forEach(x => { pintarSvg(x.svg, null); x.cor = null; });
          tinta = null;
          tintas.forEach(x => x.setAttribute('aria-checked', 'false'));
          travado = false;
        }, 900);
      },
      revelar() {
        travado = true;
        objetos.forEach(x => { pintarSvg(x.svg, x.o.cor); x.certo = true; x.b.classList.add('certo'); });
        return quadro;
      },
      travar() { travado = true; },
      destacar() {
        tintas.forEach((t, i) => window.setTimeout(() => { if (t.isConnected) reiniciarAnimacao(t, 'pulou'); }, i * 350));
      },
      chamarAtencao() { tintas.forEach(t => reiniciarAnimacao(t, 'chamar')); }
    };
  }

  function criarResposta(p, area, aoResponder) {
    area.textContent = '';
    switch (p.tipo) {
      case 'escolha': return respostaEscolha(p, area, aoResponder);
      case 'montar': return respostaPecas(p, area, aoResponder, 'montar');
      case 'ordenar': return respostaPecas(p, area, aoResponder, 'ordenar');
      case 'colocar': return respostaColocar(p, area, aoResponder);
      case 'rota': return respostaRota(p, area, aoResponder);
      case 'pintar': return respostaPintar(p, area, aoResponder);
      default: throw new Error('tipo desconhecido: ' + p.tipo);
    }
  }

  // ---------- efeitos visuais ----------
  const CORES = ['#4DE1FF', '#9BF06A', '#FFC94D', '#FF6FAE', '#B39DFF'];
  function confete(camada, quantidade) {
    if (reduzirMovimento()) return;
    for (let i = 0; i < quantidade; i++) {
      const c = el('span', 'confete');
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.background = CORES[i % CORES.length];
      c.style.setProperty('--dur', (1.5 + Math.random() * 1.1).toFixed(2) + 's');
      c.style.setProperty('--dx', Math.round(Math.random() * 140 - 70) + 'px');
      c.style.setProperty('--giro', Math.round(Math.random() * 540 - 270) + 'deg');
      c.style.animationDelay = (Math.random() * 0.4).toFixed(2) + 's';
      c.addEventListener('animationend', () => c.remove());
      camada.appendChild(c);
    }
  }

  // Uma figura (estrela ou cristal) sai da resposta e voa até o progresso.
  function voar(origem, destino, src, camada, aoChegar) {
    if (reduzirMovimento() || !origem || !destino || typeof Element.prototype.animate !== 'function') {
      if (aoChegar) aoChegar();
      return;
    }
    const a = origem.getBoundingClientRect();
    const b = destino.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const dx = b.left + b.width / 2 - x0, dy = b.top + b.height / 2 - y0;
    const f = img(src, 'voando');
    f.style.left = x0 + 'px';
    f.style.top = y0 + 'px';
    camada.appendChild(f);
    const an = f.animate([
      { transform: 'translate(0,0) scale(.4) rotate(0deg)', opacity: 0 },
      { transform: 'translate(0,-40px) scale(1.6) rotate(20deg)', opacity: 1, offset: 0.25 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.6 - 60}px) scale(1.1) rotate(160deg)`, opacity: 1, offset: 0.7 },
      { transform: `translate(${dx}px, ${dy}px) scale(.5) rotate(360deg)`, opacity: 0.9 }
    ], { duration: 1100, easing: 'ease-in-out', fill: 'forwards' });
    an.onfinish = () => { f.remove(); if (aoChegar) aoChegar(); };
  }

  return {
    ORDEM, INFO, criarOrbi, renderCena, criarResposta, img, confete, voar, menorCaminho, seta,
    carregarDesenhos, definirFalas, frase, falaNumero, falaLetra, falaCor
  };
})();
