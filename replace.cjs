const fs = require('fs');
const filepath = 'src/views/AcolhimentoView.tsx';
let content = fs.readFileSync(filepath, 'utf8');

// Replace focus:border-sage etc
content = content.replace(/focus:border-sage/g, 'focus:border-sun-dark');
content = content.replace(/focus:ring-sage/g, 'focus:ring-sun-dark');
content = content.replace(/border-sage bg-sage-light\/30/g, 'border-sun-dark bg-sun-light\/30');
content = content.replace(/hover:border-sage\/50/g, 'hover:border-sun-dark\/50');
content = content.replace(/text-sage hover:text-sage-dark/g, 'text-forest\/70 hover:text-forest');
content = content.replace(/shadow-sage\/5/g, 'shadow-forest\/5');
content = content.replace(/<p className="text-sage max-w-md/g, '<p className="text-forest\/70 max-w-md');
content = content.replace(/text-sage\/80/g, 'text-forest\/80');
content = content.replace(/border-soft hover:border-sun-dark\/50 text-sage"/g, 'border-soft hover:border-sun-dark\/50 text-forest\/70"');
content = content.replace(/border border-soft text-sage/g, 'border border-soft text-forest\/70');

fs.writeFileSync(filepath, content);
console.log('Replaced in AcolhimentoView.tsx');

const dashboard = 'src/views/DashboardView.tsx';
let contentDash = fs.readFileSync(dashboard, 'utf8');
contentDash = contentDash.replace(/bg-sage/g, 'bg-sun-dark');
contentDash = contentDash.replace(/text-sage/g, 'text-forest\/70');
contentDash = contentDash.replace(/shadow-sage\/20/g, 'shadow-forest\/5');
contentDash = contentDash.replace(/border-sage\/20/g, 'border-sun-dark\/20');
contentDash = contentDash.replace(/bg-sage-dark/g, 'bg-sun');
contentDash = contentDash.replace(/bg-sage-light/g, 'bg-sun-light');
contentDash = contentDash.replace(/shadow-sage/g, 'shadow-sun-dark');

// Fix the "text-white" that was inside buttons with bg-sun-dark
contentDash = contentDash.replace(/text-white/g, 'text-forest');
contentDash = contentDash.replace(/text-white transition-colors/g, 'text-forest transition-colors'); 

fs.writeFileSync(dashboard, contentDash);
console.log('Replaced in DashboardView.tsx');

const empresa = 'src/views/EmpresaView.tsx';
let contentEmpresa = fs.readFileSync(empresa, 'utf8');
contentEmpresa = contentEmpresa.replace(/bg-sage/g, 'bg-sun-dark');
contentEmpresa = contentEmpresa.replace(/bg-sage-light/g, 'bg-sun-light');
fs.writeFileSync(empresa, contentEmpresa);

const doacao = 'src/views/DoacaoView.tsx';
let contentDoacao = fs.readFileSync(doacao, 'utf8');
contentDoacao = contentDoacao.replace(/bg-sage/g, 'bg-sun-dark');
contentDoacao = contentDoacao.replace(/bg-sage-light/g, 'bg-sun-light');
contentDoacao = contentDoacao.replace(/text-white/g, 'text-forest'); // Assuming buttons
fs.writeFileSync(doacao, contentDoacao);

