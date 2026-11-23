import "dotenv/config";
import path from "path";
import fs from "fs";
import express from "express";
import { createApiGateway } from "./src/server/apiGateway";

async function startServer() {
  const PORT = parseInt(process.env.DEFAULT_APP_PORT || "3000", 10);
  const app = createApiGateway();

  // Vite middleware for development or static serving for production
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (typeof __filename !== "undefined" && __filename.endsWith(".cjs")) ||
    Boolean(process.argv[1] && process.argv[1].endsWith(".cjs"));

  if (!isProduction) {
    console.log("[N-LINK 360] Starting in Vite dynamic development mode with middlewares...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[N-LINK 360] Starting in production static serving mode from dist...");
    const distPath = fs.existsSync(path.join(process.cwd(), "dist", "index.html"))
      ? path.join(process.cwd(), "dist")
      : fs.existsSync(path.join(__dirname, "index.html"))
        ? __dirname
        : path.join(process.cwd(), "dist");

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ success: false, error: "API route not found." });
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.sendFile(path.join(process.cwd(), "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`N-LINK 360 Backend API Gateway running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("FATAL ERROR during server startup:", err);
  process.exit(1);
});
