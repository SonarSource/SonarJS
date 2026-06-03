import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { RedshiftClient, GetClusterCredentialsCommand } from '@aws-sdk/client-redshift';
import { STSClient, AssumeRoleWithSAMLCommand } from '@aws-sdk/client-sts';
import pg from 'pg';

const CONFIG = {
  region: 'eu-west-1',
  clusterIdentifier: 'sonarsource-warehouse-prod',
  database: 'sonarsource',
  host: 'redshift.aws-prd.sonarsource.com',
  port: 5439,
  loginUrl: 'https://sso.jumpcloud.com/saml2/awsredshift',
  callbackPort: 7890,
  idpResponseTimeout: 60000,
  dbGroup: 'App-Redshift-ProductDevelopment',
};

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE_DIR = path.join(ROOT, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'redshift-credentials.json');
const DB_CACHE_FILE = path.join(CACHE_DIR, 'redshift-db-credentials.json');
const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

const elapsed = (start: number) => ((Date.now() - start) / 1000).toFixed(1);

interface AWSCredentials {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
  Expiration: Date;
  AssumedRoleUser?: {
    Arn?: string;
    AssumedRoleId?: string;
  };
}

interface CachedCredentials {
  AccessKeyId: string;
  SecretAccessKey: string;
  SessionToken: string;
  Expiration: string;
  AssumedRoleUser?: {
    Arn?: string;
    AssumedRoleId?: string;
  };
}

interface DbCredentials {
  user: string;
  password: string;
  expiration: Date | undefined;
}

interface CachedDbCredentials {
  user: string;
  password: string;
  expiration: string;
}

function getEnvironmentCredentials(): AWSCredentials | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  if (accessKeyId && secretAccessKey && sessionToken) {
    console.error('Using AWS credentials from environment variables');

    return {
      AccessKeyId: accessKeyId,
      SecretAccessKey: secretAccessKey,
      SessionToken: sessionToken,
      Expiration: new Date(Date.now() + 60 * 60 * 1000),
    };
  }

  return null;
}

function getDbUser(awsCredentials: AWSCredentials): string {
  const arnSession = awsCredentials.AssumedRoleUser?.Arn?.split('/').pop();
  if (arnSession) {
    return arnSession.replace(/@sonarsource\.com$/, '');
  }

  const assumedRoleId = awsCredentials.AssumedRoleUser?.AssumedRoleId?.split(':').pop();
  if (assumedRoleId) {
    return assumedRoleId.replace(/@sonarsource\.com$/, '');
  }

  return 'cicd-web-redshift';
}

function loadCachedCredentials(): AWSCredentials | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }

    const cached: CachedCredentials = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    const expiration = new Date(cached.Expiration).getTime();

    if (expiration - Date.now() > EXPIRATION_BUFFER_MS) {
      console.error(`Cached credentials valid until ${cached.Expiration}`);
      return { ...cached, Expiration: new Date(cached.Expiration) };
    }

    console.error('Cached credentials expired');
    return null;
  } catch {
    return null;
  }
}

function saveCachedCredentials(credentials: AWSCredentials): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 });

  const data: CachedCredentials = {
    ...credentials,
    Expiration: credentials.Expiration.toISOString(),
  };

  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  console.error(`Credentials cached until ${data.Expiration}`);
}

function loadCachedDbCredentials(): DbCredentials | null {
  try {
    if (!fs.existsSync(DB_CACHE_FILE)) {
      return null;
    }

    const cached: CachedDbCredentials = JSON.parse(fs.readFileSync(DB_CACHE_FILE, 'utf-8'));
    const expiration = new Date(cached.expiration);

    if (expiration.getTime() - Date.now() > EXPIRATION_BUFFER_MS) {
      console.error(`Cached DB credentials valid until ${cached.expiration}`);
      return { user: cached.user, password: cached.password, expiration };
    }

    console.error('Cached DB credentials expired');
    return null;
  } catch {
    return null;
  }
}

function saveCachedDbCredentials(credentials: DbCredentials): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true, mode: 0o700 });

  const expiration = credentials.expiration ?? new Date(Date.now() + 3600 * 1000);
  const data: CachedDbCredentials = {
    user: credentials.user,
    password: credentials.password,
    expiration: expiration.toISOString(),
  };

  fs.writeFileSync(DB_CACHE_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  console.error(`DB credentials cached until ${data.expiration}`);
}

