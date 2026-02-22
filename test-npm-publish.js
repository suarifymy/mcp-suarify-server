
import { spawn } from 'child_process';

const initReq = JSON.stringify({
    jsonrpc: "2.0",
    id: "init",
    method: "initialize",
    params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test-client", version: "1.0.0" }
    }
}) + '\n';

const listToolsReq = JSON.stringify({
    jsonrpc: "2.0",
    id: "list-tools",
    method: "tools/list",
    params: {}
}) + '\n';

const env = {
    ...process.env,
    SUARIFY_API_KEY: 'sk_suarify_96317edc_Kem_LBfqMhm99ovqd5jBGrZ4iFNxqzq90_RBlu6Fnoo'
};

// Use npx to run the latest published version
console.log('Starting npx suarify-mcp-server@latest...');
const child = spawn('npx', ['-y', 'suarify-mcp-server@latest'], { env });

let output = '';
child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    for (const line of lines) {
        if (line.includes('"id":"init"')) {
            console.log('--- INITIALIZED SUCCESSFULLY ---');
            child.stdin.write(listToolsReq);
        }
        if (line.includes('"id":"list-tools"')) {
            console.log('--- TOOLS LISTED SUCCESSFULLY ---');
            const response = JSON.parse(line);
            console.log(`Tool count: ${response.result.tools.length}`);
            child.kill();
        }
    }
});

child.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('error') || msg.includes('CRITICAL')) {
        console.error('SERVER ERROR:', msg);
    }
});

child.stdin.write(initReq);

setTimeout(() => {
    if (!child.killed) {
        console.log('Timeout waiting for response from npx command');
        child.kill();
    }
}, 30000); // 30s timeout for npx download and run
