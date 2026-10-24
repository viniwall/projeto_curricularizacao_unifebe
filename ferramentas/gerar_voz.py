"""Gera as falas gravadas do Órbi (MP3) a partir de data/perguntas.json e data/falas.json.

Voz: Piper (modelo pt_BR-faber-medium), mais lenta que o padrão, com pausas entre as partes.
Tratamento: graves levemente aquecidos, agudos e chiados atenuados, compressão suave e
volume igualado entre todas as falas.

Preparação (uma vez):
  python3 -m venv .venv && .venv/bin/pip install piper-tts numpy
  baixe pt_BR-faber-medium.onnx e pt_BR-faber-medium.onnx.json de
  https://huggingface.co/rhasspy/piper-voices/tree/main/pt/pt_BR/faber/medium
  para ferramentas/modelos/ (os modelos não ficam no repositório: 63 MB)
  é preciso ter o ffmpeg instalado.

Uso (na pasta do projeto):
  .venv/bin/python ferramentas/gerar_voz.py .                 # regrava tudo
  .venv/bin/python ferramentas/gerar_voz.py . --so-faltando   # só os arquivos que não existem
Depois de mudar um texto, apague o MP3 correspondente e rode com --so-faltando.
"""
import io, json, re, subprocess, sys, wave
from pathlib import Path
import numpy as np
from piper import PiperVoice, SynthesisConfig

PROJETO = Path(sys.argv[1])
SO_FALTANDO = '--so-faltando' in sys.argv
BASE = Path(__file__).parent
LOGS = Path('/tmp') if '--logs-tmp' in sys.argv else BASE
MODELO = BASE / 'modelos' / 'pt_BR-faber-medium.onnx'
VELOCIDADE = 1.4          # length_scale: >1 deixa a fala mais lenta
PAUSA_PARTES = 0.45       # segundos entre as partes separadas por "|"
ALVO_RMS_DB = -20.0       # volume médio das partes faladas
FILTROS = ('highpass=f=75,'
           'equalizer=f=180:t=o:w=1:g=1.5,'
           'equalizer=f=3000:t=o:w=1.5:g=-1.5,'
           'deesser=i=0.35,'
           'treble=g=-3:f=7000,'
           'acompressor=threshold=-24dB:ratio=2:attack=10:release=150:knee=4:makeup=2,'
           'lowpass=f=10500')

LETRAS = {}   # preenchido com data/falas.json
# Pronúncia das sílabas soltas (como a professora fala ao separar a palavra).
SILABAS = {'BO': 'bó', 'LA': 'lá', 'CA': 'cá', 'GA': 'gá', 'TO': 'tô', 'MA': 'má', 'CO': 'cô', 'PA': 'pá',
           'BOR': 'bôr', 'LE': 'lê', 'TA': 'tá'}
SILABAS_POR_PERGUNTA = {'D-SS-02': {'BO': 'bô'}}   # em BORBOLETA o "bo" é fechado

PALAVRA = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]+")

def para_voz(texto, qid=None):
    """Texto exibido → texto para o sintetizador (lista de partes)."""
    silabas = dict(SILABAS, **SILABAS_POR_PERGUNTA.get(qid, {}))
    partes = []
    for parte in (p.strip() for p in texto.split('|')):
        if not parte:
            continue
        saida, pos = [], 0
        anterior = ''
        for m in PALAVRA.finditer(parte):
            saida.append(parte[pos:m.start()])
            w = m.group()
            depois = parte[m.end():m.end() + 1]
            if w.isupper():
                if len(w) == 1 and (anterior == 'letra' or depois in ('', ',', '.', ':', '!', '?', ';')):
                    w = LETRAS.get(w, w.lower())
                elif w in silabas:
                    w = silabas[w]
                else:
                    w = w.lower()
            saida.append(w)
            anterior = w.lower()
            pos = m.end()
        saida.append(parte[pos:])
        partes.append(''.join(saida))
    return partes

voz = PiperVoice.load(str(MODELO))
config = SynthesisConfig(length_scale=VELOCIDADE)
CONSOANTES = set('ptkbdgfv')
PAUSA_FRASES = 0.25       # segundos entre frases dentro de uma parte

def corrigir_fonemas(fon):
    """Correções medidas com o reconhecedor de fala (ver README):
    - "lh" [ʎ] vira [lj], pronúncia natural no Brasil que este modelo articula melhor;
    - o "r" dos grupos tr, cr, br... vira vibrante, porque o tepe some na voz sintetizada;
    - o "a" átono no fim da palavra fica aberto, porque reduzido ele soava como "o";
    - uma pausa curta antes da frase evita que a primeira consoante se perca."""
    out = [',', ' ']
    for i, p in enumerate(fon):
        prox = fon[i + 1] if i + 1 < len(fon) else ' '
        prox2 = fon[i + 2] if i + 2 < len(fon) else ' '
        if p == 'ʎ':
            out += ['l', 'j']
        elif p == 'ɾ' and i > 0 and fon[i - 1] in CONSOANTES:
            out.append('r')
        elif p == 'ɐ' and (prox in ' ,.!?:;' or (prox == 's' and prox2 in ' ,.!?:;')):
            out.append('a')
        else:
            out.append(p)
    return out

