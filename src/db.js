import mysql from "mysql2/promise";

const REQUIRED_DB_ENV_VARS = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];

function getMissingDatabaseEnvVars() {
  return REQUIRED_DB_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  return pool;
}

export async function query(sql, params = []) {
  const missingEnvVars = getMissingDatabaseEnvVars();
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Database configuration is missing required environment variables: ${missingEnvVars.join(", ")}`
    );
  }

  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export { getPool };
