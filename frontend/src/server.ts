// ---- frontend server entry point ----

const [{ fileURLToPath }, { default: path }] = await Promise.all([import("node:url"), import("path")]);
const isMain = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? "");
if (!isMain) process.exit(0);





// ---- HTTPS / SSL configuration ----

// PORT — fixed internal container port (host mapping via docker-compose)
const PORT = 443;
const keyPath  = process.env.SSL_KEY_PATH;
const certPath = process.env.SSL_CERT_PATH;

// !keyPath || !certPath → SSL config missing, fatal
if (!keyPath || !certPath) throw new Error("FATAL: SSL_KEY_PATH and SSL_CERT_PATH are required");

const { default: fs } = await import("fs");
const https = await import("https");
const distDir = path.join(process.cwd(), "dist");





// ---- MIME types ----

const MIME: Record<string,string> = {
	".html":"text/html", ".css":"text/css", ".js":"application/javascript",
	".mjs":"application/javascript", ".json":"application/json",
	".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg",
	".webp":"image/webp", ".svg":"image/svg+xml", ".ico":"image/x-icon",
	".woff":"font/woff", ".woff2":"font/woff2",
};
const mimeType = (fp: string) => MIME[path.extname(fp).toLowerCase()] ?? "application/octet-stream";





// ---- backend proxy config ----

const BACKEND_HOST = "backend";
const BACKEND_PORT = "3000";



// ---- rate limiter ----

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_STATIC = 600;          // 600 requests/min for static files
const RATE_MAX_API    = 600;          // 600 requests/min for proxied API calls
const ipHits = new Map<string, number[]>();

function rateLimit(ip: string, max: number): boolean {
	const now = Date.now();
	const cutoff = now - RATE_WINDOW_MS;
	let hits = ipHits.get(ip);
	if (!hits) {
		ipHits.set(ip, [now]);
		return true;
	}
	// evict stale entries
	hits = hits.filter(t => t > cutoff);
	hits.push(now);
	ipHits.set(ip, hits);
	return hits.length <= max;
}

// periodic cleanup — purge stale IP entries every 2 minutes
setInterval(() => {
	const cutoff = Date.now() - RATE_WINDOW_MS;
	for (const [ip, hits] of ipHits) {
		const fresh = hits.filter(t => t > cutoff);
		if (fresh.length) ipHits.set(ip, fresh);
		else ipHits.delete(ip);
	}
}, 120_000).unref();





// ---- proxy helpers ----

function readBody(req: any): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on("data", (chunk: Buffer) => chunks.push(chunk));
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

function proxyToBackend(req: any, res: any, apiPath: string) {
	const opts = {
		method: req.method,
		headers: req.headers,
		rejectUnauthorized: false,
	};
	const proxyReq = https.request(`https://${BACKEND_HOST}:${BACKEND_PORT}${apiPath}`, opts, (proxyRes: any) => {
		const chunks: Buffer[] = [];
		proxyRes.on("data", (chunk: Buffer) => chunks.push(chunk));
		proxyRes.on("end", () => {
			const headers: Record<string, string> = {};
			for (const key of Object.keys(proxyRes.headers)) {
				const val = proxyRes.headers[key];
				if (val && key.toLowerCase() !== "transfer-encoding") headers[key] = val;
			}
			res.writeHead(proxyRes.statusCode, headers);
			res.end(Buffer.concat(chunks));
		});
	});
	proxyReq.on("error", () => { res.writeHead(502); res.end("Bad Gateway"); });
	readBody(req).then(body => { proxyReq.write(body); proxyReq.end(); }).catch(() => proxyReq.end());
}





// ---- create server ----

// createServer — HTTPS server with proxy + static file serving + rate limiting
const server = https.createServer(
	{ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
	async (req, res) => {
		// extract client IP (respect X-Forwarded-For in Docker network)
		const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
			|| req.socket.remoteAddress
			|| "127.0.0.1";
		const reqUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
		const isApiPath = reqUrl.pathname.startsWith("/api/") || reqUrl.pathname.startsWith("/uploads/");

		// rate-limit: different limits for API vs static paths
		if (!rateLimit(ip, isApiPath ? RATE_MAX_API : RATE_MAX_STATIC)) {
			res.writeHead(429, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "error.tooManyRequests" }));
			return;
		}

		// /api/ or /uploads/ → proxy to backend
		if (isApiPath) {
			proxyToBackend(req, res, reqUrl.pathname + reqUrl.search);
			return;
		}
		// static file serving — resolve path inside distDir
		const resolved = path.resolve(distDir, "." + reqUrl.pathname);
		if (!resolved.startsWith(distDir + path.sep) && resolved !== distDir) {
			res.writeHead(403); res.end("Forbidden"); return;
		}
		const filePath = path.extname(resolved) ? resolved : path.join(distDir, "index.html");
		try {
			const data = await fs.promises.readFile(filePath);
			res.writeHead(200, { "Content-Type": mimeType(filePath) }); res.end(data);
		} catch { res.writeHead(404); res.end("Not Found"); }
	},
);





// ---- listen ----

// listen — start HTTPS server on all interfaces
server.listen(PORT, "0.0.0.0", () => console.log(`Frontend -> https://0.0.0.0:${PORT}`));





// shutdown — gracefully close server
process.on("SIGTERM", () => { server.close(); process.exit(0); });
process.on("SIGINT",  () => { server.close(); process.exit(0); });
