const fs = require('fs');
const path = require('path');

const targetDir = 'C:\\Users\\Admin\\Desktop\\auto location';

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile()) {
      if (file.endsWith('.sql') || file.endsWith('.txt') || file.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.toUpperCase().includes('CREATE TABLE')) {
          console.log(`Found "CREATE TABLE" in: ${fullPath}`);
          // Print matching line snippets
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.toUpperCase().includes('CREATE TABLE')) {
              console.log(`  L${idx+1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

console.log('Searching for files with CREATE TABLE...');
if (fs.existsSync(targetDir)) {
  searchDir(targetDir);
} else {
  console.log('Target dir does not exist');
}
