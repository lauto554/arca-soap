import { DatabasePgODBC, DatabaseConfig } from "../../backend-resources/models/DatabasePgODBC";
import dotenv from "dotenv";

dotenv.config();

export async function initializeDatabase(): Promise<void> {
  try {
    const config: DatabaseConfig = {
      driver: process.env.DRIVER!,
      dbname: process.env.DBNAME!,
      uid: process.env.UID!,
      password: process.env.PASS!,
    };

    await DatabasePgODBC.connect(config);

    console.log("==============================================================".yellow);
    console.log("DB Conectada".yellow);
    await DatabasePgODBC.testConnection();
    console.log("==============================================================".yellow);
  } catch (error) {
    console.error("Error al inicializar la base de datos:".red, error);
    throw error;
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  try {
    await DatabasePgODBC.close();
  } catch (error) {
    console.error("Error cerrando conexión:".red, error);
  }
}

export { DatabasePgODBC };
