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

// createServer — HTTPS server with proxy + static file serving
const server = https.createServer(
	{ key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
	async (req, res) => {
		const reqUrl = new URL(req.url ?? "/", `https://${req.headers.host ?? "localhost"}`);
		// /api/ or /uploads/ → proxy to backend
		if (reqUrl.pathname.startsWith("/api/") || reqUrl.pathname.startsWith("/uploads/")) {
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
