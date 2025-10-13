import { Database, DatabaseConfig } from "../../backend-resources/models/Database";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

/**
 * Inicializa la conexión a la base de datos utilizando la clase Database del submódulo
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Construir configuración desde variables de entorno
    const config: DatabaseConfig = {
      driver: process.env.DRIVER || "PostgreSQL ODBC Driver(ANSI)",
      dbname: process.env.DBNAME || "localhost:5432/postgres",
      uid: process.env.UID || "postgres",
      password: process.env.PASS || "postgres",
      charset: "UTF8",
    };

    // Conectar usando la clase Database del submódulo
    await Database.connect(config);

    console.log("------------------------------------------------".green);
    console.log("Base de datos conectada exitosamente".green);
    console.log("------------------------------------------------".green);

    // Realizar un test básico
    await testDatabaseConnection();
  } catch (error) {
    console.error("Error al inicializar la base de datos:".red, error);
    throw error;
  }
}

/**
 * Prueba la conexión ejecutando una consulta simple
 */
async function testDatabaseConnection(): Promise<void> {
  try {
    const result = await Database.query("SELECT version() as version, now() as current_time");

    if (result && result.length > 0) {
      const row = result[0] as any;
      console.log(`   PostgreSQL Version: ${row.version}`.gray);
      console.log(`   Hora actual: ${row.current_time}`.gray);
    }
  } catch (error) {
    console.error("Error en test de conexión:".red, error);
    throw error;
  }
}

/**
 * Cierra la conexión a la base de datos
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await Database.close();
    console.log("Conexión a base de datos cerrada".yellow);
  } catch (error) {
    console.error("Error cerrando conexión:".red, error);
  }
}

// Exportar la clase Database para uso en otras partes de la app
export { Database };
