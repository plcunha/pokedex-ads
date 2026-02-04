# Pokédex Pro

Uma Pokédex moderna e profissional com duas versões: **Static Site** (GitHub Pages) e **Express.js API** (Backend).

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![CI](https://github.com/YOUR_USERNAME/pokedex-ads/actions/workflows/ci.yml/badge.svg)

## Demo

**[Acesse a Pokédex Online](https://YOUR_USERNAME.github.io/pokedex-ads/)**

## Features

- **UI Moderna** - Design escuro elegante com animações suaves
- **PWA Ready** - Funciona offline com Service Worker
- **Performance** - Cache inteligente e lazy loading de imagens
- **Responsivo** - Funciona perfeitamente em todos os dispositivos
- **Busca Inteligente** - Busca por nome ou número do Pokémon
- **Estatísticas Visuais** - Barras animadas para stats do Pokémon
- **Cores por Tipo** - Cards coloridos de acordo com o tipo do Pokémon

## Arquitetura do Projeto

```
pokedex-ads/
├── docs/                    # Static Site (GitHub Pages)
│   ├── css/styles.css       # Estilos CSS
│   ├── js/
│   │   ├── api.js           # Serviço de API (PokeAPI)
│   │   └── app.js           # Aplicação principal
│   ├── icons/               # Ícones PWA
│   ├── index.html           # Página principal
│   ├── pokemon.html         # Página de detalhes
│   ├── 404.html             # Página de erro
│   ├── manifest.json        # PWA Manifest
│   └── sw.js                # Service Worker
│
├── pokedex/                 # Express.js Backend (Opcional)
│   ├── src/
│   │   ├── config/          # Configurações
│   │   ├── controllers/     # Controladores HTTP
│   │   ├── middlewares/     # Middlewares Express
│   │   ├── routes/          # Rotas da API
│   │   ├── services/        # Lógica de negócio
│   │   ├── types/           # Tipos TypeScript
│   │   ├── views/           # Templates EJS
│   │   └── app.ts           # Entry point
│   └── tests/               # Testes unitários e integração
│
└── .github/workflows/       # CI/CD Pipeline
```

---

## Static Site (GitHub Pages)

A versão estática é ideal para hospedagem gratuita no GitHub Pages. Consome a PokeAPI diretamente do navegador.

### Como funciona

1. **HTML/CSS/JS puro** - Sem necessidade de servidor
2. **PokeAPI** - Dados obtidos diretamente da API pública
3. **Cache Local** - SessionStorage para performance
4. **PWA** - Service Worker para funcionalidade offline

### Executar Localmente

```bash
# Opção 1: Python
cd docs
python -m http.server 8000
# Acesse: http://localhost:8000

# Opção 2: Node.js (npx)
npx serve docs
# Acesse: http://localhost:3000

# Opção 3: VS Code Live Server
# Instale a extensão "Live Server" e clique em "Go Live"
```

### Deploy no GitHub Pages

O deploy é automático via GitHub Actions quando você faz push para a branch `main`.

**Configuração manual (se necessário):**

1. Vá em **Settings** > **Pages** no seu repositório
2. Em **Source**, selecione **GitHub Actions**
3. O workflow `.github/workflows/ci.yml` fará o deploy automaticamente

---

## Express.js Backend (Opcional)

A versão backend é útil para desenvolvimento local com hot-reload e features avançadas.

### Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn

### Instalação

```bash
cd pokedex

# Instale as dependências
npm install

# Inicie em modo desenvolvimento
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

### Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia em modo desenvolvimento com hot-reload |
| `npm run build` | Compila TypeScript para produção |
| `npm start` | Inicia a aplicação compilada |
| `npm run lint` | Verifica problemas de código |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm test` | Executa os testes |
| `npm run test:watch` | Executa testes em modo watch |
| `npm run test:coverage` | Executa testes com cobertura |

### Endpoints da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista de Pokémon com paginação |
| GET | `/pokemon/:name` | Detalhes de um Pokémon |
| GET | `/search?query=` | Busca por nome ou número |
| GET | `/health` | Status da aplicação |

### Docker

```bash
# Produção
docker-compose up -d

# Desenvolvimento (com hot-reload)
docker-compose --profile dev up pokedex-dev
```

---

## Tecnologias

### Static Site
- **HTML5** - Estrutura semântica
- **CSS3** - Flexbox, Grid, variáveis CSS, animações
- **JavaScript ES6+** - Classes, Async/Await, Modules
- **PokeAPI** - API de dados Pokémon
- **PWA** - Service Worker, Web App Manifest

### Backend
- **[Express.js](https://expressjs.com/)** - Framework web
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[EJS](https://ejs.co/)** - Template engine
- **[Axios](https://axios-http.com/)** - Cliente HTTP
- **[Helmet](https://helmetjs.github.io/)** - Segurança HTTP
- **[Vitest](https://vitest.dev/)** - Framework de testes

---

## CI/CD Pipeline

O projeto usa GitHub Actions para:

1. **Lint & Typecheck** - Verifica qualidade do código
2. **Testes** - Executa testes unitários e de integração
3. **Build** - Compila TypeScript
4. **Security Audit** - Verifica vulnerabilidades
5. **Deploy** - Publica no GitHub Pages (branch main)

---

## Configuração

### Variáveis de Ambiente (Backend)

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3000` | Porta do servidor |
| `NODE_ENV` | `development` | Ambiente de execução |

---

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido com ❤️ por <strong>João Vitor Cunha dos Santos</strong>
  <br>
  RA: 21161106-2
</p>
