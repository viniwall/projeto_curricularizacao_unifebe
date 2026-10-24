# Créditos dos assets

As imagens, a música, os efeitos sonoros e os textos foram **criados pelo grupo** ([NOME DO GRUPO])
para este jogo. A voz do Órbi foi **gerada pelo grupo** com um sintetizador de voz aberto (detalhes
abaixo). As únicas peças de terceiros são duas fontes tipográficas de licença livre. Nenhum
personagem, marca ou logotipo protegido foi usado.

Ao trocar um asset por material de terceiros, use apenas licença **CC0 ou equivalente** e acrescente
uma linha nas tabelas com a origem (link) e a licença.

## Imagens (`assets/img/`)

Vetores SVG desenhados com formas geométricas. Licença: original do grupo.

| Arquivo | Descrição | Origem | Licença |
|---|---|---|---|
| planeta-sons.svg, planeta-lugares.svg, planeta-numeros.svg, planeta-cores.svg | os quatro planetas (atividades) | original | do grupo |
| favicon.svg | ícone da aba | original | do grupo |
| nave.svg, rover.svg, cratera.svg, cristal.svg, estrela.svg, estrela-vazia.svg | nave, robô do tabuleiro, buraco, cristal e estrelas | original | do grupo |
| gato, cachorro, peixe, passaro, vaca, pato, sapo, macaco, elefante, borboleta, coelho (.svg) | animais | original | do grupo |
| bola, caixa, caixa-fundo, caixa-frente, mesa, arvore, casa, lapis, balao, sol, lua, flor, maca, banana, uva (.svg) | objetos, natureza e frutas | original | do grupo |
| mar, fazenda, floresta, ceu (.svg) | ambientes | original | do grupo |
| pintar/bola, estrela, sol, banana, maca, uva, sapo, flor, peixe, balao (.svg) | desenhos de colorir do Planeta das Cores (a área pintável começa branca) | original | do grupo |

Também são originais e ficam dentro do código: o robô **Órbi** (SVG em `js/atividades.js`), as
mãozinhas das palmas, as setas, o arco-íris, as sequências, o gráfico de figuras, o tabuleiro do
robô, os enfeites de fundo de cada planeta e o céu estrelado (CSS e JavaScript).

## Fontes (`assets/fontes/`)

| Arquivo | Fonte | Origem | Licença |
|---|---|---|---|
| fredoka.woff2 | Fredoka (títulos e botões), subconjunto latino | Google Fonts / The Fredoka Project Authors | SIL Open Font License 1.1 (`OFL-Fredoka.txt`) |
| nunito.woff2 | Nunito, subconjunto latino | Google Fonts / The Nunito Project Authors | SIL Open Font License 1.1 (`OFL-Nunito.txt`) |

## Voz do Órbi (`assets/audio/falas`, `letras`, `numeros`, `cores`, `perguntas`)

294 falas em MP3 (6,5 MB), geradas pelo grupo com:

| Item | Detalhe |
|---|---|
| Programa | [Piper](https://github.com/OHF-Voice/piper1-gpl) (sintetizador de voz aberto, roda sem internet) |
| Voz | `pt_BR-faber-medium` ([rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices/tree/main/pt/pt_BR/faber/medium)) |
| Dados de treino da voz em português | conjunto "faber" do [OHF-Voice/voice-datasets](https://github.com/OHF-Voice/voice-datasets), licença **CC0** (domínio público) |
| Ressalva | o modelo em português foi ajustado a partir do modelo inglês "lessac", cujos dados originais ([Blizzard 2013](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html)) têm licença de **uso em pesquisa, não comercial**. Para este projeto acadêmico e gratuito isso é aceitável; para uso comercial, a voz deve ser regravada |
| Ajustes do grupo | fala 40% mais lenta, pausas entre as partes, correção de pronúncia ("lh", "r" depois de consoante e início das frases), graves levemente aquecidos, agudos e chiados atenuados, volume igualado |
| Ferramenta | `ferramentas/gerar_voz.py` (refaz as falas a partir de `data/perguntas.json` e `data/falas.json`) |

A melhor opção continua sendo **gravar uma pessoa de verdade** (por exemplo, a professora). Basta
salvar cada fala com o mesmo nome de arquivo indicado nos JSON.

## Música e efeitos

| Item | Descrição | Origem | Licença |
|---|---|---|---|
| Música | 5 temas (mapa e um para cada planeta) compostos pelo grupo e tocados pelo próprio jogo com Web Audio, em `js/audio.js`; não há arquivo de música | original | do grupo |
| Efeitos | toque, contagem, palmas, pintar, passo do robô, batida, brilho e fanfarra, sintetizados em `js/audio.js` | original | do grupo |
| assets/audio/acerto.wav | arpejo curto (dó-mi-sol-dó) para o acerto | original, sintetizado por script | do grupo |

## Vídeo (`assets/video/`)

Nenhum vídeo nesta versão. Veja `assets/video/LEIAME.txt`.

## Conteúdo das perguntas

Os textos, dicas e explicações de `data/perguntas.json` e as falas de `data/falas.json` foram escritos
pelo grupo e alinhados aos objetivos da BNCC da Educação Infantil (Pré-escola II).
