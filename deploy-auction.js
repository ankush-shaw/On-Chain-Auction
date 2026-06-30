import {
  rpc,
  Networks,
  Keypair,
  TransactionBuilder,
  Operation,
  Contract,
  Address,
  nativeToScVal,
  xdr,
} from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// deploy-auction.js lives at the project root — PROJECT_ROOT IS __dirname
const PROJECT_ROOT = __dirname;
const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const NATIVE_TOKEN = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
const WASM_CANDIDATES = [
  path.join(PROJECT_ROOT, 'target/wasm32v1-none/release/auction_contract.wasm'),
  path.join(PROJECT_ROOT, 'target/wasm32-unknown-unknown/release/auction_contract.wasm'),
];
const ENV_PATH = path.resolve(__dirname, '.env');
const FRIENDBOT_ENDPOINTS = [
  'https://friendbot.stellar.org',
  'https://horizon-testnet.stellar.org/friendbot',
];
const FUNDING_HELP = [
  'Testnet Friendbot appears to be unavailable right now.',
  'Fund a testnet account manually at https://lab.stellar.org/account/create/testnet',
  'Then rerun deploy with your funded secret:',
  '  $env:DEPLOY_SECRET_KEY="S..."; npm run deploy:contract',
].join('\n');

const SAMPLE_AUCTIONS = [
  {
    title: 'Mobile app landing page',
    description: 'A polished first-screen product page with wallet-gated preorder intent.',
    startingBid: '25',
    durationHours: 24,
  },
  {
    title: 'Brand identity sprint',
    description: 'Logo system, color tokens, typography direction, and a launch-ready social kit.',
    startingBid: '40',
    durationHours: 48,
  },
  {
    title: 'Smart contract audit block',
    description: 'A focused audit slot for one Soroban contract with remediation checks.',
    startingBid: '90',
    durationHours: 72,
  },
];

const server = new rpc.Server(RPC_URL);

