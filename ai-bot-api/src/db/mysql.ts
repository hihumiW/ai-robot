import mysql from "mysql2/promise";
import { config } from "../config/env.js";

// 第一步：创建 MySQL 连接池，避免每次请求都重新建立数据库连接。
export const mysqlPool = mysql.createPool({
  host: config.dbHost,
  port: config.dbPort,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  waitForConnections: true,
  connectionLimit: config.dbConnectionLimit,
  charset: "utf8mb4",
});

