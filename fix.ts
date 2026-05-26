import * as fs from 'fs';

const p = 'src/views/DashboardView.tsx';
let txt = fs.readFileSync(p, 'utf8');

const s1 = txt.indexOf('{/* Card Details Modal */}');
const kanbanEndStr = `    {/* Card Details Modal */}`;
const s2Str = `      )}
      </>
      ) : activeTab === 'doacoes' ? (`;

const s2 = txt.indexOf(s2Str);

if (s1 === -1 || s2 === -1) {
  console.log("NOT FOUND!");
  process.exit();
}

const modais = txt.substring(s1, s2);
// Remove modais from kanban branch
const newTxt1 = txt.substring(0, s1) + txt.substring(s2 + 9); 
// Note: s2 + 9 is to keep `      </>` and `      ) : activeTab === 'doacoes' ? (` intact.
// Let's refine removing.
// Actually, `s2` points to `      )}`. We want to cut up to the `)}` that ends the Financeiro modal.

// Safer way:
// Since s1 is `{/* Card Details Modal */}`
// we cut from `s1` until `</>\n      ) : activeTab === 'doacoes'`
// and replace it with `</>\n      ) : activeTab === 'doacoes'`

const s3 = txt.indexOf('      </>\n      ) : activeTab === \'doacoes\'');
const block = txt.substring(s1, s3);
let newTxt = txt.replace(block, "");

// Append AFTER `) : null}`
const tagEnd = `      ) : null}`;
const finalIdx = newTxt.indexOf(tagEnd);
newTxt = newTxt.substring(0, finalIdx + tagEnd.length) + '\n\n' + block + '\n\n' + newTxt.substring(finalIdx + tagEnd.length);

fs.writeFileSync(p, newTxt, 'utf8');
console.log("FIXED!");