function resolveWasmPath() {
  for (const candidate of WASM_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }

  console.log('WASM not found. Building contract with Stellar CLI...');
  const result = spawnSync('stellar', ['contract', 'build', '--package', 'auction-contract'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    shell: true,
  });

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  if (result.status !== 0) {
    throw new Error(
      output ||
        'Contract build failed. Install the Stellar CLI, then run: stellar contract build --package auction-contract'
    );
  }

  const reportedPath = output.match(/Wasm File:\s*(.+\.wasm)/)?.[1]?.trim();
  if (reportedPath && fs.existsSync(reportedPath)) {
    return reportedPath;
  }

  for (const candidate of WASM_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(
    'Contract build finished but auction_contract.wasm was not found. Run from the repo root: stellar contract build --package auction-contract'
  );
}

function normalizeDeploySecret(rawValue) {
  if (!rawValue) return null;
  const trimmed = rawValue.trim().replace(/^['"]|['"]$/g, '');
  return trimmed || null;
}

function loadDeployKeypair() {
  const secret = normalizeDeploySecret(process.env.DEPLOY_SECRET_KEY);
  if (secret) {
    if (!/^S[A-Z2-7]{55}$/.test(secret)) {
      throw new Error(
        [
          'DEPLOY_SECRET_KEY is not a valid Stellar secret key.',
          'It must start with "S" and be 56 characters long.',
          'You may have pasted a public key (starts with "G") or a placeholder by mistake.',
          'Create or fund a testnet account at https://lab.stellar.org/account/create/testnet',
          'and copy the secret key shown there.',
          'To use Friendbot instead, clear the variable first:',
          '  Remove-Item Env:DEPLOY_SECRET_KEY',
        ].join('\n')
      );
    }

    const kp = Keypair.fromSecret(secret);
    console.log('Using deploy account from DEPLOY_SECRET_KEY:', kp.publicKey());
    return kp;
  }

  const kp = Keypair.random();
  console.log('Deployer:', kp.publicKey());
  console.log('Secret (save if you need to reuse this account):', kp.secret());
  return kp;
}

async function waitForAccount(address, attempts = 15) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await server.getAccount(address);
    } catch {
      console.log(`Waiting for account funding... (${i + 1}/${attempts})`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw new Error(`Timed out waiting for account ${address} to be funded.\n${FUNDING_HELP}`);
}

async function fundViaFriendbot(address) {
  let lastError = 'No Friendbot response';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    for (const endpoint of FRIENDBOT_ENDPOINTS) {
      const url = `${endpoint}?addr=${encodeURIComponent(address)}`;
      try {
        console.log(`Trying Friendbot (${attempt}/3): ${endpoint}`);
        const response = await fetch(url, { redirect: 'follow' });
        const body = await response.text();

        if (response.ok) {
          console.log(`Funded via ${endpoint}`);
          return waitForAccount(address);
        }

        lastError = `${endpoint} returned ${response.status}${body ? `: ${body.slice(0, 160)}` : ''}`;
        console.warn(lastError);
      } catch (error) {
        lastError = `${endpoint} failed: ${error.message}`;
        console.warn(lastError);
      }
    }

    if (attempt < 3) {
      console.log(`Friendbot retry ${attempt}/3 in 2s...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error(`Friendbot funding failed after retries.\nLast error: ${lastError}\n${FUNDING_HELP}`);
}

async function ensureFunded(address, hasProvidedSecret) {
  try {
    const account = await server.getAccount(address);
    console.log('Deploy account is already funded.');
    return account;
  } catch {
    if (hasProvidedSecret) {
      throw new Error(
        [
          `Deploy account ${address} is not funded on testnet yet.`,
          'Fund it at https://lab.stellar.org/account/create/testnet',
          'or send test XLM to this address, then rerun deploy.',
        ].join('\n')
      );
    }

    console.log('Funding via Friendbot...');
    return fundViaFriendbot(address);
  }
}

function parseXlmToStroops(value) {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0'));
}

async function waitForTransaction(hash, label = 'transaction', maxAttempts = 45) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: { hash },
      }),
    });
    const json = await res.json();
    const status = json.result?.status ?? 'NOT_FOUND';

    if (status === 'SUCCESS') {
      console.log(`${label} confirmed.`);
      return json.result;
    }
    if (status === 'FAILED') throw new Error(`${label} failed on-chain: ` + JSON.stringify(json.result));

    console.log(`${label} pending (${attempt}/${maxAttempts}, status: ${status})...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`${label} timed out after ${maxAttempts * 2}s. Hash: ${hash}`);
}

async function submitTransaction(label, tx, kp) {
  console.log(`${label}...`);
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(kp);
  const sent = await server.sendTransaction(prepared);
  console.log(`${label} submitted: ${sent.hash}`);
  return waitForTransaction(sent.hash, label);
}

async function simulateCall(contractId, funcName, args = []) {
  const contract = new Contract(contractId);
  const dummy = 'GBBIG4HLPGTLG6BH6YREVWJXEQ4NX74HTD444JD6A6XYS7DOFL2J6DEI';
  const account = await server.getAccount(dummy).catch(() => ({
    accountId: () => dummy,
    sequenceNumber: () => '1',
    incrementSequenceNumber: () => {},
  }));

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(funcName, ...args))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(result) && result.result) {
    return result.result.retval;
  }
  return null;
}

async function deployAndSeed() {
  const wasmPath = resolveWasmPath();
  console.log('Using WASM:', wasmPath);

  const providedSecret = Boolean(normalizeDeploySecret(process.env.DEPLOY_SECRET_KEY));
  const kp = loadDeployKeypair();
  const addressStr = kp.publicKey();
  let account = await ensureFunded(addressStr, providedSecret);
  const skipSeed = ['1', 'true', 'yes'].includes(String(process.env.SKIP_SEED ?? '').toLowerCase());
  const auctionsToSeed = skipSeed ? [] : SAMPLE_AUCTIONS;

  console.log('Deploying contract using Stellar CLI...');
  const deployResult = spawnSync(
    'stellar',
    [
      'contract',
      'deploy',
      '--wasm',
      `"${wasmPath}"`,
      '--source-account',
      kp.secret(),
      '--rpc-url',
      RPC_URL,
      '--network-passphrase',
      `"${NETWORK_PASSPHRASE}"`,
    ],
    {
      encoding: 'utf8',
      shell: true,
    }
  );

  const deployOutput = `${deployResult.stdout ?? ''}\n${deployResult.stderr ?? ''}`.trim();
  if (deployResult.status !== 0) {
    throw new Error('Stellar CLI deploy failed:\n' + deployOutput);
  }

  const contractId = deployOutput.match(/(C[A-Z0-9]{55})/)?.[1];
  if (!contractId) {
    throw new Error('Could not find contract ID in deploy output:\n' + deployOutput);
  }
  console.log('Contract ID:', contractId);

  const contract = new Contract(contractId);
  let auctionId = 1;

  for (const item of auctionsToSeed) {
    account = await server.getAccount(addressStr);
    const durationSeconds = Math.max(1, Math.round(item.durationHours * 60 * 60));
    const seedTx = new TransactionBuilder(account, {
      fee: '1000000',
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          'create_auction',
          Address.fromString(addressStr).toScVal(),
          Address.fromString(NATIVE_TOKEN).toScVal(),
          nativeToScVal(auctionId, { type: 'u32' }),
          nativeToScVal(item.title, { type: 'string' }),
          nativeToScVal(item.description, { type: 'string' }),
          nativeToScVal(parseXlmToStroops(item.startingBid).toString(), { type: 'i128' }),
          nativeToScVal(durationSeconds, { type: 'u64' })
        )
      )
      .setTimeout(30)
      .build();

    await submitTransaction(`Creating auction ${auctionId}`, seedTx, kp);
    auctionId += 1;
  }

  if (skipSeed) {
    console.log('Skipped sample auction seeding (SKIP_SEED enabled).');
  }

  const countVal = await simulateCall(contractId, 'get_auction_count', []);
  console.log('On-chain auction count:', countVal?._value ?? countVal);

  const envContents = [
    `VITE_AUCTION_CONTRACT_ID=${contractId}`,
    `VITE_STELLAR_RPC_URL=${RPC_URL}`,
    `VITE_NATIVE_TOKEN_CONTRACT_ID=${NATIVE_TOKEN}`,
    '',
  ].join('\n');

  fs.writeFileSync(ENV_PATH, envContents);
  console.log(`Wrote ${ENV_PATH}`);
  console.log('Deployment complete. Restart the frontend dev server to load the contract.');
}

deployAndSeed().catch((error) => {
  console.error(error);
  process.exit(1);
});
