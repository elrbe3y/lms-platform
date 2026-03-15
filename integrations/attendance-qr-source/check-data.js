// Check real data
const db = require('./db');

console.log('=== Current Database State ===\n');

// Check old students table
db.all('SELECT * FROM students ORDER BY id DESC', [], (err, rows) => {
  console.log('📋 Old students table:', rows ? rows.length : 0, 'students');
  if (rows && rows.length > 0) {
    console.log('Last 5 students:');
    rows.slice(0, 5).forEach(s => {
      console.log(`  - ${s.name} (Grade ${s.grade})`);
    });
  }
  console.log('');
  
  // Check new tables
  db.all('SELECT COUNT(*) as count FROM students_1st', [], (err, result) => {
    console.log('📊 students_1st:', result ? result[0].count : 0);
    
    db.all('SELECT COUNT(*) as count FROM students_2nd', [], (err, result) => {
      console.log('📊 students_2nd:', result ? result[0].count : 0);
      
      db.all('SELECT COUNT(*) as count FROM students_3rd', [], (err, result) => {
        console.log('📊 students_3rd:', result ? result[0].count : 0);
        
        console.log('\n🔍 Do you want to clear the migrated data? (yes/no)');
        db.close();
      });
    });
  });
});
