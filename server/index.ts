import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { CertificateTemplateService } from './services/certificateTemplateService';
import { DatabaseMigrations } from './database-migrations';
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';

const app = express();
app.set('etag', false);

// Sentry
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  app.use(Sentry.Handlers.requestHandler());
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Run database migrations first
    log('🚀 Starting BrainBased EMDR Platform...');
    await DatabaseMigrations.runMigrations();
    
    // Setup certificate template service
    await CertificateTemplateService.ensureFile();
    
    // Register API routes
    const server = await registerRoutes(app);

    // Error handling middleware
    if (process.env.SENTRY_DSN) {
      app.use(Sentry.Handlers.errorHandler());
    }
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // Setup Vite middleware AFTER API routes are registered
    if (app.get("env") === "development") {
      // In development, only serve API routes, let Vite handle frontend
      log('🔧 Development mode: API-only server on port 5000');
      log('🔧 Frontend served by Vite on port 5173');
    } else {
      // In production, serve both API and static frontend
      serveStatic(app);
    }

    // ALWAYS serve the API on the port specified in the environment variable PORT
    // In development, this is API-only. In production, this serves both API and client.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🎉 BrainBased EMDR Platform API running on port ${port}`);
      if (app.get("env") === "development") {
        log(`🔧 Frontend: http://localhost:5173 (Vite dev server)`);
        log(`🔧 Backend: http://localhost:${port} (API only)`);
      } else {
        log(`🚀 Production: Full-stack server on port ${port}`);
      }
      log(`📧 SendGrid Email: ${process.env.SENDGRID_API_KEY ? '✅ Configured' : '❌ Not Configured'}`);
      log(`📱 Twilio SMS: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Not Configured'}`);
      log(`🎥 Twilio Video: ${process.env.TWILIO_API_KEY ? '✅ Configured' : '❌ Not Configured'}`);
    });
  } catch (error) {
    log(`❌ Server startup failed: ${error}`);
    process.exit(1);
  }
})();
