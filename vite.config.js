import { defineConfig } from "vitest/config";
import { sveltekit } from '@sveltejs/kit/vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Dev-only middleware: POST /api/admin/save-links writes data/links.json.
 * Never active in a production build because the adapter doesn't use the
 * dev server — the plugin only runs via `vite dev`.
 */
function adminLinkSaver() {
    return {
        name: 'admin-link-saver',
        configureServer(server) {
            server.middlewares.use('/api/admin/save-links', (req, res) => {
                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    res.end('Method Not Allowed');
                    return;
                }
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        if (typeof data !== 'object' || data === null) throw new Error('Invalid JSON');
                        const outPath = path.join('data', 'links.json');
                        fs.mkdirSync(path.dirname(outPath), { recursive: true });
                        fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ ok: true, count: Object.keys(data).length }));
                    } catch (err) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ ok: false, error: String(err) }));
                    }
                });
            });
        }
    };
}

export default defineConfig({
    plugins: [sveltekit(), adminLinkSaver()],

    server: {
        fs: {
            allow: ['data']
        },
        watch: {
            ignored: ['**/data/links.json', '**/data/candidates.json']
        }
    },

    test: {
        include: ['src/**/*.{test,spec}.{js,ts}']
    }
});
