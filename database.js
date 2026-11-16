import sqlite3 from "sqlite3";
import fs from "fs";

if (!fs.existsSync("./database")) {

    fs.mkdirSync("./database");

}

const db = new sqlite3.Database("./database/agrocare.db");

/* ============================================
# TẠO BẢNG LỊCH SỬ
============================================ */

db.serialize(() => {

    db.run(`

        CREATE TABLE IF NOT EXISTS history(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            image TEXT,

            disease TEXT,

            solution TEXT,

            level TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )

    `);

});

db.serialize(() => {

    db.run(`

        CREATE TABLE IF NOT EXISTS reviews(

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            name TEXT NOT NULL,

            star INTEGER NOT NULL,

            content TEXT NOT NULL,

            likes INTEGER DEFAULT 0,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )

    `);

});

export default db;