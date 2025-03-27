const Database = require('better-sqlite3');
const db = new Database('./blindml.db');

// 외래 키 제약조건 활성화
function enableForeignKeyConstraint() {
    try {
        db.exec("PRAGMA foreign_keys = ON");
        console.log("Foreign key constraint enabled.");
    } catch (err) {
        console.error("Failed to enable foreign keys:", err.message);
        throw err;
    }
}

// 테이블 생성
function createTables() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS security (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(50),
            level INTEGER,
            desc VARCHAR(50)
        )`,
        `CREATE TABLE IF NOT EXISTS role (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT DEFAULT NULL,
            role TEXT DEFAULT NULL,
            position TEXT DEFAULT NULL,
            organization TEXT DEFAULT NULL,
            desc TEXT DEFAULT NULL,
            insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT DEFAULT NULL,
            message TEXT DEFAULT NULL,
            detail TEXT DEFAULT NULL,
            user_id INTEGER DEFAULT NULL,
            insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            profile TEXT,
            email VARCHAR(50),
            nickname VARCHAR(50),
            desc TEXT,
            token TEXT,
            apikey TEXT,
            social MEDIUMTEXT,
            role INTEGER DEFAULT 1,
            security INTEGER DEFAULT 5,
            insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(security) REFERENCES security(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
            FOREIGN KEY(role) REFERENCES role(id) ON UPDATE RESTRICT ON DELETE RESTRICT
        )`,
        `CREATE TABLE IF NOT EXISTS container (
            id VARCHAR(50) PRIMARY KEY,
            realid VARCHAR(50),
            name VARCHAR(50),
            desc VARCHAR(50),
            cpu DOUBLE,
            ram DOUBLE,
            gpu_enabled TINYINT,
            env LONGTEXT,
            model INTEGER,
            endpoint MEDIUMTEXT,
            readme LONGTEXT,
            owner INTEGER,
            visibility VARCHAR(50),
            security INTEGER,
            tags VARCHAR(50),
            version VARCHAR(50),
            status_code INTEGER,
            port INTEGER,
            insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deploy_time TIMESTAMP,
            FOREIGN KEY(security) REFERENCES security(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
            FOREIGN KEY(owner) REFERENCES user(id) ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY(model) REFERENCES model(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS user_container (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            container_id VARCHAR(50),
            user_id INTEGER,
            is_owner INTEGER,
            insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (container_id) REFERENCES container(id) ON UPDATE CASCADE ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES user(id) ON UPDATE CASCADE ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS user_blacklist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            container_id VARCHAR(50),
            user_id INTEGER,
            insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(container_id) REFERENCES container(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS user_whitelist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            container_id VARCHAR(50),
            user_id INTEGER,
            insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(container_id) REFERENCES container(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS model (
            id INTEGER PRIMARY KEY,
            container_id VARCHAR(50),
            name TEXT,
            fhe_lib TEXT,
            fhe_lib_version TEXT,
            requirements TEXT,
            data TEXT,
            insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (container_id) REFERENCES container (id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS container_status(
            name VARCHAR(50) PRIMARY KEY,
            code INTEGER,
            description VARCHAR(50),
            insert_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  
            update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (const query of queries) {
        db.exec(query);
    }

    console.log('Tables created successfully.');
}

// 초기 데이터 삽입
function insertInitialData() {
    const securityData = [
        { id: 1, name: 'S1', level: 1, desc: 'The highest security level.' },
        { id: 2, name: 'S2', level: 2, desc: 'The second highest security level.' },
        { id: 3, name: 'S3', level: 3, desc: 'The third highest security level.' },
        { id: 4, name: 'S4', level: 4, desc: 'The fourth highest security level.' },
        { id: 5, name: 'S5', level: 5, desc: 'The lowest security level.' }
    ];

    const roleData = [
        { id: 1, title: 'Admin', role: 'System Admin', position: 'Administrator', organization: 'BlindML', desc: '-' },
        { id: 2, title: 'CTO', role: 'Developer', position: 'Tech Leader', organization: 'BlindML', desc: 'This is CTO' },
        { id: 3, title: 'Staff', role: 'Developer', position: 'Tech Member', organization: 'BlindML', desc: 'This is staff' },
        { id: 4, title: 'Unknown', role: 'User', position: 'Unknown', organization: '3rd Party', desc: 'This is 3rd party member' }
    ];

    const statusData = [
        { name: "NO_DOCKER", code : -100, description: "Docker installation or start is required."},
        { name: "READY", code : 0, description: "Ready for service."},
        { name: "BUILDING_IMAGE", code : 200, description: "Docker image is being built."},
        { name: "BUILD_IMAGE_FINISH", code : 210, description: "The docker image has been successfully built."},
        { name: "BUILD_IMAGE_ERROR", code : -200, description: "Failed to create docker image."},
        { name: "CREATING_CONTAINER", code : 300, description: "Container is being created."},
        { name: "CREATE_CONTAINER_FINISH", code : 310, description: "The container has been successfully created."},
        { name: "CREATE_CONTAINER_ERROR", code : -300, description: "Failed to create container."},
        { name: "RUNNING", code : 500, description: "Container is running."},
        { name: "STOPPED", code : 400, description: "Container is stopped."},
        { name: "RUNNING_ERROR", code : -500, description: "Unknown error has been occured."}
    ];

    for (const item of securityData) {
        db.prepare("INSERT OR IGNORE INTO security (id, name, level, desc) VALUES (?, ?, ?, ?)").run(item.id, item.name, item.level, item.desc);
    }

    for (const item of roleData) {
        db.prepare("INSERT OR IGNORE INTO role (id, title, role, position, organization, desc) VALUES (?, ?, ?, ?, ?, ?)").run(
            item.id, item.title, item.role, item.position, item.organization, item.desc
        );
    }

    for (const item of statusData) {
        db.prepare("INSERT OR IGNORE INTO container_status (name, code, description) VALUES (?, ?, ?)").run(item.name, item.code, item.description);
    }

    console.log('Initial data inserted successfully.');
}

// 애플리케이션 시작
function initializeDatabase() {
    try {
        enableForeignKeyConstraint();
        createTables();
        insertInitialData();
    } catch (error) {
        console.error('Database initialization failed:', error);
    }
}

module.exports = {
    initializeDatabase
};
