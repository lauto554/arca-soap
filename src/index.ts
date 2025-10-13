import "colors";
import { initializeDatabase, closeDatabaseConnection } from "./modules/database/db-init";
import { createServer, startServer } from "./server";

const PORT: number = parseInt(process.env.PORT || "3000");

async function startApplication(): Promise<void> {
  try {
    // 1. Inicializar base de datos
    await initializeDatabase();

    // 2. Crear servidor Express
    const app = createServer();

    // 3. Iniciar servidor
    startServer(app, PORT);
  } catch (error) {
    console.error("Error al iniciar la aplicación:".red, error);
    process.exit(1);
  }
}

async function gracefulShutdown(): Promise<void> {
  console.log("Cerrando aplicación...".yellow);
  await closeDatabaseConnection();
  process.exit(0);
}

// Manejo de señales de cierre
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Iniciar la aplicación
startApplication();
