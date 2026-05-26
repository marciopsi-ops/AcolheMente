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
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

const replacements = [
  // Specific hero spacing in App.tsx
  { from: /gap-12 px-6 md:px-12 py-16 pb-24/g, to: 'gap-6 md:gap-8 px-6 md:px-12 py-8 lg:py-12' },
  { from: /mb-8 bg-white p-8 md:p-16 rounded/g, to: 'mb-4 bg-white p-6 md:p-10 rounded' },
  { from: /max-w-lg mb-16/g, to: 'max-w-lg mb-8' },
  { from: /mt-8 mb-24 flex flex-wrap justify-center gap-12 sm:gap-24 border-t/g, to: 'mt-6 mb-12 flex flex-wrap justify-center gap-8 sm:gap-16 border-t' },
  { from: /w-full bg-warm pb-24 flex/g, to: 'w-full bg-warm pb-16 flex' },
  
  // Acolhimento
  { from: /p-6 md:p-12 gap-12 relative max-w-\[1200px\]/g, to: 'p-6 md:p-8 gap-8 relative max-w-[1200px]' },

  // General padding reductions for other views
  { from: /py-16 md:py-24/g, to: 'py-10 md:py-16' },
  { from: /pb-24/g, to: 'pb-16' },
  { from: /py-24/g, to: 'py-16' },
  { from: /py-16/g, to: 'py-10' },
  { from: /gap-12/g, to: 'gap-10' },
  { from: /gap-16/g, to: 'gap-10' },
];

files.forEach(filepath => {
  let content = fs.readFileSync(filepath, 'utf8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });
  
  if (content !== original) {
    fs.writeFileSync(filepath, content);
    console.log('Updated ' + filepath);
  }
});
