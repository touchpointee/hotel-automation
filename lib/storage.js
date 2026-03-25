import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

function getEnv(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

function getS3Config() {
  // Prefer MinIO vars if present, otherwise fall back to Garage vars.
  const minio = {
    endpoint: getEnv('MINIO_S3_ENDPOINT'),
    region: getEnv('MINIO_S3_REGION') || 'us-east-1',
    bucket: getEnv('MINIO_S3_BUCKET'),
    accessKeyId: getEnv('MINIO_S3_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('MINIO_S3_SECRET_ACCESS_KEY'),
  };
  if (minio.endpoint && minio.bucket && minio.accessKeyId && minio.secretAccessKey) {
    return { provider: 'minio', ...minio };
  }

  const garage = {
    endpoint: getEnv('GARAGE_S3_ENDPOINT'),
    region: getEnv('GARAGE_S3_REGION') || 'us-east-1',
    bucket: getEnv('GARAGE_S3_BUCKET'),
    accessKeyId: getEnv('GARAGE_S3_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('GARAGE_S3_SECRET_ACCESS_KEY'),
  };
  if (garage.endpoint && garage.bucket && garage.accessKeyId && garage.secretAccessKey) {
    return { provider: 'garage', ...garage };
  }

  return null;
}

function isS3Enabled() {
  return Boolean(getS3Config());
}

function getS3Client() {
  const cfg = getS3Config();
  if (!cfg) throw new Error('S3 storage not configured');

  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });
}

export function getContentTypeForFilename(filename = '') {
  const lower = String(filename).toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return 'application/octet-stream';
}

export async function putDocumentObject({ key, body, contentType }) {
  if (!isS3Enabled()) return { stored: false };
  const Bucket = getS3Config().bucket;
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket,
      Key: key,
      Body: body,
      ContentType: contentType || getContentTypeForFilename(key),
    })
  );

  return { stored: true };
}

export async function headDocumentObject({ key }) {
  if (!isS3Enabled()) return { exists: false, storage: 'disabled' };
  const Bucket = getS3Config().bucket;
  const client = getS3Client();

  try {
    const out = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
    return {
      exists: true,
      storage: 's3',
      contentType: out.ContentType || getContentTypeForFilename(key),
      contentLength: typeof out.ContentLength === 'number' ? out.ContentLength : undefined,
    };
  } catch (e) {
    const code = e?.$metadata?.httpStatusCode;
    if (code === 404) return { exists: false, storage: 's3' };
    return { exists: false, storage: 's3', error: e };
  }
}

export async function getDocumentObjectStream({ key }) {
  if (!isS3Enabled()) return { found: false };
  const Bucket = getS3Config().bucket;
  const client = getS3Client();

  try {
    const out = await client.send(new GetObjectCommand({ Bucket, Key: key }));
    const body = out.Body; // Node.js Readable
    return {
      found: true,
      body,
      contentType: out.ContentType || getContentTypeForFilename(key),
      contentLength: typeof out.ContentLength === 'number' ? out.ContentLength : undefined,
    };
  } catch (e) {
    const code = e?.$metadata?.httpStatusCode;
    if (code === 404) return { found: false };
    return { found: false, error: e };
  }
}

