# Plano do App de Gerenciamento de Tarefas

> Versão revisada — preenchidas as decisões técnicas e regras de negócio que
> faltavam para o plano ficar executável. Seções novas/alteradas marcadas com **[NOVO]** ou **[DEFINIDO]**.

## 1. Objetivo

Aplicativo para gerenciar atividades com foco em:
- Definir nível de criticidade
- Dividir cada atividade em passos (algoritmo) com dependências
- Acompanhar progresso em %
- Registrar histórico de tudo que foi feito
- Gerar relatório profissional (nível industrial) para apresentação na empresa

---

## 2. Modelo de Dados

### Atividade
- `id`
- `título` (obrigatório)
- `descrição`
- `criticidade`: Baixa / Média / Alta / Urgente
- `modo de criticidade`: Manual ou Questionário
- `notasQuestionario` **[NOVO]**: `{ urgencia, impacto, dependencia }` (1–5 cada) — guardado quando o modo é Questionário, para poder reabrir e reajustar
- `prazo` (opcional)
- `status`: Não iniciada / Em andamento / Concluída
- `data de criação`
- `data de conclusão`
- `passos[]`

### Passo (dentro da atividade)
- `id`
- `texto`
- `ordem`
- `dependeDe` (id de outro passo, opcional — usado para montar o fluxograma futuramente)
- `concluído` (sim/não)
- `tempo gasto` (minutos, preenchido manualmente ao concluir)
- `observação` (opcional, registra como foi feito — útil para o relatório)

### Registro de Histórico
Gerado automaticamente a cada mudança de status da atividade:
- O que foi feito (título + descrição no momento)
- Quando (timestamp)
- Status anterior → novo status **[NOVO]**
- Tempo total gasto (soma dos passos)
- Criticidade
- Snapshot dos passos e observações

**Regra [DEFINIDO]:** o histórico é **imutável**. Excluir uma atividade **não** apaga os registros de histórico já gerados por ela (são snapshots independentes, necessários para o relatório).

---

## 3. Criticidade — Dois Modos

**Modo Manual:** usuário escolhe diretamente (Baixa/Média/Alta/Urgente).

**Modo Questionário:** 3 perguntas, nota de 1 a 5 cada:
1. Urgência do prazo (1 = sem pressa, 5 = pra ontem)
2. Impacto se não for feito (1 = irrelevante, 5 = crítico)
3. Dependência de terceiros / bloqueio de outras tarefas (1 = nenhuma, 5 = trava tudo)

Cálculo pela média:
| Média | Criticidade |
|---|---|
| 1,0 – 2,0 | Baixa |
| 2,1 – 3,0 | Média |
| 3,1 – 4,0 | Alta |
| 4,1 – 5,0 | Urgente |

A IA pode sugerir notas iniciais para as 3 perguntas; usuário confirma ou ajusta.

**Pesos de criticidade [DEFINIDO]** (usados no progresso geral — seção 5):
| Criticidade | Peso |
|---|---|
| Baixa | 1 |
| Média | 2 |
| Alta | 3 |
| Urgente | 5 |

---

## 4. Divisão em Passos (Algoritmo)

Divisão pode ser feita de duas formas, sempre editáveis:

**Manual:** usuário digita os passos um a um, define ordem e dependência.

**Assistida por IA:** botão "Sugerir passos com IA" — usa título + descrição da atividade e devolve uma sugestão de passos numerados com dependências identificadas. Sugestão entra como **rascunho editável** (nunca definitivo): usuário pode aceitar, editar, apagar, reordenar ou complementar manualmente.

Fluxo guiado (usado tanto manual quanto como base pra IA):
1. Qual é o resultado final que define a atividade como concluída?
2. Quais são as etapas intermediárias entre o início e esse resultado?
3. Algum passo depende de outro estar pronto antes?

### Exemplo prático
Atividade: "Corrigir bug no login"
1. Reproduzir o erro localmente
2. Identificar a causa no código *(depende do passo 1)*
3. Escrever a correção *(depende do passo 2)*
4. Testar a correção *(depende do passo 3)*
5. Fazer o deploy *(depende do passo 4)*

