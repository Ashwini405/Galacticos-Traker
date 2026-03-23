const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'recruitmentDB'
  });

  console.log('🔍 Checking for duplicate recruiters...');

  // Find duplicates: group by name, find IDs with count > 1
  const [duplicates] = await db.execute(`
    SELECT MIN(name) as name, GROUP_CONCAT(id ORDER BY id ASC) as ids, COUNT(*) as count
    FROM recruiters 
    WHERE name IS NOT NULL AND name != ''
    GROUP BY LOWER(TRIM(name))
    HAVING count > 1
  `);

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found!');
    await db.end();
    process.exit(0);
  }

  console.log(`Found ${duplicates.length} duplicate groups:`);
  duplicates.forEach(row => {
    console.log(`  "${row.name}": IDs ${row.ids} (x${row.count})`);
  });

  let deleted = 0;
  for (const dup of duplicates) {
    const ids = dup.ids.split(',').map(id => parseInt(id.trim()));
    const keepId = ids[0]; // Keep lowest ID
    const deleteIds = ids.slice(1);

    // Delete higher ID duplicates
    for (const delId of deleteIds) {
      await db.execute('DELETE FROM recruiters WHERE id = ?', [delId]);
      deleted++;
      console.log(`🗑️  Deleted duplicate ID ${delId} (kept ${keepId})`);
    }
  }

  console.log(`\n✅ Cleaned ${deleted} duplicate records.`);
  
  // Verify final count
  const [finalCount] = await db.execute('SELECT COUNT(*) as total FROM recruiters');
  console.log(`Final recruiters count: ${finalCount[0].total}`);
  
  // Check if any custom recruiters remain
  const [custom] = await db.execute('SELECT id, name FROM recruiters WHERE name NOT IN ("John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson") ORDER BY id');
  if (custom.length > 0) {
    console.log('📝 Custom recruiters remaining:');
    custom.forEach(r => console.log(`  ${r.id}: ${r.name}`));
  }

  await db.end();
  console.log('✅ Cleanup complete!');
})();

