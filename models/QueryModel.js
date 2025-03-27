const Database = require('better-sqlite3');
const dbPath = "./blindml.db";

class QueryModel {
    constructor() {
        try {
            this.db = new Database(dbPath);
            this.db.exec("PRAGMA foreign_keys = ON;");
        } catch (err) {
            console.error("Database opening error:", err.message);
        }
    }

    runQuery(query) {
        try {
            this.db.exec(query);
        } catch (err) {
            console.error("Query execution error:", err.message);
            throw err;
        }
    }

    prepareQuery(query, params) {
        try {
            const stmt = this.db.prepare(query);
            stmt.run(params);
        } catch (err) {
            console.error("Prepared query error:", err.message);
            throw err;
        }
    }

    prepareLikeAll(query, searchQuery) {
        try {
            const likeQuery = `${searchQuery}%`;
            const stmt = this.db.prepare(query);
            const rows = stmt.all([likeQuery]);
            return rows;
        } catch (err) {
            console.error("Prepared LIKE query error:", err.message);
            throw err;
        }
    }

    insertQuery(query, params) {
        try {
            const stmt = this.db.prepare(query);
            const info = stmt.run(params);
            return info.lastInsertRowid;
        } catch (err) {
            console.error("Insert query error:", err.message);
            throw err;
        }
    }

    updateQuery(query, params) {
        try {
            const stmt = this.db.prepare(query);
            stmt.run(params);
        } catch (err) {
            console.error("Update query error:", err.message);
            throw err;
        }
    }

    selectQuery(sql, params) {
        try {
            const stmt = this.db.prepare(sql);
            const row = stmt.get(params);
            return row;
        } catch (err) {
            console.error("Select query error:", err.message);
            throw err;
        }
    }

    selectAllQuery(sql, params) {
        try {
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(params);
            return rows;
        } catch (err) {
            console.error("Select all query error:", err.message);
            throw err;
        }
    }

    beginTransaction() {
        try {
            this.db.exec('BEGIN TRANSACTION');
        } catch (err) {
            console.error("Transaction start error:", err.message);
            throw err;
        }
    }

    rollbackTransaction() {
        try {
            this.db.exec('ROLLBACK');
        } catch (err) {
            console.error("Transaction rollback error:", err.message);
            throw err;
        }
    }

    commitTransaction() {
        try {
            this.db.exec('COMMIT');
        } catch (err) {
            console.error("Transaction commit error:", err.message);
            throw err;
        }
    }
}

module.exports = QueryModel;
