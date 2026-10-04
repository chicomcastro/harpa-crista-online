import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html'
		}),
		paths: {
			// O site mora em chicomcastro.github.io/harpa-crista-online, daí o prefixo no build.
			// BASE_PATH='' permite servir o build de produção na raiz — é o que o `vite preview`
			// faz, e sem isso os testes visuais pegariam 404 em todo asset.
			base: process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/harpa-crista-online' : '')
		}
	}
};

export default config;
