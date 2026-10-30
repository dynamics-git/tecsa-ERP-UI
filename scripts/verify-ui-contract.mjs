import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const checks=[['Import boundaries','scripts/check-import-boundaries.mjs'],['SCSS tokens','scripts/check-scss-token-rules.mjs'],['Synthetic UI fixtures','scripts/angular-pages.mjs','test','--watch=false'],['Production build','scripts/angular-pages.mjs','build','--configuration','production']];
for(const [label,...args] of checks){console.log('\n'+label);const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);}
console.log('\nShared frontend checks passed. No operational business data was used.');
