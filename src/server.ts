import express, { Request, Response, Application, NextFunction } from "express";
import router from "./router";
import "colors";
import { ResponseModel } from "./backend-resources/models/Response";

export function createServer(): Application {
  const app: Application = express();

  // Middleware básico
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Middleware de logging personalizado con colors
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`.blue);
    next();
  });

  // Usar las rutas del router
  app.use("/", router);

  // Manejo de rutas no encontradas
  app.use("*", (req: Request, res: Response) => {
    const response = ResponseModel.create("error", 404, "Ruta no encontrada", {
      path: req.originalUrl,
      method: req.method,
    });

    res.json(response);
  });

  // Manejo de errores global
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const response = ResponseModel.create(
      "error",
      500,
      `Error interno del servidor ${err.message}`
    );

    res.status(500).json(response);
  });

  return app;
}

export function startServer(app: Application, port: number): void {
  app.listen(port, () => {
    console.log(`--------------------------------------`.red);
    console.log(`Servidor ejecutándose en puerto ${port}`.red);
    console.log(`--------------------------------------`.red);
    console.log(`Environment: ${process.env.NODE_ENV}`.blue);
  });
}
