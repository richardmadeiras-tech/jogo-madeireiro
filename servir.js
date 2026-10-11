import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('.', import.meta.url));
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};
const porta = Number(process.env.PORT) || 8080;

createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const arquivo = normalize(join(raiz, caminho === '/' ? 'index.html' : caminho));
  if (!arquivo.startsWith(raiz)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, {
      'Content-Type': tipos[extname(arquivo)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(dados);
  } catch {
    res.writeHead(404).end('não encontrado');
  }
}).listen(porta, () => console.log(`http://localhost:${porta}`));
