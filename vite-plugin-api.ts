import { loadEnv } from 'vite';
import type { Connect, Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Monta as rotas de `/api` no servidor de desenvolvimento do Vite.
 *
 * Na Vercel, os arquivos de `api/` viram funções automaticamente. Localmente o
 * Vite serve só o front-end, e sem isto o painel administrativo só funcionaria
 * depois de publicado — o pior momento para descobrir um erro.
 *
 * O handler carregado aqui é EXATAMENTE o mesmo que a Vercel executa. Não há
 * versão "de mentira" para o ambiente local.
 */

const lerCorpo = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const partes: Buffer[] = [];
    req.on('data', (c: Buffer) => partes.push(c));
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });

/** Converte a requisição do Node para o `Request` padrão que o handler espera. */
const paraRequest = async (req: IncomingMessage): Promise<Request> => {
  const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;
  const metodo = req.method ?? 'GET';
  const temCorpo = metodo !== 'GET' && metodo !== 'HEAD';

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(', '));
  }

  return new Request(url, {
    method: metodo,
    headers,
    body: temCorpo ? await lerCorpo(req) : undefined,
  });
};

const escrever = async (res: ServerResponse, resposta: Response): Promise<void> => {
  res.statusCode = resposta.status;
  resposta.headers.forEach((valor, chave) => res.setHeader(chave, valor));
  res.end(Buffer.from(await resposta.arrayBuffer()));
};

/** Rota → módulo que a exporta. */
const ROTAS: Record<string, string> = {
  '/api/admin/users': './api/admin/users.ts',
};

export const apiDevServer = (): Plugin => ({
  name: 'casa-pronta:api-dev-server',
  apply: 'serve',

  configureServer(server: ViteDevServer) {
    // O Vite carrega os arquivos .env em `import.meta.env`, que só existe no
    // código do navegador. O handler roda no servidor e lê `process.env` — que
    // na Vercel vem preenchido, mas aqui ficaria vazio. Sem esta ponte o
    // endpoint responderia 503 no desenvolvimento e funcionaria em produção,
    // que é a pior combinação possível para descobrir um erro.
    const env = loadEnv(server.config.mode, server.config.envDir ?? process.cwd(), '');
    for (const [chave, valor] of Object.entries(env)) {
      if (process.env[chave] === undefined) process.env[chave] = valor;
    }

    const middleware: Connect.NextHandleFunction = (req, res, next) => {
      const caminho = (req.url ?? '').split('?')[0] ?? '';
      const modulo = ROTAS[caminho];
      if (!modulo) return next();

      void (async () => {
        try {
          // `ssrLoadModule` aplica as transformações do Vite e recarrega a cada
          // edição — o handler fica com hot reload igual ao resto.
          const mod = (await server.ssrLoadModule(modulo)) as {
            default: (r: Request) => Promise<Response>;
          };
          await escrever(res, await mod.default(await paraRequest(req)));
        } catch (err) {
          server.config.logger.error(`[api] falha em ${caminho}: ${String(err)}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'Erro no servidor de desenvolvimento.' }));
        }
      })();
    };

    server.middlewares.use(middleware);
  },
});
