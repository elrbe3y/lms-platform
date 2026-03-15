// Clear migrated data
const db = require('./db');

console.log('🗑️ Clearing migrated data...\n');

db.run('DELETE FROM students_1st', [], function(err) {
  if (err) {
    console.error('Error clearing students_1st:', err.message);
  } else {
    console.log('✓ Cleared students_1st:', this.changes, 'rows');
  }
  
  db.run('DELETE FROM students_2nd', [], function(err) {
    if (err) {
      console.error('Error clearing students_2nd:', err.message);
    } else {
      console.log('✓ Cleared students_2nd:', this.changes, 'rows');
    }
    
    db.run('DELETE FROM students_3rd', [], function(err) {
      if (err) {
        console.error('Error clearing students_3rd:', err.message);
      } else {
        console.log('✓ Cleared students_3rd:', this.changes, 'rows');
      }
      
      console.log('\n✅ All migrated data cleared!');
      console.log('📝 Now you can add your real students through the web interface.');
      db.close();
    });
  });
});
