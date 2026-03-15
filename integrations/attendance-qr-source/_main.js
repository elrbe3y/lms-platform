// استخدام DatabaseManager بدلاً من db
const dbManager = new DatabaseManager();
dbManager.initialize(path.join(app.getPath('userData'), 'databases'));
const db = dbManager.db;