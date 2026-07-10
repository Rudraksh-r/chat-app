import { execSync } from 'child_process';
import https from 'https';

function queryOsv(name, version) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      version: version,
      package: {
        name: name,
        ecosystem: 'npm'
      }
    });

    const options = {
      hostname: 'api.osv.dev',
      port: 443,
      path: '/v1/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({});
        }
      });
    });

    req.on('error', error => reject(error));
    req.write(data);
    req.end();
  });
}

async function checkDeps(dir) {
  console.log(`Checking ${dir}...`);
  const output = execSync(`npm ls --json --depth=0`, { cwd: dir, encoding: 'utf-8' });
  const deps = JSON.parse(output).dependencies;
  for (const name in deps) {
    const version = deps[name].version;
    if (!version) continue;
    const res = await queryOsv(name, version);
    if (res.vulns && res.vulns.length > 0) {
      console.log(`[VULN] ${name}@${version}`);
      for (const v of res.vulns) {
        console.log(`  - ${v.id}: ${v.summary || 'No summary'} (${v.aliases ? v.aliases.join(', ') : ''})`);
      }
    }
  }
}

async function run() {
  await checkDeps('C:/Codes/chat-app/Backend');
  await checkDeps('C:/Codes/chat-app/Frontnd');
}

run().catch(console.error);
