const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand, HeadBucketCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const getStorageMode = () => {
  const raw = String(process.env.MEDIA_STORAGE || '').trim().toLowerCase();
  return raw || 'local';
};

const getUploadsDir = () => {
  return path.join(__dirname, 'uploads');
};

const parseImageDataUrl = (s) => {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(String(s || '').trim());
  if (!m) return null;
  return { mime: m[1], base64: m[2] };
};

const buildExt = (mime) => {
  const mt = String(mime || '').toLowerCase();
  if (mt === 'image/png') return 'png';
  if (mt === 'image/webp') return 'webp';
  return 'jpg';
};

const ensureOkMime = (mime) => {
  const okTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const mt = String(mime || '').toLowerCase();
  if (!okTypes.has(mt)) throw new Error('仅支持 JPG/PNG/WEBP');
  return mt;
};

const safePrefix = (namePrefix) => {
  return String(namePrefix || 'img')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 64);
};

const saveLocal = (buffer, mime, namePrefix) => {
  const mt = ensureOkMime(mime);
  const uploadsDir = getUploadsDir();
  fs.mkdirSync(uploadsDir, { recursive: true });
  const coverDir = path.join(uploadsDir, 'covers');
  fs.mkdirSync(coverDir, { recursive: true });

  const ext = buildExt(mt);
  const name = `${safePrefix(namePrefix)}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(coverDir, name), buffer);
  return `/uploads/covers/${name}`;
};

const buildS3Client = () => {
  const region = String(process.env.S3_REGION || '').trim() || 'auto';
  const endpoint = String(process.env.S3_ENDPOINT || '').trim() || undefined;
  const accessKeyId = String(process.env.S3_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.S3_SECRET_ACCESS_KEY || '').trim();
  if (!accessKeyId || !secretAccessKey) throw new Error('缺少 S3_ACCESS_KEY_ID 或 S3_SECRET_ACCESS_KEY');
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
};

const getS3Config = () => {
  const region = String(process.env.S3_REGION || '').trim() || 'auto';
  const endpoint = String(process.env.S3_ENDPOINT || '').trim() || '';
  const bucket = String(process.env.S3_BUCKET || '').trim();
  const publicBaseUrl = String(process.env.S3_PUBLIC_BASE_URL || '').trim();
  const keyPrefix = String(process.env.S3_PREFIX || '').trim().replace(/^\/+|\/+$/g, '');
  const accessKeyId = String(process.env.S3_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = String(process.env.S3_SECRET_ACCESS_KEY || '').trim();
  return {
    region,
    endpoint,
    bucket,
    publicBaseUrl,
    keyPrefix,
    hasCredentials: Boolean(accessKeyId && secretAccessKey),
  };
};

const checkS3Bucket = async () => {
  const { bucket, hasCredentials } = getS3Config();
  if (!bucket) return { ok: false, message: '缺少 S3_BUCKET' };
  if (!hasCredentials) return { ok: false, message: '缺少 S3_ACCESS_KEY_ID 或 S3_SECRET_ACCESS_KEY' };
  try {
    const client = buildS3Client();
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e?.message || 'S3 bucket 检查失败' };
  }
};

const saveS3 = async (buffer, mime, namePrefix) => {
  const mt = ensureOkMime(mime);
  const { bucket, publicBaseUrl, keyPrefix } = getS3Config();
  if (!bucket) throw new Error('缺少 S3_BUCKET');
  if (!publicBaseUrl) throw new Error('缺少 S3_PUBLIC_BASE_URL');

  const ext = buildExt(mt);
  const keyBase = `${safePrefix(namePrefix)}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const key = keyPrefix ? `${keyPrefix}/covers/${keyBase}` : `covers/${keyBase}`;

  const client = buildS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mt,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return `${publicBaseUrl.replace(/\/+$/, '')}/${key}`;
};

const maybeDeleteByUrl = async (url) => {
  const s = String(url || '').trim();
  if (!s) return { ok: true, skipped: true };
  if (s.startsWith('data:')) return { ok: true, skipped: true };

  const mode = getStorageMode();
  if (mode === 'local') {
    if (!s.startsWith('/uploads/covers/')) return { ok: true, skipped: true };
    const filename = path.basename(s);
    const fullPath = path.join(getUploadsDir(), 'covers', filename);
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e?.message || '本地文件删除失败' };
    }
  }

  if (mode === 's3') {
    const enabled = String(process.env.S3_DELETE_ENABLED || '').trim().toLowerCase() === 'true';
    if (!enabled) return { ok: true, skipped: true };
    const { bucket, publicBaseUrl, hasCredentials } = getS3Config();
    if (!bucket || !publicBaseUrl || !hasCredentials) return { ok: true, skipped: true };
    const base = publicBaseUrl.replace(/\/+$/, '');
    if (!s.startsWith(base + '/')) return { ok: true, skipped: true };
    const key = s.slice((base + '/').length);
    try {
      const client = buildS3Client();
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e?.message || 'S3 删除失败' };
    }
  }

  return { ok: true, skipped: true };
};

const saveImageBuffer = async (buffer, mime, namePrefix) => {
  const mode = getStorageMode();
  if (mode === 'local') return saveLocal(buffer, mime, namePrefix);
  if (mode === 's3') return saveS3(buffer, mime, namePrefix);
  throw new Error(`未知 MEDIA_STORAGE: ${mode}`);
};

const normalizeCoverValueForStorage = async (coverValue, namePrefix) => {
  const raw = String(coverValue || '').trim();
  if (!raw) return '';
  if (!raw.startsWith('data:')) return raw;
  const parsed = parseImageDataUrl(raw);
  if (!parsed) return raw;
  const buf = Buffer.from(parsed.base64, 'base64');
  return saveImageBuffer(buf, parsed.mime, namePrefix);
};

module.exports = {
  getStorageMode,
  getS3Config,
  checkS3Bucket,
  getUploadsDir,
  maybeDeleteByUrl,
  saveImageBuffer,
  normalizeCoverValueForStorage,
};
