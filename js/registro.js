/*
 * registro.js — registro de tentativas
 *
 * ATENÇÃO: CONFIRMAR COM O PROFESSOR se o registro de tentativas é necessário
 * e se o formato de exportação (.txt, uma linha por tentativa) está adequado.
 * O registro guarda o NOME COMPLETO da criança, que é dado pessoal (LGPD):
 * ele fica só no navegador deste aparelho e só sai dele pelo botão de exportar.
 * Para desligar o registro por completo, troque REGISTRO_ATIVO para false:
 * nada será gravado e os botões de exportação somem da tela.
 */
const REGISTRO_ATIVO = true;

const Registro = (() => {
  const CHAVE = 'brincandoComALumi.registro.v1';
  let memoria = [];          // cópia em memória, usada se o localStorage estiver bloqueado

  function lerStorage() {
    try {
      const texto = window.localStorage.getItem(CHAVE);
      const dados = texto ? JSON.parse(texto) : [];
      return Array.isArray(dados) ? dados : [];
    } catch (e) {
      return null;
    }
  }

  function gravarStorage(lista) {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(lista));
      return true;
    } catch (e) {
      return false;
    }
  }

  function listar() {
    const lista = lerStorage();
    if (lista === null) return memoria.slice();
    memoria = lista;
    return lista.slice();
  }

  const dois = n => String(n).padStart(2, '0');

  // dados: { nome, nivel, atividade, id, area, resultado: 'acerto' | 'erro' }
  function registrar(dados) {
    if (!REGISTRO_ATIVO) return null;
    const agora = new Date();
    const lista = listar();
    const ultimo = lista.length ? Number(lista[lista.length - 1].seq) || lista.length : 0;
    const item = {
      seq: ultimo + 1,
      nome: dados.nome || '(sem nome)',
      data: `${dois(agora.getDate())}/${dois(agora.getMonth() + 1)}/${agora.getFullYear()}`,
      hora: `${dois(agora.getHours())}:${dois(agora.getMinutes())}:${dois(agora.getSeconds())}`,
      nivel: dados.nivel,
      atividade: dados.atividade,
      id: dados.id,
      area: dados.area,
      resultado: dados.resultado
    };
    lista.push(item);
    memoria = lista;
    gravarStorage(lista);
    return item;
  }

  function linha(r) {
    return [
      String(r.seq).padStart(4, '0'),
      `Nome: ${r.nome || r.apelido || '(sem nome)'}`,
      `Data: ${r.data}`,
      `Hora: ${r.hora}`,
      `Nível: ${r.nivel}`,
      `Atividade: ${r.atividade}`,
      `Pergunta: ${r.id}`,
      `Área: ${r.area}`,
      `Resultado: ${r.resultado}`
    ].join(' | ');
  }

  // Baixa um .txt com uma linha por tentativa (UTF-8, quebras de linha do Windows).
  function exportar() {
    if (!REGISTRO_ATIVO) return false;
    const lista = listar();
    const conteudo = lista.length ? lista.map(linha).join('\r\n') + '\r\n' : '';
    const arquivo = new Blob(['﻿' + conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(arquivo);
    const hoje = new Date();
    const link = document.createElement('a');
    link.href = url;
    link.download = `registro-tentativas-${hoje.getFullYear()}-${dois(hoje.getMonth() + 1)}-${dois(hoje.getDate())}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  }

  function limpar() {
    memoria = [];
    try { window.localStorage.removeItem(CHAVE); } catch (e) { /* storage indisponível */ }
  }

  return {
    ativo: REGISTRO_ATIVO,
    registrar,
    exportar,
    limpar,
    total: () => listar().length
  };
})();
