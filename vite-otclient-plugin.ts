import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Dev-only bridge that exposes a local OTClient installation to the editor.
 *
 * Mount points:
 *   GET /otclient-api/info            -> { available, root }
 *   GET /otclient-api/list?path=data  -> { entries: [{ name, path, kind }] }
 *   GET /otclient-fs/<relative path>  -> raw file bytes
 *
 * The root is resolved from OTCLIENT_PATH (env) or the sibling `../otclient`
 * folder. All requests are confined to that root.
 */

const API_PREFIX = "/otclient-api/";
const FS_PREFIX = "/otclient-fs/";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".otui": "text/plain; charset=utf-8",
  ".otfont": "text/plain; charset=utf-8",
  ".otml": "text/plain; charset=utf-8",
  ".lua": "text/plain; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export function resolveOTClientRoot(projectRoot: string): string | null {
  const candidates = [
    process.env.OTCLIENT_PATH,
    path.resolve(projectRoot, "..", "otclient"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fs.existsSync(path.join(resolved, "data", "styles"))) return resolved;
  }
  return null;
}

/** Resolves a request path inside `root`, returning null on traversal attempts. */
function safeJoin(root: string, relative: string): string | null {
  const decoded = decodeURIComponent(relative).replace(/\\/g, "/");
  if (decoded.includes("\0")) return null;
  const target = path.resolve(root, "." + path.posix.resolve("/", decoded));
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(rootWithSep)) return null;
  return target;
}

function sendJson(res: import("node:http").ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(payload);
}

export function otclientAssetsPlugin(): Plugin {
  let root: string | null = null;

  return {
    name: "otclient-assets-bridge",
    apply: "serve",
    configResolved(config) {
      root = resolveOTClientRoot(config.root);
      if (root) {
        config.logger.info(`[otclient] serving client assets from ${root}`);
      } else {
        config.logger.warn(
          "[otclient] no OTClient installation found (set OTCLIENT_PATH to enable the asset bridge)",
        );
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        const isApi = url.startsWith(API_PREFIX);
        const isFs = url.startsWith(FS_PREFIX);
        if (!isApi && !isFs) return next();

        if (!root) {
          return sendJson(res, 503, { error: "otclient-root-not-configured" });
        }

        const parsed = new URL(url, "http://localhost");

        if (isApi) {
          const action = parsed.pathname.slice(API_PREFIX.length);

          if (action === "info") {
            return sendJson(res, 200, { available: true, root });
          }

          if (action === "list") {
            const rel = parsed.searchParams.get("path") ?? "";
            const dir = safeJoin(root, rel);
            if (!dir) return sendJson(res, 400, { error: "invalid-path" });
            try {
              const entries = fs.readdirSync(dir, { withFileTypes: true }).map((e) => ({
                name: e.name,
                path: path.posix.join(rel.replace(/\\/g, "/"), e.name).replace(/^\/+/, ""),
                kind: e.isDirectory() ? "directory" : "file",
              }));
              return sendJson(res, 200, { entries });
            } catch {
              return sendJson(res, 404, { error: "not-found" });
            }
          }

          return sendJson(res, 404, { error: "unknown-action" });
        }

        const file = safeJoin(root, parsed.pathname.slice(FS_PREFIX.length));
        if (!file) return sendJson(res, 400, { error: "invalid-path" });

        let stat: fs.Stats;
        try {
          stat = fs.statSync(file);
        } catch {
          res.statusCode = 404;
          return res.end("Not found");
        }
        if (!stat.isFile()) {
          res.statusCode = 404;
          return res.end("Not found");
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream");
        res.setHeader("Content-Length", String(stat.size));
        res.setHeader("Cache-Control", "no-cache");
        if (req.method === "HEAD") return res.end();
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}
