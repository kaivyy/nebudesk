const fs = require('fs');
let code = fs.readFileSync('apps/server/src/index.ts', 'utf8');

const startIndex = code.indexOf('// Git API');
if (startIndex !== -1) {
  const endIndex = code.indexOf('// Documents API', startIndex);
  if (endIndex !== -1) {
    code = code.substring(0, startIndex) + code.substring(endIndex);
    fs.writeFileSync('apps/server/src/index.ts', code);
    console.log('Fixed duplication!');
  }
}

