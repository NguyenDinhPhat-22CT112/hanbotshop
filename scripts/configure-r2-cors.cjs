process.loadEnvFile();
const { S3Client, PutBucketCorsCommand } = require('../apps/api/node_modules/@aws-sdk/client-s3');

const required = ['CLOUD_STORAGE_ENDPOINT','CLOUD_STORAGE_BUCKET','CLOUD_STORAGE_ACCESS_KEY_ID','CLOUD_STORAGE_SECRET_ACCESS_KEY'];
for (const key of required) if (!process.env[key]) throw new Error(`${key} is required`);

const origins = [
  process.env.WEB_URL,
  process.env.ADMIN_URL,
  'http://localhost:3000',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3002'
].filter(Boolean);

const client = new S3Client({
  region: process.env.CLOUD_STORAGE_REGION || 'auto',
  endpoint: process.env.CLOUD_STORAGE_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.CLOUD_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUD_STORAGE_SECRET_ACCESS_KEY
  }
});

client.send(new PutBucketCorsCommand({
  Bucket: process.env.CLOUD_STORAGE_BUCKET,
  CORSConfiguration: { CORSRules: [{
    AllowedOrigins: [...new Set(origins)],
    AllowedMethods: ['GET','PUT','HEAD'],
    AllowedHeaders: ['content-type','content-disposition','x-amz-*'],
    ExposeHeaders: ['etag'],
    MaxAgeSeconds: 3600
  }] }
})).then(() => console.log(`Configured CORS for ${process.env.CLOUD_STORAGE_BUCKET}`));
