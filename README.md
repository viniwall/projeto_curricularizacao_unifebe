# Expedição Órbita Júnior

Jogo interativo para a **Educação Infantil, Pré-escola II (5 a 6 anos)**, feito para a
Curricularização da Extensão 2026.2 (Sistemas de Informação). A criança viaja com o robô **Órbi**
por quatro planetas. Cada planeta é uma atividade com 5 perguntas, e o jogo tem três níveis
(Fácil, Médio e Difícil). O Órbi lê todas as perguntas em voz alta e cada planeta tem a sua música.

- **Link do GitHub Pages:** `https://[USUARIO].github.io/[REPOSITORIO]/` *(substituir após publicar)*
- **Equipe:** [NOME DO GRUPO] — [integrantes]
- Entregas e dúvidas: pelo Moodle da disciplina.

## Os quatro planetas (conteúdos escolhidos)

Cada planeta trabalha **só o conteúdo do seu nome**, e a criança percebe pelo visual, pela música
e pela fala de abertura em que planeta está.

| Planeta | Conteúdo (requisito 5) | O que a criança faz |
|---|---|---|
| **Planeta dos Sons** | Consciência Fonológica e Silábica, Letras e Palavras, Compreensão Auditiva | reconhece o som dos animais, descobre palavras que começam ou terminam igual, bate palmas nas sílabas, monta palavras com pecinhas de sílabas e de letras |
| **Planeta dos Lugares** | Noções Espaciais | coloca objetos dentro, fora, em cima, embaixo, entre, à esquerda e à direita; acha quem está atrás, longe ou perto; programa o robô com setas |
| **Planeta dos Números** | Contagem e Quantidades (com Grandezas e Comparações) | conta estrelas, naves e cristais tocando em cada um; compara grupos; junta e tira; põe números e grupos em ordem; lê um gráfico de figuras |
| **Planeta das Cores** | Cores | o planeta "perdeu as cores": a criança nomeia cores, **pinta desenhos**, acha a cor diferente, completa sequências de cores, mistura tintas e descobre a cor que falta no arco-íris |

## Atendimento aos requisitos (Semana 2)

| Requisito | Como o jogo atende |
|---|---|
| 4. Pré-escola II, habilidades cognitivas, perceptivas e de raciocínio, de forma lúdica | 60 perguntas para 5 a 6 anos numa exploração espacial: contar, montar, ordenar, posicionar, programar e pintar |
| 5. Conteúdo (escolher 4) | Sons (consciência fonológica e silábica), Lugares (noções espaciais), Números (contagem e quantidades) e Cores |
| 6. Navegação simples e intuitiva | o Órbi fala cada comando; botões de 96 px ou mais com ícones; no máximo 4 opções por tela; casinha sempre no mesmo lugar |
| 7. Linguagem visual para 5 e 6 anos | figuras grandes em cartões claros, cores fortes, texto curto de 24 px ou mais, nenhuma leitura obrigatória |
| 8. Experiência acolhedora e motivadora | voz calma, música de fundo, sem timer, vidas ou som de castigo; "Quase! Tente de novo." com dica; estrelas e cristais |
| 9. Compatível com Chromebook | HTML, CSS e JavaScript puros, sem instalação; voz e música funcionam **sem internet** depois de abertas; toque, mouse e teclado; valores alternativos no CSS para Chrome mais antigo |

## Como jogar

1. **Jogar** → digitar o **nome completo** da criança (teclado na tela com letras, acentos e espaço,
   ou o teclado do Chromebook) → escolher a nave → escolher o nível pelas estrelas.
2. **Mapa:** a criança escolhe o planeta. O Órbi apresenta o planeta e lê cada pergunta.
3. Formatos de resposta: tocar na figura, contar tocando, bater palmas nas sílabas, montar palavras
   (uma pecinha sempre sobra), ordenar, colocar o objeto no lugar certo, programar o robô e pintar.