### Regras de dependência entre passos **[NOVO]**
- Um passo com `dependeDe` **não pode ser marcado como concluído** enquanto a dependência não estiver concluída. Na UI o checkbox fica desabilitado com tooltip: *"Depende de: <passo X>"*.
- Ao desmarcar um passo que é dependência de outros, os passos dependentes que estiverem concluídos são **desmarcados em cascata** (com aviso).
- **Dependência circular é proibida:** ao salvar, valida o grafo; se A→B e B→A (direta ou indiretamente), bloqueia com mensagem de erro.
- Um passo só pode depender de passos da **mesma atividade**.

---

## 5. Progresso

- **Por atividade:** `% = passos concluídos / total de passos`. Atividade **sem passos** = 0%.
- **Geral (dashboard) [DEFINIDO]:** média ponderada pelos pesos de criticidade:

  ```
  progressoGeral = Σ(peso_i × progresso_i) / Σ(peso_i)
  ```
  considerando apenas atividades **não concluídas** (as concluídas já saíram do "trabalho pendente"). Se não houver atividades pendentes, exibe 100%.

---

## 6. Registro de Tempo

Manual — o usuário digita o tempo gasto (em minutos) ao marcar um passo como concluído. O tempo total da atividade é a **soma** dos tempos dos passos.

---

## 7. Organização das Atividades

Lista única (sem categorias/projetos, mantendo simples).

**Ordenação padrão do dashboard [NOVO]:** por criticidade (Urgente → Baixa) e, dentro da mesma criticidade, por prazo mais próximo. Atividades **atrasadas** aparecem no topo.

---

## 8. Fluxograma dos Passos

- **Fase 1 (agora):** lista numerada com setas indicando dependência
- **Fase 2 (depois):** diagrama visual real (caixinhas conectadas), reaproveitando o campo `dependeDe` já existente na estrutura de dados — não vai exigir refazer o modelo

---

## 9. Layout

### Card no Dashboard
```
┌─────────────────────────────────┐
│ 🔴 Urgente        Prazo: 12/07   │
│ Corrigir bug no sistema de login │
│ ▓▓▓▓▓▓▓░░░ 70%                   │
│ 5 de 7 passos concluídos          │
└─────────────────────────────────┘
```
Cor da borda/badge conforme criticidade (verde/amarelo/laranja/vermelho).

**Estado "Atrasada" [NOVO]:** se `prazo < hoje` e status ≠ Concluída, o card ganha um selo **"⚠ Atrasada"** e a data do prazo fica em vermelho.

### Formulário "Nova Atividade"
- Título (obrigatório)
- Descrição
- Prazo (opcional)
- Criticidade (toggle manual/questionário, com sugestão da IA disponível)
- Passos (manual ou botão "Sugerir passos com IA")

**Validações [DEFINIDO]:**
- Título vazio → bloqueia salvar.
- Prazo no passado → **permite**, mas mostra aviso ("prazo já vencido").
- Atividade pode ser salva sem passos (fica 0% e status "Não iniciada").

### Tela de Detalhe
- Cabeçalho: título, criticidade, prazo, % progresso
- Lista de passos com checkbox, campo de tempo gasto, campo de observação
- Botão "Adicionar passo" (disponível mesmo após criação)
- Botões **"Editar"** e **"Excluir"** atividade **[NOVO]** (excluir pede confirmação)

### Estados vazios / erro **[NOVO]**
- Dashboard sem atividades → ilustração + CTA "Criar primeira atividade".
- Falha ao salvar (storage cheio) / falha na IA → toast de erro, sem perder o que o usuário digitou.

---

## 10. Persistência **[DEFINIDO — ambiente corporativo]**

**Restrições do PC da empresa:** não é possível instalar nada; roda só o navegador; a rede libera GitHub e Supabase, mas política de saída de dados é incerta. Decisões tomadas a partir disso:

**Banco: SQLite de verdade, rodando no navegador (WASM), com persistência em 3 camadas.**

SQLite compilado para **WebAssembly** (`wa-sqlite` ou `sql.js`) roda 100% dentro do navegador — **sem instalar nada, sem servidor, sem porta aberta**. A estratégia de onde o arquivo é guardado degrada graciosamente conforme o que o PC da empresa permitir (detectado em runtime):

1. **Ideal — File System Access API** (Edge suporta): auto-save num arquivo `.sqlite` **real** no OneDrive/drive de rede. Sobrevive a reset do navegador; é um arquivo visível que você controla. *Ativa se a política corporativa não bloquear.*
2. **Automático — OPFS / IndexedDB:** se a File System Access API estiver bloqueada, o SQLite persiste sozinho no armazenamento do navegador (Origin Private File System). **Você não precisa fazer nada** — salva automático. Único porém: vive no perfil do navegador (se a TI resetar o perfil, some — por isso o backup abaixo).
3. **Backup universal — Export/Import:** botão **Exportar** baixa o `.sqlite` (ou JSON) pro OneDrive; **Importar** restaura. Funciona em qualquer cenário; serve de backup mesmo quando a camada 1 já está ativa.

