// server/index.js
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const configPath = path.join(publicDir, 'config.yaml');

const app = Fastify({ logger: true });

const fileExtensionFilter = {
	covers: /\.(jpg|jpeg|webp|avif|png|gif|bmp)$/i,
	subs: /\.vtt$/i,
	file: /.*/,
}

// 1. Load config.yaml and resolve mediaFolder
let musicDir = path.join(publicDir, 'music'); // fallback default

async function loadConfig() {
	try {
		const yamlRaw = await fs.readFile(configPath, 'utf8');
		const config = loadYaml(yamlRaw);

		if (config && typeof config.mediaFolder === 'string') {
			// Resolve mediaFolder relative to rootDir
			musicDir = path.resolve(rootDir, config.mediaFolder.replace(/^\/+/, ''));
			app.log.info(`mediaFolder set to: ${musicDir}`);
		}
	} catch (err) {
		app.log.warn(`Failed to load config.yaml: ${err.message}`);
	}
}

await loadConfig();

// Serve entire /public as root
app.register(fastifyStatic, {
	root: publicDir,
	prefix: '/',             // makes index.html available at /
	index: ['index.html'],
});

app.get('/music/*', async (request, reply) => {
	try {
		// Extract requested path
		const rawPath = request.params['*'] || '';
		const decodedPath = decodeURIComponent(rawPath);
		const safeSubPath = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '');

		const targetPath = path.join(musicDir, safeSubPath);
		const stat = await fs.stat(targetPath);

		if (stat.isFile()) {
			// Send the file (with correct headers)
			return reply.sendFile(safeSubPath, musicDir); // Fastify Static will stream the file
		}

		if (!stat.isDirectory()) {
			return reply.code(404).send({ error: 'Not a file or directory' });
		}

		// Handle directory listing
		const entries = await fs.readdir(targetPath, { withFileTypes: true });

		const dirs = [], files = [], imgs = [], subs = [];

		for (const entry of entries) {
			const name = entry.name;
			if (entry.isDirectory()) {
				dirs.push({ name });
			} else if (entry.isFile()) {
				if (name.match(fileExtensionFilter.covers)) imgs.push({ name });
				else if (name.match(fileExtensionFilter.subs)) subs.push({ name });
				if (name.match(fileExtensionFilter.file) && !name.startsWith('.')) files.push({ name });
			}
		}

		reply.type('application/json').send({ dirs, files, imgs, subs });

	} catch (err) {
		if (err.code === 'ENOENT') {
			reply.code(404).send({ error: 'Not found' });
		} else {
			app.log.error(err);
			reply.code(500).send({ error: 'Internal server error' });
		}
	}
});

// Start server
app.listen({ port: 8080 }, err => {
	if (err) {
		app.log.error(err);
		process.exit(1);
	}
});
