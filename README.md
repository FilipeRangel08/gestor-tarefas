# Gestor de Tarefas

App de gerenciamento de tarefas com criticidade, divisão em passos e relatório
industrial. Roda 100% no navegador, sem instalação e sem servidor — pensado para
funcionar num PC corporativo com restrições de segurança.

Plano completo do produto: [PLANO.md](./PLANO.md).

## Status

**Passo 1 — verificação de ambiente.** Esta versão só detecta e mostra qual
camada de persistência funciona no navegador (ver §10 do PLANO.md). Serve para
testar o terreno no PC da empresa antes de construir o resto.

## Rodar localmente (PC de desenvolvimento)

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera o build estático em dist/
npm run preview  # serve o build para conferência
```

Requer Node 18+ (testado com Node 24).

## Publicar (GitHub Pages)

1. Crie um repositório novo no GitHub e faça push desta pasta.
2. Em **Settings > Pages**, defina **Source = GitHub Actions**.
3. O workflow em `.github/workflows/deploy.yml` publica a cada push na `main`.
4. Abra a URL do Pages **no PC da empresa** e confira a camada de persistência ativa.

O Vite usa `base: './'` + `HashRouter`, então o app funciona em qualquer nome de
repositório, sem configurar caminho.

## Arquitetura (resumo)

- **React + TypeScript + Vite + Tailwind**
- **Banco:** SQLite via WebAssembly, com persistência em 3 camadas
  (arquivo no disco → OPFS/IndexedDB → export/import). Ver §10 do PLANO.md.
- **Sem backend.** Dados 100% locais.