O app escolhe sozinho a melhor camada disponível e avisa na tela qual está em uso. **Em nenhum cenário você fica sem persistência.**

- **Dados 100% locais** — nada sai da empresa. Não há banco na nuvem no MVP.

**Acesso isolado atrás de `TarefaRepository`** (`listar / obter / salvar / excluir`), implementação `SqliteRepository`. Se no futuro a empresa liberar dados na nuvem e você quiser sincronizar entre PCs, dá pra trocar por um `SupabaseRepository` (Supabase já abre na rede) **sem reescrever a UI**.

**Sem login/autenticação no MVP** — app pessoal, single-user, ligado ao arquivo `.sqlite`.

**Backup:** o próprio arquivo `.sqlite` no OneDrive já é o backup; o Export da seção 11 (JSON) é backup adicional para o relatório.

---

## 11. Relatório Final (nível industrial)

O app não gera o `.docx` diretamente (não é confiável nesse ambiente). Fluxo definido:

1. Dentro do app, usuário clica em **"Exportar dados"** → baixa um JSON com atividades, passos, histórico e progresso
2. Esse JSON é enviado no chat com Claude
3. Claude gera o relatório `.docx` formal: cabeçalho, sumário executivo, tabela de atividades por criticidade, gráfico de progresso, seção de conclusões

Pode ser repetido quantas vezes for necessário (semanal, mensal, por período).

### Formato do JSON de exportação **[NOVO]** (contrato com o Claude)
```json
{
  "schemaVersion": "1.0",
  "exportadoEm": "2026-07-08T14:30:00Z",
  "periodo": { "de": "2026-07-01", "ate": "2026-07-08" },
  "resumo": {
    "totalAtividades": 12,
    "concluidas": 5,
    "emAndamento": 4,
    "naoIniciadas": 3,
    "atrasadas": 2,
    "progressoGeral": 0.63
  },
  "atividades": [
    {
      "id": "uuid",
      "titulo": "Corrigir bug no login",
      "descricao": "...",
      "criticidade": "Urgente",
      "status": "Concluída",
      "prazo": "2026-07-12",
      "criadaEm": "2026-07-02T09:00:00Z",
      "concluidaEm": "2026-07-08T11:00:00Z",
      "tempoTotalMin": 240,
      "progresso": 1.0,
      "passos": [
        { "ordem": 1, "texto": "Reproduzir o erro", "concluido": true,
          "dependeDe": null, "tempoGastoMin": 30, "observacao": "..." }
      ]
    }
  ],
  "historico": [
    { "atividadeId": "uuid", "titulo": "...", "de": "Em andamento",
      "para": "Concluída", "em": "2026-07-08T11:00:00Z",
      "tempoTotalMin": 240, "criticidade": "Urgente" }
  ]
}
```
O botão de exportar permite escolher o **período** (tudo / última semana / último mês / intervalo custom) — filtra `atividades` e `historico` por data.

---

## 12. Telas do App

1. **Dashboard** — lista de atividades + progresso geral
2. **Nova Atividade** — formulário completo (manual + IA)
3. **Detalhe da Atividade** — passos, tempo, % individual, editar/excluir
4. **Histórico** — linha do tempo de tudo que foi concluído, com **filtros por período e por criticidade** **[NOVO]**
5. **Exportar / Importar** — download do JSON (com seletor de período) e restauração via upload **[NOVO]**

---

## 13. Status da Atividade — quando muda **[NOVO / DEFINIDO]**

Status é **derivado automaticamente** dos passos:
- **Não iniciada:** nenhum passo concluído (ou nenhum passo cadastrado).
- **Em andamento:** ≥ 1 passo concluído e < 100%.
- **Concluída:** 100% dos passos concluídos.

- `data de conclusão` é preenchida quando entra em "Concluída"; limpa se voltar atrás.
- Cada transição gera um **Registro de Histórico** (seção 2).
- Atividade **sem passos** pode ser marcada como concluída manualmente (botão "Concluir"), já que não há passos para chegar a 100%.

---