4. **Retorno:**
   - acerto: "Muito bem!", o porquê falado, estrela voando e avanço automático;
   - 1º erro: "Quase! Tente de novo." e uma dica;
   - 2º erro: a resposta aparece com a explicação e o jogo segue (a criança ganha um cristal).
5. Depois dos quatro planetas aparece a tela final com **Jogar de novo** e **Trocar nível**.
   A casinha no mapa abre a tela final com **Continuar**.

## Voz do Órbi

O Órbi fala com **gravações em MP3** geradas pelo grupo com uma voz neural em português do Brasil
(Piper, voz "faber"). Gravações garantem que a voz seja a mesma em qualquer Chromebook, mesmo sem
internet. A voz do navegador fica só como reserva, caso falte algum arquivo.

Como a voz foi escolhida e ajustada (medido, não "no ouvido"):

1. **Escolha da voz:** as três vozes em português com dados de treino CC0 (faber, cadu e jeff)
   leram as mesmas frases do jogo, e um reconhecedor de fala (Whisper) transcreveu cada uma.
   A faber foi a mais inteligível (7% de erro de palavras, contra 11% e 18%).
2. **Velocidade:** a faber falava 183 palavras por minuto, rápido demais para 5 anos. A fala foi
   desacelerada (cerca de 150 palavras por minuto, mais pausas entre as partes).
3. **Pronúncia:** o modelo errava o "lh" ("vermelho" soava "vermeu"), o "r" depois de consoante
   ("estrela" soava "estela") e a primeira consoante da frase. As correções foram feitas nos
   fonemas: "lh" pronunciado como [lj], "r" vibrante nos grupos tr/cr/br e uma pausa curta antes de
   cada frase. Num conjunto de frases difíceis, o erro caiu de 19% para 10%.
