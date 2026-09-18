# Chat Livre AI V4

## Estrutura

- index.html
- firestore.rules
- firebase-config.example.js
- vercel.json
- .env.example
- api/chat.js
- api/image.js

## Vercel

Configure estas Environment Variables na Vercel:

- GEMINI_API_KEY
- OPENROUTER_API_KEY
- POLLINATIONS_API_KEY

Não coloque as chaves diretamente no index.html ou no GitHub.

## Firebase

Ative Authentication > Google e publique o conteúdo de firestore.rules no Firestore Rules.

O index.html usa a configuração Web do Firebase no próprio frontend.
