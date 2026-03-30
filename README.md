# Harpa Cristã Online

Todos os 640 hinos da Harpa Cristã em uma aplicação web leve, rápida e offline-first.

**[Acesse aqui](https://chicomcastro.github.io/harpa-crista-online/)**

## Funcionalidades

- **Busca completa** — por título, número ou conteúdo da letra
- **Favoritos** — salve seus hinos mais usados (persistidos no navegador)
- **Modo escuro** — com detecção automática da preferência do sistema
- **Offline** — funciona sem internet após o primeiro acesso (PWA)
- **Navegação entre hinos** — botões anterior/próximo e atalhos de teclado (setas)
- **Ajuste de fonte** — controle o tamanho do texto na leitura
- **Compartilhamento** — via Web Share API ou cópia para área de transferência
- **Copiar letra** — copia o texto formatado do hino para a área de transferência
- **Player de áudio** — reprodução do hino com áudio externo (quando disponível)
- **Responsivo** — funciona em celular, tablet e desktop

## Stack

- [SvelteKit](https://kit.svelte.dev/) + [Svelte 5](https://svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- Deploy estático no [GitHub Pages](https://pages.github.com/)

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

## Estrutura

```
src/
├── lib/
│   ├── stores.js      # Favoritos, dark mode, tamanho de fonte
│   ├── utils.js        # Parse de versos, highlight, compartilhamento
│   └── songs.json      # Gerado automaticamente no build
├── routes/
│   ├── +page.svelte    # Listagem e busca de hinos
│   └── song/[id]/      # Detalhe do hino
data/                    # 639 arquivos .txt com as letras
scripts/
└── generate-songs.js   # Converte .txt → songs.json
```

Os hinos são armazenados como arquivos `.txt` em `data/` e compilados em um único JSON no build, eliminando a necessidade de servidor ou banco de dados.

## Licença

Os textos dos hinos pertencem à Casa Publicadora das Assembleias de Deus (CPAD).
