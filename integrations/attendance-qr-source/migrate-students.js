// Migrate old students data to new tables
const db = require('./db');

console.log('Starting data migration...\n');

// Get all students from old table
db.all('SELECT * FROM students', [], (err, students) => {
  if (err) {
    console.error('Error reading students:', err.message);
    db.close();
    return;
  }
  
  console.log(`Found ${students.length} students in old table`);
  
  if (students.length === 0) {
    console.log('No students to migrate');
    db.close();
    return;
  }
  
  let migrated = 0;
  let errors = 0;
  
  students.forEach((student, index) => {
    const grade = student.grade || '1';
    const table = grade === '2' ? 'students_2nd' : grade === '3' ? 'students_3rd' : 'students_1st';
    
    // Generate ID if doesn't exist
    const id = student.qr_code || `STD${Date.now()}${index}`;
    
    db.run(
      `INSERT OR IGNORE INTO ${table} (id, name, studentPhone, guardianPhone, photoPath, qrCodePath) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, student.name, student.studentPhone, student.guardianPhone, student.photo, null],
      function(err) {
        if (err) {
          console.error(`Error migrating ${student.name}:`, err.message);
          errors++;
        } else {
          migrated++;
          console.log(`✓ Migrated: ${student.name} (${table})`);
        }
        
        // Check if done
        if (migrated + errors === students.length) {
          console.log(`\nMigration complete: ${migrated} migrated, ${errors} errors`);
          db.close();
        }
      }
    );
  });
});
