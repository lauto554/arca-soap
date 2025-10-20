import dotenv from "dotenv";
import { initializeDatabase, closeDatabaseConnection } from "./modules/database/db-init";
import { startServer } from "./server";
import "colors";

dotenv.config();
const PORT: number = parseInt(process.env.PORT || "3000");

async function startApplication(): Promise<void> {
  try {
    startServer(PORT);

    await initializeDatabase();
  } catch (error) {
    console.error("Error al iniciar la aplicación:".red, error);
    process.exit(1);
  }
}

async function shutDownApplication(): Promise<void> {
  await closeDatabaseConnection();
  process.exit(0);
}

// Manejo de señales de cierre
process.on("SIGINT", shutDownApplication);
process.on("SIGTERM", shutDownApplication);

// Iniciar la aplicación
startApplication();