6. **Revisão final:** as 213 falas gravadas (sem contar as de palavras soltas) foram transcritas de
   volta pelo reconhecedor de fala: erro médio de 5,8% das palavras; 141 das 192 frases longas foram
   entendidas sem nenhum erro. As falas que ainda falham devem ser ouvidas por uma pessoa antes da entrega;
   algumas são mantidas porque o erro é pequeno (ex.: "Quer jogar de novo?" soa "Quere jurar
   de novo"). Recomendação: gravar com uma pessoa as falas que o grupo quiser perfeitas.
4. **Suavidade:** graves levemente aquecidos, agudos e chiados atenuados, compressão suave e o mesmo
   volume em todas as falas.
5. **Sílabas e letras soltas** ("bó", "lá", "ême") usam a pronúncia que a professora usa ao separar a
   palavra; "BO" de BOLA soa "bó" e "BO" de BORBOLETA soa "bô".

Para mudar um texto: edite `data/perguntas.json` ou `data/falas.json`, apague o MP3 correspondente e
rode `ferramentas/gerar_voz.py` (instruções no topo do arquivo). Gravar a voz de uma pessoa também
funciona: basta usar o mesmo nome de arquivo.

## Música

Cinco temas originais compostos pelo grupo e tocados pelo próprio jogo (Web Audio, sem arquivos):
um para os menus e um para cada planeta, com instrumento e ritmo próprios (xilofone no Planeta dos
Sons, sinos lentos no dos Lugares, marimba e bumbo no dos Números, glockenspiel no das Cores).

- A música fica **mais baixa durante as perguntas** e abaixa ainda mais **enquanto o Órbi fala**,
  para não atrapalhar a compreensão (medido: voz em −20 dB; música em −30 dB nos menus e −36 dB nas
  perguntas, e mais −11 dB durante a fala).
- Só começa depois do primeiro toque, pausa quando a aba fica escondida e pode ser desligada na
  Área do adulto.

## Nome completo e privacidade (LGPD)

O jogo aceita o **nome completo** da criança. O nome aparece na tela (o Órbi chama a criança pelo
primeiro nome) e entra no **registro de tentativas**, que fica só no navegador do aparelho e só sai
dele pelo botão **Exportar registro (.txt)**. Nada é enviado pela internet. Como nome completo de
criança é dado pessoal, a escola deve autorizar esse uso; quem preferir pode digitar só um apelido.

## Como rodar e publicar

```bash
python3 -m http.server 8000      # Windows: py -m http.server 8000
# abra http://localhost:8000
```

Aberto direto do disco (`file://`), o navegador bloqueia a leitura dos dados e aparece um aviso.
Para publicar: envie os arquivos ao GitHub, **Settings → Pages → Deploy from a branch**, `main`,
`/ (root)`. Todos os caminhos são relativos. **No Chromebook:** abra o link no Chrome; funciona com
toque se a tela for sensível ao toque.

## Estrutura

```
index.html              telas
css/estilo.css          visual de cada planeta, responsividade (1280, 768 e 375 px)
js/app.js               fluxo: nome, nave, nível, mapa, perguntas, retorno, fim
js/atividades.js        planetas, cenas e os 6 tipos de resposta (inclui pintar)
js/audio.js             voz do Órbi, música e efeitos
js/registro.js          registro de tentativas e exportação .txt
data/perguntas.json     60 perguntas (3 níveis × 4 planetas × 5)
data/falas.json         falas do Órbi fora das perguntas, letras, números e cores
assets/audio/           294 falas gravadas + som de acerto
assets/img/             SVGs originais (inclui assets/img/pintar/, desenhos de colorir)
assets/fontes/          Fredoka e Nunito (OFL)
ferramentas/gerar_voz.py  regrava as falas do Órbi a partir dos textos
```

## Banco de perguntas

Cada item tem `id`, `nivel`, `atividade`, `ordem`, `area`, `habilidade`, `bncc`, `enunciado`, `tipo`
(`escolha`, `montar`, `ordenar`, `colocar`, `rota` ou `pintar`), `cena`, alternativas, peças, cenário,
grade ou objetos (conforme o tipo), `resposta_correta`, `dica`, `explicacao`, `video` e `audio`
(`fala`, `arquivo`, `dica`, `explicacao`: as gravações da pergunta). Perguntas de sílabas e de montar
têm também `silabas_audio` ou `pecas_audio`.

## Alinhamento à BNCC (Educação Infantil)

Campo "Escuta, fala, pensamento e imaginação": EI03EF01, 02 e 09. Campo "Traços, sons, cores e
formas": EI03TS02 (pintura) e EI03TS03 (sons). Campo "Espaços, tempos, quantidades…": EI03ET01, 02,
05, 07 e 08. Padrões de cores: EI03CO01 (complemento de Computação). As relações espaciais não têm
objetivo próprio para 4 a 5 anos e 11 meses; aparecem em EI02ET04 e estão marcadas como
"consolidação". O código de cada pergunta está no campo `bncc`.

## Registro de tentativas

Cada tentativa grava no `localStorage`: número sequencial, nome, data, hora, nível, atividade, id,
área e resultado. **Exportar registro (.txt)** baixa uma linha por tentativa. Para desligar, troque
`REGISTRO_ATIVO` em `js/registro.js`.

## Para confirmar com o professor

1. Se a escola autoriza guardar o nome completo da criança no aparelho (LGPD).
2. Se o registro de tentativas é necessário e se o `.txt` serve.
3. Se a voz sintetizada basta ou se o grupo deve gravar as falas com uma pessoa.
4. Se o lembrete gentil (15 s parado, no máximo 2 vezes) é adequado.

## Navegadores testados

| Navegador | Resultado |
|---|---|
| Chromium 153 (Linux), automatizado | 3 níveis completos com os 6 tipos de resposta (acerto, erro e resposta revelada), 294 gravações verificadas (nenhuma faltando), voz do navegador usada 0 vezes, música, sair e continuar, registro com nome completo; telas em 1280, 768 e 375 px; nenhum erro no console |
| Firefox 157 (Linux), automatizado | nível Difícil completo, sem mensagens no console |
| Chromebook (Chrome OS) | *pendente: teste manual na escola* |
| Tablet com toque | *pendente* (toque emulado no Chromium) |