async function exchangeSAMLForCredentials(samlResponse: string): Promise<AWSCredentials> {
  const samlXml = Buffer.from(samlResponse, 'base64').toString('utf-8');

  const roleMatch = samlXml.match(/arn:aws:iam::\d+:role\/[^<,]+/);
  const principalMatch = samlXml.match(/arn:aws:iam::\d+:saml-provider\/[^<,]+/);

  if (!roleMatch || !principalMatch) {
    throw new Error('Could not extract role/principal ARN from SAML assertion');
  }

  const sts = new STSClient({ region: CONFIG.region });
  try {
    const response = await sts.send(
      new AssumeRoleWithSAMLCommand({
        RoleArn: roleMatch[0],
        PrincipalArn: principalMatch[0],
        SAMLAssertion: samlResponse,
      }),
    );

    if (!response.Credentials) {
      throw new Error('No credentials returned from STS');
    }

    return {
      AccessKeyId: response.Credentials.AccessKeyId!,
      SecretAccessKey: response.Credentials.SecretAccessKey!,
      SessionToken: response.Credentials.SessionToken!,
      Expiration: response.Credentials.Expiration!,
      AssumedRoleUser: response.AssumedRoleUser,
    };
  } finally {
    sts.destroy();
  }
}

function authenticateWithSAML(): Promise<AWSCredentials> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.close();
      reject(new Error('SAML authentication timed out'));
    }, CONFIG.idpResponseTimeout);

    const server = http.createServer((req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<html><body><p>Waiting for SAML response...</p></body></html>');
        return;
      }

      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const samlResponse = new URLSearchParams(body).get('SAMLResponse');
          if (!samlResponse) {
            throw new Error('No SAMLResponse in callback');
          }

          const credentials = await exchangeSAMLForCredentials(samlResponse);

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            '<html><body><h1>Authentication successful!</h1><p>You can close this window.</p></body></html>',
          );

          clearTimeout(timeout);
          server.close();
          resolve(credentials);
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h1>Error</h1><p>${err.message}</p></body></html>`);
          clearTimeout(timeout);
          server.close();
          reject(err);
        }
      });
    });

    server.listen(CONFIG.callbackPort, () => {
      console.error(`Listening on port ${CONFIG.callbackPort}, opening browser...`);
      execSync(`open "${CONFIG.loginUrl}"`);
    });
  });
}

async function getDbCredentials(awsCredentials: AWSCredentials): Promise<DbCredentials> {
  const cached = loadCachedDbCredentials();
  if (cached) {
    return cached;
  }

  const redshift = new RedshiftClient({
    region: CONFIG.region,
    credentials: {
      accessKeyId: awsCredentials.AccessKeyId,
      secretAccessKey: awsCredentials.SecretAccessKey,
      sessionToken: awsCredentials.SessionToken,
    },
  });

  try {
    const dbUser = getDbUser(awsCredentials);
    const response = await redshift.send(
      new GetClusterCredentialsCommand({
        ClusterIdentifier: CONFIG.clusterIdentifier,
        DbName: CONFIG.database,
        DbUser: dbUser,
        DbGroups: [CONFIG.dbGroup],
        AutoCreate: false,
        DurationSeconds: 3600,
      }),
    );

    const credentials: DbCredentials = {
      user: response.DbUser!,
      password: response.DbPassword!,
      expiration: response.Expiration,
    };

    saveCachedDbCredentials(credentials);
    return credentials;
  } finally {
    redshift.destroy();
  }
}

export async function getCredentials(): Promise<AWSCredentials> {
  const envCredentials = getEnvironmentCredentials();
  if (envCredentials) {
    return envCredentials;
  }

  let awsCredentials = loadCachedCredentials();

  if (!awsCredentials) {
    console.error('No valid cached credentials, initiating SAML authentication...');
    awsCredentials = await authenticateWithSAML();
    saveCachedCredentials(awsCredentials);
  }

  return awsCredentials;
}

export async function createClient(): Promise<pg.Client> {
  const awsCredentials = await getCredentials();
  const dbCredentials = await getDbCredentials(awsCredentials);
  const client = new pg.Client({
    host: CONFIG.host,
    port: CONFIG.port,
    database: CONFIG.database,
    user: dbCredentials.user,
    password: dbCredentials.password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 120000,
  });

  client.on('error', error => {
    console.error(`Redshift client error: ${error.message}`);
  });

  await client.connect();
  return client;
}

export async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const client = await createClient();

  try {
    const start = Date.now();
    const { rows } = await client.query(sql);

    console.error(`${rows.length} rows in ${elapsed(start)}s`);
    return rows as T[];
  } finally {
    await client.end();
  }
}

async function main() {
  const sqlFile = process.argv[2];
  const sql =
    sqlFile && !sqlFile.startsWith('-')
      ? fs.readFileSync(sqlFile, 'utf-8')
      : 'SELECT current_user, current_database()';

  if (sqlFile && !sqlFile.startsWith('-')) {
    console.error(`Executing ${sqlFile}`);
  }

  const rows = await query(sql);
  console.log(JSON.stringify(rows, null, 2));
}

if (process.argv[1]?.endsWith('/scripts/redshift.ts')) {
  try {
    await main();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
