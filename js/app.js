/*
 * app.js — fluxo geral da Expedição Órbita Júnior
 * Início → nome → nave → nível → mapa (4 planetas, a criança escolhe a ordem)
 * → 5 perguntas por planeta → planeta explorado → tela final.
 *
 * Retorno de cada pergunta (sempre com a voz do Órbi):
 *   acerto  → "Muito bem!", o porquê, estrela voando e avanço automático
 *   1º erro → "Quase! Tente de novo." e uma dica
 *   2º erro → a resposta certa aparece com a explicação e o jogo segue
 *             (a criança ganha um cristal: aprendeu com ajuda)
 * Sem timer e sem vidas. O lembrete gentil só aparece se a criança ficar parada.
 */
(() => {
  const POR_PLANETA = 5;
  const ESPERA_LEMBRETE = 15000;  // ms parado até o Órbi chamar a criança (no máximo 2 vezes)
  const MAX_LEMBRETES = 2;
  const MATIZES = [0, 50, 110, 170, 230, 290];
  const ACERTOS = ['acerto_1', 'acerto_2', 'acerto_3', 'acerto_4'];
  const LEMBRETES = ['lembrete_1', 'lembrete_2'];
  const TECLAS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'Ç', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Â', 'Ê', 'Ô', 'Ã', 'Õ'];
  const NOTA_MUSICAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.6A4 4 0 1 0 14 17V7h4V3z" fill="currentColor"/></svg>';

  const $ = id => document.getElementById(id);
  const F = chave => Atividades.frase(chave);
  const telas = ['tela-inicio', 'tela-nome', 'tela-nave', 'tela-nivel', 'tela-mapa', 'tela-jogo', 'tela-planeta', 'tela-fim'];

  const estado = {
    perguntas: [],
    nome: '',
    matiz: 0,
    nivel: null,
    planetas: {},      // atividade → { fila, indice, premios[], concluido }
    atual: null,
    componente: null,
    tentativas: 0,
    respondida: false,
    emAndamento: false,
    lembretes: 0,
    timers: []
  };

  const sortear = l => l[Math.floor(Math.random() * l.length)];
  const leituraAutomatica = () => $('opt-voz').checked;
  const primeiroNome = () => estado.nome.split(' ')[0] || '';

  function agendar(fn, ms) {
    const t = window.setTimeout(fn, ms);
    estado.timers.push(t);
    return t;
  }
  function limparTimers() {
    estado.timers.forEach(t => window.clearTimeout(t));
    estado.timers = [];
  }

  function mostrarTela(id) {
    limparTimers();
    telas.forEach(t => { $(t).hidden = t !== id; });
    window.scrollTo(0, 0);
    const foco = $(id).querySelector('[tabindex="-1"], [data-foco]');
    if (foco) foco.focus({ preventScroll: true });
  }

  // ---------- planeta atual: cor, decoração de fundo e música ----------
  function decorar(chave) {
    const caixa = $('decor-planeta');
    caixa.textContent = '';
    if (!chave) return;
    const coresPintura = ['#FF5C7A', '#FFB547', '#FFE45C', '#6BE38A', '#5CC8FF', '#A78BFA'];
    for (let i = 0; i < 12; i++) {
      const s = document.createElement('span');
      s.className = 'enfeite';
      s.style.left = ((i * 37 + 11) % 96) + '%';
      s.style.top = ((i * 53 + 7) % 90) + '%';
      s.style.setProperty('--tam', (28 + (i % 4) * 10) + 'px');
      s.style.setProperty('--dur', (12 + (i % 5) * 3) + 's');
      s.style.animationDelay = (-i * 1.7) + 's';
      if (chave === 'sons') {
        if (i % 3) s.innerHTML = NOTA_MUSICAL;
        else s.textContent = 'ABC'[(i / 3) % 3];
      } else if (chave === 'numeros') s.textContent = String((i % 9) + 1);
      else if (chave === 'lugares') s.appendChild(Atividades.seta(['cima', 'direita', 'baixo', 'esquerda'][i % 4]));
      else s.style.background = coresPintura[i % coresPintura.length];
      if (chave === 'cores') s.classList.add('pingo');
      caixa.appendChild(s);
    }
  }

  function mudarPlaneta(atividade, modoMusica) {
    const info = atividade ? Atividades.INFO[atividade] : null;
    const chave = info ? info.chave : '';
    if (document.body.dataset.planeta !== chave) decorar(chave);
    document.body.dataset.planeta = chave;
    Som.musica(info ? info.tema : 'menu', modoMusica || 'cheia');
  }

  // ---------- Órbi ----------
  function orbiReage(e, reacao, duracao) {
    if (!e) return;
    e.classList.remove('feliz', 'pensando', 'acenando', 'dancando');
    void e.offsetWidth;
    if (reacao) e.classList.add(reacao);
    if (reacao && duracao) window.setTimeout(() => e.classList.remove(reacao), duracao);
  }

  function balao(texto, tipo) {
    const fala = $('fala-jogo');
    fala.classList.remove('acerto', 'tente');
    if (tipo) fala.classList.add(tipo);
    $('enunciado').textContent = texto;
    const b = fala.querySelector('.balao');
    b.classList.remove('mudou');
    void b.offsetWidth;
    b.classList.add('mudou');
    $('feedback').textContent = tipo ? texto : '';
  }

  // ---------- céu ----------
  function gerarEstrelas() {
    const largura = Math.min(2560, Math.max(window.innerWidth, 1280));
    const altura = Math.max(window.innerHeight, 800) * 2;
    const cores = ['#FFFFFF', '#CFE8FF', '#E9DDFF', '#FFF3D1'];
    [['e1', 220], ['e2', 90], ['e3', 35]].forEach(([classe, n]) => {
      const s = [];
      for (let i = 0; i < n; i++) s.push(`${Math.round(Math.random() * largura)}px ${Math.round(Math.random() * altura)}px ${cores[i % cores.length]}`);
      document.querySelector('.' + classe).style.boxShadow = s.join(',');
    });
  }

  // ---------- carregamento ----------
  function validar(d) {
    if (!d || !Array.isArray(d.perguntas)) return false;
    return ['Fácil', 'Médio', 'Difícil'].every(n => Atividades.ORDEM.every(a =>
      d.perguntas.filter(p => p.nivel === n && p.atividade === a).length === POR_PLANETA));
  }

  function lerJson(caminho) {
    return fetch(caminho, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function carregar() {
    const aviso = $('aviso-carregamento');
    Promise.all([lerJson('data/perguntas.json'), lerJson('data/falas.json'), Atividades.carregarDesenhos()])
      .then(([perguntas, falas]) => {
        if (!validar(perguntas)) throw new Error('banco incompleto');
        estado.perguntas = perguntas.perguntas;
        Atividades.definirFalas(falas);
        aviso.textContent = '';
        $('btn-jogar').disabled = false;
      })
      .catch(() => {
        aviso.classList.add('erro');
        aviso.textContent = 'Não foi possível carregar o jogo. Adulto: abra o jogo pelo link do GitHub Pages ou por um servidor local (veja o README).';
      });
  }

  // ---------- área do adulto ----------
  function atualizarAdulto() {
    document.querySelectorAll('.so-com-registro').forEach(e => { e.hidden = !Registro.ativo; });
    if (Registro.ativo) $('registro-status').textContent = `Tentativas registradas: ${Registro.total()}`;
  }
  let confirmarLimpeza = false;
  function limparRegistro() {
    const b = $('btn-limpar');
    if (!confirmarLimpeza) {
      confirmarLimpeza = true;
      b.textContent = 'Toque de novo para apagar';
      window.setTimeout(() => { confirmarLimpeza = false; b.textContent = 'Apagar registro'; }, 4000);
      return;
    }
    confirmarLimpeza = false;
    Registro.limpar();
    b.textContent = 'Registro apagado';
    atualizarAdulto();
  }

  // ---------- nome, nave e nível ----------
  function limparNome(t) {
    return String(t || '').normalize('NFC').replace(/[^\p{L} .'-]/gu, '').replace(/\s+/g, ' ')
      .trim().slice(0, 60).toLocaleUpperCase('pt-BR');
  }

  function montarTeclado() {
    const caixa = $('teclado');
    const campo = $('campo-nome');
    const tecla = (rotulo, classe, acao, aria) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tecla' + (classe ? ' ' + classe : '');
      b.textContent = rotulo;
      b.setAttribute('aria-label', aria || 'Letra ' + rotulo);
      b.addEventListener('click', acao);
      caixa.appendChild(b);
      return b;
    };
    TECLAS.forEach((letra, i) => {
      const b = tecla(letra, i > 26 ? 'acento' : '', () => {
        if (campo.value.length >= 60) return;
        campo.value += letra;
        Som.falar([Atividades.falaLetra(letra)]);
      });
      b.style.setProperty('--i', String(i));
    });
    tecla('espaço', 'tecla-larga', () => {
      if (campo.value && !campo.value.endsWith(' ')) campo.value += ' ';
      Som.efeito('toque');
    }, 'Espaço');
    tecla('apagar', 'tecla-larga', () => {
      campo.value = campo.value.slice(0, -1);
      Som.efeito('toque');
    }, 'Apagar a última letra');
  }

  function montarCoresNave() {
    const grupo = $('cores-nave');
    MATIZES.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cor-nave';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
      b.setAttribute('aria-label', `Nave ${i + 1}`);
      const nave = Atividades.img('assets/img/nave.svg');
      nave.style.filter = `hue-rotate(${m}deg)`;
      b.appendChild(nave);
      b.addEventListener('click', () => {
        grupo.querySelectorAll('.cor-nave').forEach(x => x.setAttribute('aria-checked', 'false'));
        b.setAttribute('aria-checked', 'true');
        estado.matiz = m;
        Som.falar([F('nave_bonita'), F('toque_continuar')]);
      });
      grupo.appendChild(b);
    });
  }

  function irNome() {
    Som.preparar();
    mudarPlaneta(null);
    mostrarTela('tela-nome');
    Som.falar([F('ola'), F('qual_nome'), F('peca_adulto')]);
  }

  function confirmarNome(ev) {
    ev.preventDefault();
    estado.nome = limparNome($('campo-nome').value);
    $('campo-nome').value = estado.nome;
    mostrarTela('tela-nave');
    Som.falar(estado.nome ? [F('prazer'), F('escolha_nave')] : [F('escolha_nave')]);
  }

  function irNivel() {
    estado.emAndamento = false;
    mudarPlaneta(null);
    mostrarTela('tela-nivel');
    Som.falar([F('escolha_nivel')]);
  }

  function iniciarNivel(nivel) {
    estado.nivel = nivel;
    estado.planetas = {};
    Atividades.ORDEM.forEach(a => {
      estado.planetas[a] = {
        fila: estado.perguntas.filter(p => p.nivel === nivel && p.atividade === a).sort((x, y) => x.ordem - y.ordem),
        indice: 0, premios: [], concluido: false
      };
    });
    estado.emAndamento = true;
    mostrarMapa(true);
  }

  // ---------- mapa ----------
  function miniPremios(pl) {
    const caixa = document.createElement('span');
    caixa.className = 'mini-premios';
    for (let k = 0; k < POR_PLANETA; k++) {
      const p = pl.premios[k];
      caixa.appendChild(p ? Atividades.img(`assets/img/${p}.svg`) : document.createElement('span'));
    }
    return caixa;
  }

  function mostrarMapa(falar) {
    mudarPlaneta(null);
    $('mapa-piloto').textContent = primeiroNome() || 'Piloto';
    $('mapa-nave').style.filter = `hue-rotate(${estado.matiz}deg)`;
    const mapa = $('mapa');
    mapa.textContent = '';
    const sugerido = Atividades.ORDEM.find(a => !estado.planetas[a].concluido);
    Atividades.ORDEM.forEach((a, i) => {
      const info = Atividades.INFO[a];
      const pl = estado.planetas[a];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'planeta-btn' + (pl.concluido ? ' concluido' : '') + (a === sugerido ? ' sugerido' : '');
      b.style.setProperty('--brilho', info.brilho);
      b.style.setProperty('--i', String(i));
      b.setAttribute('aria-label', info.planeta + (pl.concluido ? ', explorado' : ''));
      const nome = document.createElement('span');
      nome.className = 'planeta-nome';
      nome.textContent = info.curto;
      b.append(Atividades.img(info.imagem, 'planeta-img'), nome, miniPremios(pl));
      b.addEventListener('click', () => abrirPlaneta(a));
      mapa.appendChild(b);
    });
    mostrarTela('tela-mapa');
    if (falar) Som.falar([F('mapa'), F('escolha_planeta')]);
  }

  // ---------- perguntas ----------
  function abrirPlaneta(a) {
    const pl = estado.planetas[a];
    if (pl.concluido) {           // planeta já explorado: joga de novo
      pl.indice = 0;
      pl.premios = [];
      pl.concluido = false;
    }
    estado.atual = a;
    Som.efeito('virar');
    mostrarPergunta(true);
  }

  function montarProgresso(pl) {
    const lista = $('progresso');
    lista.textContent = '';
    for (let k = 0; k < POR_PLANETA; k++) {
      const li = document.createElement('li');
      const p = pl.premios[k];
      if (p) { li.className = 'ganho'; li.appendChild(Atividades.img(`assets/img/${p}.svg`)); }
      else if (k === pl.indice) li.className = 'atual';
      lista.appendChild(li);
    }
    lista.setAttribute('aria-label', `Pergunta ${pl.indice + 1} de ${POR_PLANETA}`);
  }

  // Gravações desta pergunta e da próxima, para tocar sem espera.
  function precarregar(pl) {
    const p = pl.fila[pl.indice];
    const prox = pl.fila[pl.indice + 1];
    Som.precarregar([p.audio.arquivo, p.audio.dica, p.audio.explicacao,
      ...(p.silabas_audio || []), ...(p.pecas_audio || []), prox && prox.audio.arquivo]);
  }

  function mostrarPergunta(chegando) {
    const pl = estado.planetas[estado.atual];
    const p = pl.fila[pl.indice];
    estado.tentativas = 0;
    estado.respondida = false;
    estado.lembretes = 0;

    mudarPlaneta(estado.atual, 'suave');
    mostrarTela('tela-jogo');
    balao(p.enunciado, '');
    montarProgresso(pl);
    Atividades.renderCena(p, $('cena'));
    estado.componente = Atividades.criarResposta(p, $('resposta'), responder);
    $('corpo').classList.toggle('com-cena', !$('cena').hidden && p.tipo === 'escolha');
    precarregar(pl);

    const intro = chegando && pl.indice === 0 ? [F(Atividades.INFO[estado.atual].intro)] : [];
    if (leituraAutomatica() || intro.length) narrar(intro, true);
    else agendarLembrete();
  }

  // Narra a pergunta; ao terminar, guia o olhar e agenda o lembrete.
  function narrar(antes, primeiraVez) {
    const pl = estado.planetas[estado.atual];
    const p = pl.fila[pl.indice];
    const fim = () => {
      if (estado.respondida || pl.fila[pl.indice] !== p || $('tela-jogo').hidden) return;
      if (primeiraVez) estado.componente.destacar();
      agendarLembrete();
    };
    Som.falar([...antes, { texto: p.audio.fala, arquivo: p.audio.arquivo }], fim);
  }

  function agendarLembrete() {
    window.clearTimeout(estado.timerLembrete);
    if (estado.respondida || estado.lembretes >= MAX_LEMBRETES) return;
    const pl = estado.planetas[estado.atual];
    const p = pl.fila[pl.indice];
    estado.timerLembrete = agendar(() => {
      if (estado.respondida || pl.fila[pl.indice] !== p || $('tela-jogo').hidden) return;
      estado.lembretes++;
      orbiReage($('orbi-jogo'), 'acenando', 2400);
      estado.componente.chamarAtencao();
      Som.falar([F(LEMBRETES[(estado.lembretes - 1) % LEMBRETES.length])], agendarLembrete);
    }, ESPERA_LEMBRETE);
  }

  function registrar(p, resultado) {
    Registro.registrar({ nome: estado.nome, nivel: p.nivel, atividade: p.atividade, id: p.id, area: p.area, resultado });
  }

  function pedraAtual() {
    const pl = estado.planetas[estado.atual];
    return $('progresso').children[pl.indice];
  }

  function ganharPremio(tipo, origem) {
    const pl = estado.planetas[estado.atual];
    const indice = pl.indice;
    pl.premios[indice] = tipo;
    Atividades.voar(origem, pedraAtual(), `assets/img/${tipo}.svg`, $('efeitos'), () => {
      if (pl.indice === indice && !$('tela-jogo').hidden) montarProgresso(pl);
      Som.efeito('brilho');
    });
  }

  // Avança depois que a fala termina (com tempo mínimo para ver a animação).
  function avancarDepoisDe(pedacos, minimo) {
    const inicio = Date.now();
    let feito = false;
    const seguir = () => {
      if (feito) return;
      feito = true;
      agendar(proxima, Math.max(500, minimo - (Date.now() - inicio)));
    };
    Som.falar(pedacos, seguir);
    agendar(seguir, 15000);   // rede de segurança se o áudio não avisar o fim
  }

  function responder(certo, origem) {
    if (estado.respondida) return;
    const pl = estado.planetas[estado.atual];
    const p = pl.fila[pl.indice];
    const explicacao = { texto: p.explicacao, arquivo: p.audio.explicacao };
    window.clearTimeout(estado.timerLembrete);
    estado.tentativas++;
    registrar(p, certo ? 'acerto' : 'erro');

    if (certo) {
      estado.respondida = true;
      estado.componente.travar();
      const msg = F(sortear(ACERTOS));
      balao(msg.texto, 'acerto');
      orbiReage($('orbi-jogo'), 'feliz', 1300);
      Som.parar();
      Som.tocarAcerto();
      Atividades.confete($('efeitos'), 30);
      ganharPremio('estrela', origem);
      avancarDepoisDe([msg, explicacao], 2600);
      return;
    }

    orbiReage($('orbi-jogo'), 'pensando', 1500);
    if (estado.tentativas === 1) {
      balao(F('quase').texto, 'tente');
      estado.componente.tentarDeNovo();
      Som.falar([F('quase'), { texto: p.dica, arquivo: p.audio.dica }], agendarLembrete);
      return;
    }

    // Segunda tentativa errada: mostra a resposta com calma e segue.
    estado.respondida = true;
    const certa = estado.componente.revelar();
    balao('Olha, é assim!', 'tente');
    ganharPremio('cristal', certa);
    avancarDepoisDe([F('olha_so'), explicacao, F('proxima')], 3800);
  }

  function proxima() {
    limparTimers();
    if (!estado.emAndamento) return;
    const pl = estado.planetas[estado.atual];
    pl.indice++;
    estado.respondida = false;
    if (pl.indice >= POR_PLANETA) concluirPlaneta();
    else { Som.efeito('virar'); mostrarPergunta(false); }
  }

  function voltarAoMapa() {
    Som.parar();
    if (estado.respondida) {
      const pl = estado.planetas[estado.atual];
      pl.indice++;
      estado.respondida = false;
      if (pl.indice >= POR_PLANETA) { concluirPlaneta(); return; }
    }
    mostrarMapa(false);
  }

  // ---------- planeta explorado ----------
  function concluirPlaneta() {
    const pl = estado.planetas[estado.atual];
    pl.concluido = true;
    const info = Atividades.INFO[estado.atual];
    mudarPlaneta(estado.atual, 'cheia');
    $('planeta-img').src = info.imagem;
    $('titulo-planeta').textContent = `${info.planeta} explorado!`;
    const caixa = $('planeta-premios');
    caixa.textContent = '';
    pl.premios.forEach((p, k) => {
      const i = Atividades.img(`assets/img/${p}.svg`);
      i.style.animationDelay = (0.3 + k * 0.2).toFixed(2) + 's';
      caixa.appendChild(i);
    });
    const estrelas = pl.premios.filter(p => p === 'estrela').length;
    caixa.setAttribute('aria-label', `${estrelas} estrelas e ${POR_PLANETA - estrelas} cristais`);
    mostrarTela('tela-planeta');
    Som.efeito('fanfarra');
    Atividades.confete($('efeitos'), 50);
    Som.falar([F('parabens'), F(info.explorou), F('premios')]);
  }

  // ---------- fim ----------
  function terminar(completo) {
    Som.parar();
    mudarPlaneta(null);
    if (completo) estado.emAndamento = false;
    const nome = primeiroNome() ? `, ${primeiroNome()}` : '';
    $('titulo-fim').textContent = completo ? `Parabéns${nome}!` : `Que bom brincar com você${nome}!`;
    $('mensagem-fim').textContent = completo
      ? 'Você explorou os quatro planetas! Olha todos os prêmios que você ganhou.'
      : 'Você pode continuar a expedição de onde parou.';
    const rel = $('relatorio');
    rel.textContent = '';
    Atividades.ORDEM.forEach(a => {
      const info = Atividades.INFO[a];
      const item = document.createElement('div');
      item.className = 'relatorio-item';
      item.append(Atividades.img(info.imagem, 'planeta-img'), miniPremios(estado.planetas[a]));
      rel.appendChild(item);
    });
    $('btn-continuar').hidden = completo;
    orbiReage($('orbi-fim'), completo ? 'dancando' : 'acenando');
    atualizarAdulto();
    mostrarTela('tela-fim');
    if (completo) {
      Som.efeito('fanfarra');
      Atividades.confete($('efeitos'), 70);
    }
    Som.falar(completo ? [F('parabens'), F('explorou_todos'), F('jogar_de_novo')] : [F('que_bom'), F('quer_continuar')]);
  }

  // ---------- eventos ----------
  function ligarEventos() {
    $('btn-jogar').addEventListener('click', irNome);
    $('form-nome').addEventListener('submit', confirmarNome);
    $('btn-nave-ok').addEventListener('click', irNivel);
    document.querySelectorAll('.cartao-nivel').forEach(b => b.addEventListener('click', () => iniciarNivel(b.dataset.nivel)));
    $('btn-encerrar').addEventListener('click', () => terminar(false));
    $('fala-mapa').addEventListener('click', () => Som.falar([F('escolha_planeta')]));
    $('btn-mapa').addEventListener('click', voltarAoMapa);
    const ouvir = () => {
      if (estado.respondida) return;
      const pl = estado.planetas[estado.atual];
      balao(pl.fila[pl.indice].enunciado, '');
      narrar([], false);
    };
    $('btn-ouvir').addEventListener('click', ouvir);
    $('fala-jogo').addEventListener('click', ouvir);
    $('btn-planeta-ok').addEventListener('click', () => {
      if (Atividades.ORDEM.every(a => estado.planetas[a].concluido)) terminar(true);
      else mostrarMapa(true);
    });
    $('btn-continuar').addEventListener('click', () => mostrarMapa(true));
    $('btn-de-novo').addEventListener('click', () => iniciarNivel(estado.nivel));
    $('btn-trocar-nivel').addEventListener('click', irNivel);
    document.querySelectorAll('.btn-exportar').forEach(b => b.addEventListener('click', () => Registro.exportar()));
    $('btn-limpar').addEventListener('click', limparRegistro);
    $('opt-som').addEventListener('change', ev => Som.ligarEfeitos(ev.target.checked));
    $('opt-musica').addEventListener('change', ev => Som.ligarMusica(ev.target.checked));
    // Som de toque nos botões de navegação.
    document.addEventListener('click', ev => {
      if (ev.target.closest('.btn, .btn-icone, .cartao-nivel, .planeta-btn, .cor-nave')) Som.efeito('toque');
    });
    // Qualquer toque durante a pergunta adia o lembrete: a criança está ativa.
    $('tela-jogo').addEventListener('pointerdown', () => { if (!estado.respondida) agendarLembrete(); });
  }

  gerarEstrelas();
  document.querySelectorAll('[data-orbi]').forEach(Atividades.criarOrbi);
  montarTeclado();
  montarCoresNave();
  ligarEventos();
  atualizarAdulto();
  carregar();
})();
