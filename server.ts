import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./src/server/router";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // tRPC adapter for Hono-like fetch handling
  app.use("/api/trpc", (req, res) => {
    // In a real app, we'd extract the user from the JWT here
    // For this demo, we'll simulate a user context if a specific header is present
    const authHeader = req.headers.authorization;
    let user = undefined;
    
    if (authHeader === "Bearer admin-token") {
      user = { uid: "admin-uid", role: "admin" as const };
    } else if (authHeader === "Bearer user-token") {
      user = { uid: "user-uid", role: "user" as const };
    }

    fetchRequestHandler({
      endpoint: "/api/trpc",
      req: new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: req.headers as any,
        body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
      }),
      router: appRouter,
      createContext: () => ({ user }),
    }).then(async (response) => {
      res.status(response.status);
      const data = await response.json();
      res.json(data);
    });
  });

  // API health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
}

startServer();