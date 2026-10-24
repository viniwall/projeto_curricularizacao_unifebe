/*
 * audio.js — voz do Órbi, música e efeitos sonoros
 *
 * VOZ: o Órbi fala com gravações (MP3) feitas com uma voz neural em português do
 *   Brasil, mais lenta e com pausas, para a criança entender bem. As gravações
 *   ficam em assets/audio/ e estão listadas em data/falas.json e
 *   data/perguntas.json. Se um arquivo faltar, o jogo usa a voz do navegador.
 * MÚSICA: composta e tocada pelo próprio jogo com Web Audio (sem arquivos).
 *   Há um tema para o mapa e um para cada planeta. Durante as perguntas a música
 *   fica mais baixa, e abaixa ainda mais enquanto o Órbi fala.
 * EFEITOS: sons curtos sintetizados (toque, contagem, palmas, pintar, brilho...).
 *   Não há som de castigo.
 * Nada toca antes do primeiro clique: o áudio só é liberado em preparar().
 *
 * Uma fala é uma lista de pedaços { texto, arquivo }. O texto "|" marca pausa
 * quando a voz do navegador é usada.
 */
const Som = (() => {
  const VOLUME_VOZ = 1;
  const VOLUME_MUSICA = 0.34;            // volume geral da música (0 a 1)
  const NIVEL_MODO = { cheia: 1, suave: 0.55 };
  const ABAFAR_MUSICA = 0.28;            // quanto a música fica enquanto o Órbi fala

  let preparado = false;
  let efeitosLigados = true;
  let musicaLigada = true;
  let contextoWeb = null;
  let geracao = 0;                       // invalida falas antigas quando outra começa
  let audioAtual = null;
  let falasAtivas = [];
  let aoMudarFala = () => {};
  const arquivosComErro = new Set();
  const cachePrecarga = new Map();

  // ======================= VOZ DO NAVEGADOR (reserva) =======================
  const temFala = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  let vozNavegador = null;
  function escolherVoz() {
    if (!temFala) return;
    let vozes = [];
    try { vozes = window.speechSynthesis.getVoices(); } catch (e) { vozes = []; }
    const ptBR = vozes.filter(v => /^pt[-_]BR/i.test(v.lang));
    // Prefere vozes neurais/naturais, que soam mais suaves.
    vozNavegador = ptBR.find(v => /natural|neural|online/i.test(v.name))
      || ptBR.find(v => /google|antonio|francisca|thalita|daniel|luciana/i.test(v.name))
      || ptBR[0] || vozes.find(v => /^pt/i.test(v.lang)) || null;
  }
  if (temFala) {
    escolherVoz();
    window.speechSynthesis.onvoiceschanged = escolherVoz;
  }

  function falarSintetizado(texto, minha, seguir) {
    const partes = String(texto || '').split('|').map(t => t.trim()).filter(Boolean);
    if (!temFala || !partes.length) { window.setTimeout(seguir, 300); return; }
    let feito = false;
    const fim = () => { if (!feito && minha === geracao) { feito = true; seguir(); } };
    window.setTimeout(() => {
      if (minha !== geracao) return;
      partes.forEach((parte, i) => {
        const f = new window.SpeechSynthesisUtterance(parte);
        f.lang = 'pt-BR';
        if (vozNavegador) f.voice = vozNavegador;
        f.rate = 0.85;
        f.pitch = 1;
        if (i === partes.length - 1) { f.onend = fim; f.onerror = fim; }
        falasAtivas.push(f);
        try { window.speechSynthesis.speak(f); } catch (e) { fim(); }
      });
      window.setTimeout(fim, 1500 + partes.join(' ').length * 100 + partes.length * 400);
    }, 80);
  }

  // ======================= VOZ DO ÓRBI (gravações) =======================
  function normalizar(pedacos) {
    const lista = Array.isArray(pedacos) ? pedacos : [pedacos];
    return lista.filter(Boolean).map(p => (typeof p === 'string' ? { texto: p } : p));
  }

  function tocarArquivo(p, minha, seguir) {
    const a = new window.Audio(p.arquivo);
    a.volume = VOLUME_VOZ;
    audioAtual = a;
    let feito = false;
    let reserva = null;
    const ok = () => {
      if (feito) return;
      feito = true;
      window.clearTimeout(reserva);
      if (minha === geracao) seguir();
    };
    // definitivo = o arquivo não carrega (falta ou está corrompido). Uma reprodução
    // interrompida (a criança tocou antes do fim) não é defeito do arquivo.
    const falhou = definitivo => {
      if (feito) return;
      feito = true;
      window.clearTimeout(reserva);
      if (definitivo) arquivosComErro.add(p.arquivo);
      if (minha === geracao) falarSintetizado(p.texto, minha, seguir);
    };
    a.addEventListener('ended', ok);
    a.addEventListener('error', () => falhou(true));
    // Rede de segurança caso o navegador não avise o fim da gravação.
    a.addEventListener('loadedmetadata', () => {
      window.clearTimeout(reserva);
      if (Number.isFinite(a.duration)) reserva = window.setTimeout(ok, a.duration * 1000 + 2500);
    });
    reserva = window.setTimeout(ok, 20000);
    const promessa = a.play();
    if (promessa && promessa.catch) promessa.catch(() => { if (minha === geracao) falhou(false); });
  }

  function tocarLista(lista, i, minha, fim) {
    if (minha !== geracao) return;
    if (i >= lista.length) { fim(); return; }
    const p = lista[i];
    const seguir = () => {
      if (minha !== geracao) return;
      window.setTimeout(() => tocarLista(lista, i + 1, minha, fim), i < lista.length - 1 ? 220 : 0);
    };
    if (p.arquivo && !arquivosComErro.has(p.arquivo)) tocarArquivo(p, minha, seguir);
    else falarSintetizado(p.texto, minha, seguir);
  }

  function avisarFala(falando) {
    aoMudarFala(falando);
    abafarMusica(falando);
  }

  function parar() {
    geracao++;
    if (temFala) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* sem voz */ }
    }
    falasAtivas = [];
    if (audioAtual) {
      audioAtual.pause();
      audioAtual = null;
    }
    avisarFala(false);
  }

  // Fala uma lista de pedaços { texto, arquivo } e chama aoTerminar no fim.
  function falar(pedacos, aoTerminar) {
    parar();
    const minha = geracao;
    const lista = normalizar(pedacos);
    let feito = false;
    const fim = () => {
      if (feito || minha !== geracao) return;
      feito = true;
      avisarFala(false);
      if (aoTerminar) aoTerminar();
    };
    if (!lista.length) { window.setTimeout(fim, 200); return; }
    avisarFala(true);
    tocarLista(lista, 0, minha, fim);
  }

  // Deixa as próximas falas prontas para tocar sem espera.
  function precarregar(arquivos) {
    arquivos.filter(Boolean).forEach(arq => {
      if (cachePrecarga.has(arq) || arquivosComErro.has(arq)) return;
      const a = new window.Audio();
      a.preload = 'auto';
      a.src = arq;
      cachePrecarga.set(arq, a);
      if (cachePrecarga.size > 60) cachePrecarga.delete(cachePrecarga.keys().next().value);
    });
  }

  // ======================= CONTEXTO DE ÁUDIO =======================
  function contexto() {
    if (!preparado) return null;
    if (!contextoWeb) {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) return null;
      try { contextoWeb = new Contexto(); } catch (e) { return null; }
      montarSaidaMusica();
    }
    if (contextoWeb.state === 'suspended' && !document.hidden) contextoWeb.resume().catch(() => {});
    return contextoWeb;
  }

  // ======================= EFEITOS =======================
  function tom(freq, { inicio = 0, dur = 0.18, tipo = 'sine', vol = 0.18, freqFim = null } = {}) {
    const ctx = efeitosLigados ? contexto() : null;
    if (!ctx) return;
    try {
      const t = ctx.currentTime + inicio;
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      osc.type = tipo;
      osc.frequency.setValueAtTime(freq, t);
      if (freqFim) osc.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
      ganho.gain.setValueAtTime(0.0001, t);
      ganho.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(ganho).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (e) { /* ignora */ }
  }

  function ruido(dur, freq, vol, inicio = 0, freqFim = null) {
    const ctx = efeitosLigados ? contexto() : null;
    if (!ctx) return;
    try {
      const t = ctx.currentTime + inicio;
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const dados = buffer.getChannelData(0);
      for (let i = 0; i < dados.length; i++) dados[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / dados.length, 3);
      const fonte = ctx.createBufferSource();
      fonte.buffer = buffer;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'bandpass';
      filtro.frequency.setValueAtTime(freq, t);
      if (freqFim) filtro.frequency.exponentialRampToValueAtTime(freqFim, t + dur);
      filtro.Q.value = 0.9;
      const ganho = ctx.createGain();
      ganho.gain.value = vol;
      fonte.connect(filtro).connect(ganho).connect(ctx.destination);
      fonte.start(t);
    } catch (e) { /* ignora */ }
  }

  const NOTAS = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
  const efeitos = {
    toque() { tom(620, { dur: 0.09, tipo: 'triangle', vol: 0.12, freqFim: 900 }); },
    contar(n) { tom(NOTAS[(n - 1) % NOTAS.length], { dur: 0.25, tipo: 'triangle', vol: 0.2 }); },
    palma() { ruido(0.09, 1400, 0.9); ruido(0.07, 2400, 0.5, 0.012); },
    pintar() { ruido(0.22, 700, 0.5, 0, 2600); tom(330, { dur: 0.18, tipo: 'sine', vol: 0.12, freqFim: 660 }); },
    brilho() { [1567.98, 2093, 2637].forEach((f, i) => tom(f, { inicio: i * 0.07, dur: 0.22, vol: 0.09 })); },
    fanfarra() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tom(f, { inicio: i * 0.13, dur: 0.3, tipo: 'triangle', vol: 0.16 }));
      [523.25, 659.25, 783.99, 1046.5].forEach(f => tom(f, { inicio: 0.6, dur: 0.9, vol: 0.1 }));
    },
    virar() { tom(300, { dur: 0.22, vol: 0.06, freqFim: 700 }); },
    passo() { tom(880, { dur: 0.06, tipo: 'square', vol: 0.04 }); },
    batida() { tom(180, { dur: 0.25, tipo: 'triangle', vol: 0.14, freqFim: 90 }); },
    errou() { tom(392, { dur: 0.14, vol: 0.08 }); tom(330, { inicio: 0.12, dur: 0.2, vol: 0.08 }); }
  };

  let somAcerto = null;
  function tocarAcerto() {
    if (!efeitosLigados) return;
    if (!somAcerto) {
      somAcerto = new window.Audio('assets/audio/acerto.wav');
      somAcerto.volume = 0.6;
    }
    try {
      somAcerto.currentTime = 0;
      somAcerto.play().catch(efeitos.brilho);
    } catch (e) { efeitos.brilho(); }
  }

  // ======================= MÚSICA =======================
  // Cada tema tem 8 compassos (4 tempos) que se repetem: acorde, baixo e melodia.
  // Melodia: [tempo de início, duração em tempos, nota MIDI]. Notas do acorde caem
  // nos tempos fortes, para a música soar sempre consonante.
  const TEMAS = {
    menu: { bpm: 92, timbre: 'celesta', vel: 0.11, baixo: 'longo', percussao: null, reverb: 0.35, compassos: [
      [[60, 64, 67], 48, [[0, 1.5, 76], [1.5, 0.5, 74], [2, 1, 72], [3, 1, 67]]],
      [[57, 60, 64], 45, [[0, 1.5, 69], [1.5, 0.5, 72], [2, 2, 76]]],
      [[57, 60, 65], 41, [[0, 1, 69], [1, 1, 72], [2, 1.5, 77], [3.5, 0.5, 76]]],
      [[55, 59, 62], 43, [[0, 1.5, 74], [1.5, 0.5, 71], [2, 2, 67]]],
      [[60, 64, 67], 48, [[0, 1, 76], [1, 1, 79], [2, 1, 76], [3, 1, 72]]],
      [[57, 60, 64], 45, [[0, 1, 69], [1, 0.5, 72], [1.5, 0.5, 76], [2, 2, 81]]],
      [[57, 60, 65], 41, [[0, 1.5, 77], [1.5, 0.5, 76], [2, 1, 74], [3, 1, 72]]],
      [[55, 59, 62], 43, [[0, 1, 71], [1, 1, 74], [2, 2, 72]]]
    ] },
    sons: { bpm: 104, timbre: 'xilofone', vel: 0.12, baixo: 'saltitante', percussao: 'chocalho', reverb: 0.25, compassos: [
      [[57, 60, 65], 41, [[0, 0.5, 69], [0.5, 0.5, 72], [1, 1, 77], [2, 0.5, 72], [2.5, 0.5, 69], [3, 1, 72]]],
      [[58, 62, 65], 46, [[0, 0.5, 74], [0.5, 0.5, 77], [1, 1, 70], [2, 1, 74], [3, 1, 77]]],
      [[55, 58, 62], 43, [[0, 0.5, 67], [0.5, 0.5, 70], [1, 1, 74], [2, 0.5, 70], [2.5, 0.5, 67], [3, 1, 70]]],
      [[55, 60, 64], 48, [[0, 0.5, 72], [0.5, 0.5, 76], [1, 1, 79], [2, 1, 76], [3, 1, 72]]],
      [[57, 60, 65], 41, [[0, 0.5, 77], [0.5, 0.5, 76], [1, 1, 72], [2, 0.5, 69], [2.5, 0.5, 72], [3, 1, 77]]],
      [[58, 62, 65], 46, [[0, 1, 74], [1, 0.5, 70], [1.5, 0.5, 74], [2, 2, 77]]],
      [[55, 60, 64], 48, [[0, 0.5, 76], [0.5, 0.5, 74], [1, 0.5, 72], [1.5, 0.5, 76], [2, 1, 79], [3, 1, 76]]],
      [[57, 60, 65], 41, [[0, 2, 77], [2, 1, 72], [3, 1, 69]]]
    ] },
    lugares: { bpm: 80, timbre: 'sino', vel: 0.1, baixo: 'longo', percussao: null, reverb: 0.45, compassos: [
      [[62, 66, 69], 50, [[0, 2, 78], [2, 1, 76], [3, 1, 74]]],
      [[59, 62, 67], 43, [[0, 2, 71], [2, 2, 74]]],
      [[59, 62, 66], 47, [[0, 1.5, 78], [1.5, 0.5, 76], [2, 2, 74]]],
      [[57, 61, 64], 45, [[0, 2, 73], [2, 1, 76], [3, 1, 69]]],
      [[62, 66, 69], 50, [[0, 1, 74], [1, 1, 78], [2, 2, 81]]],
      [[59, 62, 67], 43, [[0, 1.5, 79], [1.5, 0.5, 78], [2, 2, 74]]],
      [[59, 64, 67], 52, [[0, 1, 76], [1, 1, 79], [2, 2, 71]]],
      [[57, 61, 64], 45, [[0, 1, 73], [1, 1, 76], [2, 2, 74]]]
    ] },
    numeros: { bpm: 108, timbre: 'marimba', vel: 0.13, baixo: 'saltitante', percussao: 'bumbo', reverb: 0.2, compassos: [
      [[55, 59, 62], 43, [[0, 1, 67], [1, 1, 71], [2, 1, 74], [3, 1, 79]]],
      [[54, 57, 62], 50, [[0, 1, 66], [1, 1, 69], [2, 1, 74], [3, 1, 78]]],
      [[52, 55, 59], 52, [[0, 1, 64], [1, 1, 67], [2, 1, 71], [3, 1, 76]]],
      [[52, 55, 60], 48, [[0, 0.5, 72], [0.5, 0.5, 74], [1, 1, 76], [2, 1, 79], [3, 1, 76]]],
      [[55, 59, 62], 43, [[0, 0.5, 71], [0.5, 0.5, 72], [1, 1, 74], [2, 1, 79], [3, 1, 74]]],
      [[54, 57, 62], 50, [[0, 1, 78], [1, 0.5, 76], [1.5, 0.5, 74], [2, 1, 69], [3, 1, 74]]],
      [[52, 55, 60], 48, [[0, 1, 76], [1, 0.5, 74], [1.5, 0.5, 72], [2, 1, 76], [3, 1, 79]]],
      [[54, 57, 62], 50, [[0, 1, 78], [1, 1, 81], [2, 2, 74]]]
    ] },
    cores: { bpm: 100, timbre: 'glock', vel: 0.1, baixo: 'longo', percussao: 'chocalho', reverb: 0.35, compassos: [
      [[57, 61, 64], 45, [[0, 0.5, 64], [0.5, 0.5, 69], [1, 1, 73], [2, 0.5, 69], [2.5, 0.5, 64], [3, 1, 61]]],
      [[56, 61, 64], 49, [[0, 0.5, 64], [0.5, 0.5, 68], [1, 1, 73], [2, 1, 68], [3, 1, 64]]],
      [[57, 62, 66], 50, [[0, 0.5, 66], [0.5, 0.5, 69], [1, 1, 74], [2, 0.5, 69], [2.5, 0.5, 66], [3, 1, 62]]],
      [[56, 59, 64], 52, [[0, 0.5, 68], [0.5, 0.5, 71], [1, 1, 76], [2, 1, 71], [3, 1, 68]]],
      [[57, 61, 64], 45, [[0, 1, 73], [1, 0.5, 71], [1.5, 0.5, 69], [2, 2, 64]]],
      [[57, 61, 66], 42, [[0, 1, 66], [1, 0.5, 69], [1.5, 0.5, 73], [2, 2, 69]]],
      [[57, 62, 66], 50, [[0, 1, 74], [1, 0.5, 73], [1.5, 0.5, 71], [2, 1, 69], [3, 1, 66]]],
      [[56, 59, 64], 52, [[0, 1, 68], [1, 1, 71], [2, 2, 64]]]
    ] }
  };

  // Timbres de "sino" feitos com parciais senoidais: [múltiplo da frequência, intensidade].
  const TIMBRES = {
    celesta: { parciais: [[1, 1], [2, 0.18], [3, 0.05]], decai: 1.6 },
    xilofone: { parciais: [[1, 1], [3.93, 0.22], [9.2, 0.04]], decai: 0.5 },
    marimba: { parciais: [[1, 1], [3.93, 0.12]], decai: 0.75 },
    sino: { parciais: [[1, 1], [2.76, 0.14], [5.4, 0.05]], decai: 2.6 },
    glock: { parciais: [[1, 1], [2, 0.12], [3, 0.05]], decai: 1.2 }
  };

  const freq = midi => 440 * Math.pow(2, (midi - 69) / 12);

  function gerarImpulso(ctx, duracao, decaimento) {
    const n = Math.floor(ctx.sampleRate * duracao);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decaimento);
    }
    return buf;
  }

  // Motor de música: funciona tanto ao vivo quanto em renderização offline (testes).
  function criarMotor(ctx, destino) {
    const bus = ctx.createGain();
    bus.gain.value = VOLUME_MUSICA;
    const abafador = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -20;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.25;
    const reverb = ctx.createConvolver();
    reverb.buffer = gerarImpulso(ctx, 2.2, 3);
    reverb.connect(bus);
    bus.connect(abafador).connect(compressor).connect(destino);
    const ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const r = ruidoBuf.getChannelData(0);
    for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;

    function sino(inst, timbre, midi, t, vel) {
      const f = freq(midi);
      timbre.parciais.forEach(([mult, amp], k) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * mult;
        const g = ctx.createGain();
        const decai = timbre.decai / (1 + k * 1.5);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vel * amp, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decai);
        o.connect(g).connect(inst.ganho);
        o.start(t);
        o.stop(t + decai + 0.05);
      });
    }

    function pad(inst, midi, t, dur) {
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.frequency.value = 1100;
      filtro.Q.value = 0.4;
      const g = ctx.createGain();
      const v = 0.035;
      // O acorde seguinte entra antes deste sair: a troca de acorde fica contínua.
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.12);
      g.gain.setValueAtTime(v, t + dur);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
      filtro.connect(g).connect(inst.ganho);
      [-6, 6].forEach(det => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = freq(midi);
        o.detune.value = det;
        o.connect(filtro);
        o.start(t);
        o.stop(t + dur + 0.6);
      });
    }

    function baixo(inst, midi, t, dur) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.3);
      g.gain.setValueAtTime(0.09, t + Math.max(0.35, dur - 0.06));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
      g.connect(inst.ganho);
      [['sine', 1, 1], ['triangle', 2, 0.18]].forEach(([tipo, mult, amp]) => {
        const o = ctx.createOscillator();
        o.type = tipo;
        o.frequency.value = freq(midi) * mult;
        const ga = ctx.createGain();
        ga.gain.value = amp;
        o.connect(ga).connect(g);
        o.start(t);
        o.stop(t + dur + 0.15);
      });
    }

    function chocalho(inst, t, vol) {
      const fonte = ctx.createBufferSource();
      fonte.buffer = ruidoBuf;
      const filtro = ctx.createBiquadFilter();
      filtro.type = 'highpass';
      filtro.frequency.value = 6500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      fonte.connect(filtro).connect(g).connect(inst.ganho);
      fonte.start(t, Math.random() * 0.5, 0.08);
    }

    function bumbo(inst, t) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.14);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      o.connect(g).connect(inst.ganho);
      o.start(t);
      o.stop(t + 0.3);
    }

    function novaInstancia(nome, modo, inicio) {
      const tema = TEMAS[nome];
      const ganho = ctx.createGain();
      ganho.gain.setValueAtTime(0.0001, inicio);
      ganho.gain.exponentialRampToValueAtTime(NIVEL_MODO[modo], inicio + 1.5);
      ganho.connect(bus);
      const envio = ctx.createGain();
      envio.gain.value = tema.reverb;
      ganho.connect(envio).connect(reverb);
      return { nome, modo, tema, ganho, proximo: inicio, indice: 0 };
    }

    function agendarCompasso(inst) {
      const tema = inst.tema;
      const t = inst.proximo;
      const batida = 60 / tema.bpm;
      const dur = batida * 4;
      const [acorde, raiz, melodia] = tema.compassos[inst.indice % tema.compassos.length];
      const ciclo = Math.floor(inst.indice / tema.compassos.length);
      const cheia = inst.modo === 'cheia';
      acorde.forEach(m => pad(inst, m, t, dur));
      if (tema.baixo === 'saltitante') { baixo(inst, raiz, t, batida * 1.6); baixo(inst, raiz, t + 2 * batida, batida * 1.6); }
      else baixo(inst, raiz, t, dur);
      const timbre = TIMBRES[tema.timbre];
      if (cheia && ciclo % 3 !== 2) {
        melodia.forEach(([b, , m]) => sino(inst, timbre, m, t + b * batida, tema.vel));
      } else {
        // "Respiro": só um arpejo calmo das notas do acorde, uma oitava acima.
        const vel = tema.vel * (cheia ? 0.6 : 0.4);
        (cheia ? [0, 1, 2, 1] : [0]).forEach((k, b) => sino(inst, timbre, acorde[k] + 12, t + b * batida, vel));
      }
      if (cheia && tema.percussao === 'chocalho') {
        for (let k = 0; k < 8; k++) chocalho(inst, t + k * batida / 2, k % 2 ? 0.05 : 0.025);
      }
      if (cheia && tema.percussao === 'bumbo') { bumbo(inst, t); bumbo(inst, t + 2 * batida); }
      inst.proximo += dur;
      inst.indice++;
    }

    return { ctx, bus, abafador, novaInstancia, agendarCompasso };
  }

  let motor = null;
  let instancia = null;
  let desejada = null;          // { nome, modo } pedida pelo jogo
  let agendador = null;

  function montarSaidaMusica() {
    motor = criarMotor(contextoWeb, contextoWeb.destination);
    agendador = window.setInterval(agendarMusica, 120);
    document.addEventListener('visibilitychange', () => {
      if (!contextoWeb) return;
      if (document.hidden) contextoWeb.suspend().catch(() => {});
      else contextoWeb.resume().catch(() => {});
    });
    if (desejada) musica(desejada.nome, desejada.modo);
  }

  function agendarMusica() {
    if (!instancia || !contextoWeb || contextoWeb.state !== 'running') return;
    const agora = contextoWeb.currentTime;
    if (instancia.proximo < agora) instancia.proximo = agora + 0.05;   // voltou de uma pausa
    let limite = 4;
    while (instancia.proximo < agora + 0.6 && limite--) motor.agendarCompasso(instancia);
  }

  function encerrarInstancia(inst) {
    if (!inst) return;
    const t = contextoWeb.currentTime;
    inst.ganho.gain.cancelScheduledValues(t);
    inst.ganho.gain.setValueAtTime(Math.max(0.0001, inst.ganho.gain.value), t);
    inst.ganho.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    window.setTimeout(() => { try { inst.ganho.disconnect(); } catch (e) { /* já desligado */ } }, 4000);
  }

  // Toca o tema pedido. modo: 'cheia' (menus) ou 'suave' (durante as perguntas).
  function musica(nome, modo = 'cheia') {
    desejada = nome ? { nome, modo } : null;
    if (!contextoWeb || !motor) return;
    if (!musicaLigada || !nome) { encerrarInstancia(instancia); instancia = null; return; }
    if (instancia && instancia.nome === nome) {
      if (instancia.modo !== modo) {
        instancia.modo = modo;
        const t = contextoWeb.currentTime;
        instancia.ganho.gain.cancelScheduledValues(t);
        instancia.ganho.gain.setValueAtTime(Math.max(0.0001, instancia.ganho.gain.value), t);
        instancia.ganho.gain.exponentialRampToValueAtTime(NIVEL_MODO[modo], t + 0.8);
      }
      return;
    }
    encerrarInstancia(instancia);
    instancia = motor.novaInstancia(nome, modo, contextoWeb.currentTime + 0.15);
    agendarMusica();
  }

  function abafarMusica(falando) {
    if (!motor || !contextoWeb) return;
    const t = contextoWeb.currentTime;
    const g = motor.abafador.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    if (falando) g.setTargetAtTime(ABAFAR_MUSICA, t, 0.06);
    else g.setTargetAtTime(1, t + 0.25, 0.4);
  }

  // Renderiza um tema sem tocar (usado nos testes automáticos para medir volume).
  function renderizarMusica(nome, modo, segundos) {
    const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new Offline(2, Math.floor(44100 * segundos), 44100);
    const m = criarMotor(ctx, ctx.destination);
    const inst = m.novaInstancia(nome, modo, 0.05);
    while (inst.proximo < segundos) m.agendarCompasso(inst);
    return ctx.startRendering();
  }

  // ======================= API =======================
  function preparar() {
    preparado = true;
    contexto();
  }

  return {
    preparar,
    falar,
    parar,
    precarregar,
    tocarAcerto,
    efeito: (nome, ...args) => { if (efeitos[nome]) efeitos[nome](...args); },
    musica,
    renderizarMusica,
    aoMudarFala(fn) { aoMudarFala = typeof fn === 'function' ? fn : () => {}; },
    ligarEfeitos(v) { efeitosLigados = !!v; },
    ligarMusica(v) {
      musicaLigada = !!v;
      const d = desejada;
      musica(d ? d.nome : null, d ? d.modo : 'cheia');
      desejada = d;
    },
    musicaLigada: () => musicaLigada,
    temas: () => Object.keys(TEMAS)
  };
})();