## 14. Integração com IA **[DEFINIDO — desligada por padrão]**

Dois pontos de IA: (a) sugerir passos, (b) sugerir notas do questionário de criticidade.

**Política corporativa incerta sobre dados saindo da empresa → IA vem DESLIGADA por padrão.** O app é totalmente utilizável sem ela; a IA é um "plus" opcional que o usuário liga manualmente nas Configurações, ciente de que isso envia título/descrição da atividade para um serviço externo.

- **Modelo (quando ligada):** Claude (Anthropic API), `claude-sonnet-5`.
- **Sem backend:** chamada direta do navegador com o header `anthropic-dangerous-direct-browser-access`; a **chave de API é do próprio usuário**, guardada localmente. (Se a rede/proxy bloquear a Anthropic, a feature simplesmente fica indisponível — não quebra o resto.)
- **Alternativa sem enviar dados externos:** o fluxo do relatório (§11) já usa o Claude "por fora" — o usuário exporta o JSON e cola no chat manualmente. Mesma lógica pode ser usada para pedir sugestão de passos sem o app tocar em nenhuma API.
- **Saída estruturada:** JSON (`{ passos: [{ texto, dependeDeOrdem }] }` ou `{ urgencia, impacto, dependencia }`) para popular o formulário como rascunho editável.
- **Tratamento de falha:** timeout ~30s; se falhar/bloquear/sem chave, toast e o modo manual segue 100%. Isolada atrás de um serviço `IAService`.

---

## 15. Stack Técnica **[DEFINIDO — ambiente corporativo]**

- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** Tailwind CSS
- **Estado global:** Zustand (leve) — store única de atividades, persistida via `TarefaRepository`
- **Roteamento:** React Router (Dashboard / Detalhe / Histórico / Exportar / Config)
- **Banco:** SQLite via WASM (`wa-sqlite` ou `sql.js`) atrás de `TarefaRepository` → arquivo `.sqlite` salvo via **File System Access API** (com Export/Import como fallback) — ver §10
- **IDs:** `crypto.randomUUID()`
- **Datas:** `Intl.DateTimeFormat` nativo
- **Sem backend, sem servidor local, sem instalação.**

## 15.1 Como rodar / hospedar **[NOVO — chave pro ambiente da empresa]**

- **Desenvolvimento:** feito em casa/PC pessoal (onde dá pra instalar Node + Vite).
- **Deploy:** build estático publicado no **GitHub Pages** (GitHub abre na rede da empresa). No PC da empresa você só **abre a URL** no Edge/Chrome — nada pra instalar.
- **Por que GitHub Pages e não Vercel:** GitHub você confirmou que abre; Vercel é incerto. GitHub Pages serve o mesmo build estático via https (necessário pra File System Access API funcionar).
- **Tudo bundlado, sem CDN:** o Vite empacota todas as dependências no build — nada é carregado de CDN externo em runtime, então proxy/firewall não quebra o app.
- **Offline:** depois de aberto uma vez, o app não precisa de internet para funcionar (dados são locais). Opcional: PWA/service worker para cache offline completo.

---

## 16. Ordem de Construção **[ATUALIZADO — ambiente corporativo]**

1. Scaffold (Vite + TS + Tailwind + Router + Zustand) + deploy inicial no GitHub Pages (validar que abre e roda no PC da empresa **antes** de construir o resto)
2. Camada `TarefaRepository` com SQLite/WASM + File System Access API (abrir/criar/salvar o arquivo `.sqlite`) + Export/Import fallback
3. Modelo de dados + CRUD de atividades e passos (manual) — inclui editar/excluir
4. Regras: progresso por atividade, status automático, dependências entre passos
5. Dashboard com progresso geral ponderado, ordenação e selo "Atrasada"
6. Detalhe da atividade (tempo, observação, adicionar passo)
7. Criticidade (manual + questionário) — sem IA ainda
8. Histórico com filtros
9. Exportação/Importação JSON (contrato da seção 11)
10. Integração com IA (opcional, desligada por padrão) — por último
11. Fase 2 (futuro): fluxograma visual dos passos; e, se a empresa liberar, `SupabaseRepository` para sync entre PCs

> **Nota de risco:** o passo 1 valida cedo a hipótese mais importante — que o GitHub Pages abre e a File System Access API funciona nesse PC. Se algo aí não passar, ajustamos a estratégia (ex.: single-file HTML + Export/Import manual) antes de investir no resto.
