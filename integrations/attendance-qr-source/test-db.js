// Test script to check database
const db = require('./db');

console.log('Testing database tables...\n');

// Check students_1st
db.all('SELECT id, name, studentPhone, guardianPhone FROM students_1st LIMIT 5', [], (err, rows) => {
  console.log('=== students_1st ===');
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('Found', rows.length, 'students');
    rows.forEach(row => console.log(row));
  }
  console.log('');
  
  // Check students_2nd
  db.all('SELECT id, name, studentPhone, guardianPhone FROM students_2nd LIMIT 5', [], (err, rows) => {
    console.log('=== students_2nd ===');
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('Found', rows.length, 'students');
      rows.forEach(row => console.log(row));
    }
    console.log('');
    
    // Check students_3rd
    db.all('SELECT id, name, studentPhone, guardianPhone FROM students_3rd LIMIT 5', [], (err, rows) => {
      console.log('=== students_3rd ===');
      if (err) {
        console.error('Error:', err.message);
      } else {
        console.log('Found', rows.length, 'students');
        rows.forEach(row => console.log(row));
      }
      console.log('');
      
      // Close database
      db.close();
    });
  });
});
