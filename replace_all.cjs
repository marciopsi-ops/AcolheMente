const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(filepath => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  content = content.replace(/text-sage-dark/g, 'text-forest');
  content = content.replace(/text-sage-light/g, 'text-sun-light');
  content = content.replace(/bg-sage-dark/g, 'bg-sun-dark');
  content = content.replace(/bg-sage-light/g, 'bg-sun-light');
  content = content.replace(/bg-sage/g, 'bg-sun-dark');
  content = content.replace(/text-sage/g, 'text-forest/70');
  content = content.replace(/border-sage/g, 'border-sun-dark');
  content = content.replace(/shadow-sage/g, 'shadow-sun-dark');
  content = content.replace(/ring-sage/g, 'ring-sun-dark');
  
  // Custom manual overrides for button/badge text contrast when inside bg-sun-dark
  content = content.replace(/bg-sun-dark text-white/g, 'bg-sun-dark text-forest');
  content = content.replace(/bg-sun text-white/g, 'bg-sun text-forest');
  
  if (content !== original) {
    fs.writeFileSync(filepath, content);
    console.log('Updated ' + filepath);
  }
});
