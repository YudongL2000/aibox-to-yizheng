#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const {
  findAvailablePort,
  terminateChild,
  waitForJson,
} = require('../electron/runtime-utils');

function resolveArg(flagName) {
  const direct = process.argv.find((arg) => arg.startsWith(`${flagName}=`));
  if (direct) {
    return direct.slice(flagName.length + 1);
  }
  const index = process.argv.indexOf(flagName);
  if (index >= 0) {
    return process.argv[index + 1];
  }
  return '';
}

async function main() {
  const workspaceRoot = path.resolve(__dirname, '..');
  const backendRoot = path.resolve(workspaceRoot, '..', 'backend');
  const projectPath = resolveArg('--project');

  const backendEntry = path.join(backendRoot, 'dist', 'agent-server', 'index.js');
  const deployedN8nRoot = path.join(workspaceRoot, '.tesseract-runtime', 'n8n');
  const deployedN8nEntry = path.join(deployedN8nRoot, 'bin', 'n8n');
  const deployedN8nDist = path.join(deployedN8nRoot, 'dist');
  const workspaceN8nRoot = path.resolve(workspaceRoot, '..', 'n8n', 'n8n-master');
  const workspaceN8nEntry = path.join(workspaceN8nRoot, 'packages', 'cli', 'bin', 'n8n');
  const workspaceN8nDist = path.join(workspaceN8nRoot, 'packages', 'cli', 'dist');
  const hasDeployedN8n =
    fs.existsSync(deployedN8nEntry) && fs.existsSync(deployedN8nDist);
  const n8nRoot = hasDeployedN8n ? deployedN8nRoot : workspaceN8nRoot;
  const n8nEntry = hasDeployedN8n ? deployedN8nEntry : workspaceN8nEntry;
  const n8nDist = hasDeployedN8n ? deployedN8nDist : workspaceN8nDist;

  if (!fs.existsSync(backendEntry)) {
    throw new Error(`Missing backend dist entry: ${backendEntry}`);
  }
  if (!fs.existsSync(path.join(backendRoot, 'node_modules'))) {
    throw new Error(`Missing backend dependencies: ${path.join(backendRoot, 'node_modules')}`);
  }
  if (!fs.existsSync(n8nDist)) {
    throw new Error(`Missing n8n dist: ${n8nDist}`);
  }

  const agentPort = await findAvailablePort(3005);
  const n8nPort = await findAvailablePort(5678);
  const n8nUserFolder = path.join(workspaceRoot, '.tmp', 'n8n-smoke');
  fs.mkdirSync(n8nUserFolder, { recursive: true });

  const agent = spawn(process.execPath, [backendEntry], {
    cwd: backendRoot,
    env: {
      ...process.env,
      AGENT_PORT: String(agentPort),
      AGENT_HOST: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const n8n = spawn(process.execPath, [n8nEntry, 'start'], {
    cwd: n8nRoot,
    env: {
      ...process.env,
      N8N_PORT: String(n8nPort),
      N8N_LISTEN_ADDRESS: '127.0.0.1',
      N8N_EDITOR_BASE_URL: `http://127.0.0.1:${n8nPort}`,
      N8N_USER_FOLDER: n8nUserFolder,
      N8N_PERSONALIZATION_ENABLED: 'false',
      N8N_DIAGNOSTICS_ENABLED: 'false',
      N8N_PUBLIC_API_DISABLED: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  try {
    await waitForJson(`http://127.0.0.1:${agentPort}/api/health`, {
      timeoutMs: 45000,
      validate: (payload) => payload?.status === 'ok',
    });

    await waitForJson(`http://127.0.0.1:${n8nPort}/healthz`, {
      timeoutMs: 60000,
      validate: (payload) => Boolean(payload),
    });

    const result = {
      agentHealth: `http://127.0.0.1:${agentPort}/api/health`,
      n8nHealth: `http://127.0.0.1:${n8nPort}/healthz`,
      editorUrl: `http://127.0.0.1:${n8nPort}`,
      n8nRuntimeSource: hasDeployedN8n ? 'deployed' : 'workspace',
      workflowSnapshot: null,
    };

    if (projectPath) {
      const workflowPath = path.join(projectPath, '.tesseract', 'workflow.json');
      if (!fs.existsSync(workflowPath)) {
        throw new Error(`Missing workflow snapshot: ${workflowPath}`);
      }
      result.workflowSnapshot = {
        path: workflowPath,
        bytes: fs.statSync(workflowPath).size,
      };
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await Promise.allSettled([terminateChild(agent), terminateChild(n8n)]);
  }
}

main().catch((error) => {
  console.error(`[tesseract-smoke] ${error.message}`);
  process.exit(1);
});