def sintetizar(texto):
    sr = voz.config.sample_rate
    frases = []
    for fon in voz.phonemize(texto):
        if not fon:
            continue
        x = voz.phoneme_ids_to_audio(voz.phonemes_to_ids(corrigir_fonemas(fon)), config)
        x = np.asarray(x, dtype=np.float32)
        x = x / max(1e-6, float(np.abs(x).max()))
        if frases:
            frases.append(np.zeros(int(PAUSA_FRASES * sr), np.float32))
        frases.append(aparar(x, sr))
    return np.concatenate(frases), sr

def aparar(x, sr, limiar=0.006):
    jan = int(0.01 * sr)
    energia = np.array([np.sqrt(np.mean(x[i:i + jan] ** 2)) for i in range(0, max(1, len(x) - jan), jan)])
    ativos = np.where(energia > limiar)[0]
    if not len(ativos):
        return x
    ini = max(0, ativos[0] * jan - int(0.05 * sr))
    fim = min(len(x), (ativos[-1] + 1) * jan + int(0.06 * sr))
    return x[ini:fim]

def tratar(x, sr):
    proc = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', 'pipe:0',
                           '-af', FILTROS, '-f', 'f32le', '-ar', str(sr), '-ac', '1', 'pipe:1'],
                          input=x.astype(np.float32).tobytes(), capture_output=True, check=True)
    y = np.frombuffer(proc.stdout, dtype=np.float32).copy()
    # Volume igual entre as falas: mede só os trechos com voz.
    jan = int(0.02 * sr)
    blocos = [y[i:i + jan] for i in range(0, len(y) - jan, jan)]
    rms = np.array([np.sqrt(np.mean(b ** 2)) for b in blocos]) if blocos else np.array([np.sqrt(np.mean(y ** 2))])
    ativo = rms[rms > 0.25 * rms.max()]
    atual = 20 * np.log10(np.sqrt(np.mean(ativo ** 2)) + 1e-9)
    y *= 10 ** ((ALVO_RMS_DB - atual) / 20)
    pico = np.abs(y).max()
    if pico > 0.89:
        y *= 0.89 / pico
    return y

def gravar(destino, partes):
    destino = PROJETO / destino
    if SO_FALTANDO and destino.exists():
        return False
    trechos, sr = [], 22050
    for i, p in enumerate(partes):
        x, sr = sintetizar(p)
        if i:
            trechos.append(np.zeros(int(PAUSA_PARTES * sr), dtype=np.float32))
        trechos.append(x)
    x = np.concatenate([np.zeros(int(0.12 * sr), np.float32)] + trechos + [np.zeros(int(0.2 * sr), np.float32)])
    y = tratar(x, sr)
    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', 'pipe:0',
                    '-c:a', 'libmp3lame', '-b:a', '56k', '-ar', '22050', '-ac', '1', str(destino)],
                   input=y.astype(np.float32).tobytes(), check=True)
    return True

perguntas = json.loads((PROJETO / 'data/perguntas.json').read_text())['perguntas']
falas = json.loads((PROJETO / 'data/falas.json').read_text())
LETRAS.update({k: v['pronuncia'] for k, v in falas['letras'].items()})

tarefas = []   # (destino, texto exibido, partes para a voz, revisar com o reconhecedor?)
for k, f in falas['frases'].items():
    tarefas.append((f['arquivo'], f['texto'], para_voz(f['texto']), True))
for k, f in falas['letras'].items():
    tarefas.append((f['arquivo'], f['texto'], [f['pronuncia']], False))
for k, f in falas['numeros'].items():
    tarefas.append((f['arquivo'], f['texto'], [f['texto']], False))
for k, f in falas['cores'].items():
    tarefas.append((f['arquivo'], f['texto'], [f['texto']], False))
for p in perguntas:
    a = p['audio']
    tarefas.append((a['arquivo'], a['fala'], para_voz(a['fala'], p['id']), True))
    tarefas.append((a['dica'], p['dica'], para_voz(p['dica'], p['id']), True))
    tarefas.append((a['explicacao'], p['explicacao'], para_voz(p['explicacao'], p['id']), True))
    silabas = dict(SILABAS, **SILABAS_POR_PERGUNTA.get(p['id'], {}))
    for s, arq in zip(p.get('silabas', []), p.get('silabas_audio', [])):
        tarefas.append((arq, s, [silabas[s]], False))
    for s, arq in zip(p.get('pecas', []), p.get('pecas_audio', [])):
        if len(s) > 1:
            tarefas.append((arq, s, [silabas[s]], False))

# Mostra o texto enviado à voz quando ele difere do exibido (para revisão humana).
with open(LOGS / 'textos_voz.txt', 'w') as log:
    for destino, texto, partes, _ in tarefas:
        log.write(f'{destino}\n   exibido: {texto}\n   voz:     {" | ".join(partes)}\n')

feitos = 0
for i, (destino, texto, partes, _) in enumerate(tarefas, 1):
    if gravar(destino, partes):
        feitos += 1
    if i % 25 == 0:
        print(f'{i}/{len(tarefas)}', flush=True)
json.dump([{'arquivo': d, 'texto': t, 'voz': p, 'revisar': r} for d, t, p, r in tarefas],
          open(LOGS / 'tarefas_voz.json', 'w'), ensure_ascii=False, indent=1)
print('gravados:', feitos, 'de', len(tarefas))
