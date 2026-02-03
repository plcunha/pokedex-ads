# Pokédex Pro 🎮

Uma Pokédex moderna e profissional construída com **Express.js** e **TypeScript**.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- 🎨 **UI Moderna** - Design escuro elegante com animações suaves
- ⚡ **Performance** - Cache inteligente e compressão de respostas
- 🔒 **Segurança** - Helmet, rate limiting e sanitização de entrada
- 📱 **Responsivo** - Funciona perfeitamente em todos os dispositivos
- 🔍 **Busca Inteligente** - Busca por nome ou número do Pokémon
- 📊 **Estatísticas Visuais** - Barras animadas para stats do Pokémon
- 🎯 **TypeScript** - Tipagem forte para código mais seguro

## 🏗️ Arquitetura

```
src/
├── config/           # Configurações da aplicação
├── controllers/      # Controladores HTTP
├── middlewares/      # Middlewares Express
├── routes/           # Definições de rotas
├── services/         # Lógica de negócio e API
├── types/            # Definições TypeScript
├── views/            # Templates EJS
└── app.ts            # Entry point
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn

### Instalação

```bash
# Clone o repositório
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

## 🛠️ Tecnologias

- **[Express.js](https://expressjs.com/)** - Framework web
- **[TypeScript](https://www.typescriptlang.org/)** - Tipagem estática
- **[EJS](https://ejs.co/)** - Template engine
- **[Axios](https://axios-http.com/)** - Cliente HTTP
- **[Helmet](https://helmetjs.github.io/)** - Segurança HTTP
- **[PokeAPI](https://pokeapi.co/)** - API de dados Pokémon

## 📁 Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista de Pokémon com paginação |
| GET | `/pokemon/:name` | Detalhes de um Pokémon |
| GET | `/search?query=` | Busca por nome ou número |
| GET | `/health` | Status da aplicação |

## ⚙️ Configuração

A aplicação pode ser configurada via variáveis de ambiente:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `3000` | Porta do servidor |
| `NODE_ENV` | `development` | Ambiente de execução |

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido com ❤️ por <strong>João Vitor Cunha dos Santos</strong>
  <br>
  RA: 21161106-2
</p>
