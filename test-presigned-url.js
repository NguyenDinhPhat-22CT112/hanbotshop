/**
 * Test Presigned URL Generation
 * Checks if the presigned URL is valid
 */

const { existsSync } = require('node:fs');

if (existsSync('.env')) process.loadEnvFile();

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@hanbotorder.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) throw new Error('SEED_ADMIN_PASSWORD is required');

async function login() {
    console.log('📝 Logging in...');
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        })
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Logged in\n');
    return data.accessToken;
}

async function getUploadIntent(token) {
    console.log('📝 Getting upload intent...');
    const response = await fetch(`${API_BASE}/files/upload-intent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            originalName: 'test.png',
            mimeType: 'image/png',
            size: 100,
            isPublic: true
        })
    });

    if (!response.ok) {
        throw new Error(`Get upload intent failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Upload intent created\n');
    return data;
}

async function main() {
    try {
        console.log('🔍 Testing Presigned URL Generation\n');
        console.log('='.repeat(70));

        const token = await login();
        const intent = await getUploadIntent(token);

        console.log('📊 Upload Intent Details:');
        console.log(`   File ID: ${intent.file.id}`);
        console.log(`   Storage Key: ${intent.file.storageKey}`);
        console.log(`   Storage Provider: ${intent.upload.storageProvider}`);
        console.log(`   Upload Method: ${intent.upload.method}`);
        console.log(`   Expires In: ${intent.upload.expiresInSeconds}s`);
        console.log(`\n📝 Presigned URL:`);
        console.log(`   ${intent.upload.url}`);

        console.log('\n🔍 URL Analysis:');
        const url = new URL(intent.upload.url);
        console.log(`   Protocol: ${url.protocol}`);
        console.log(`   Host: ${url.hostname}`);
        console.log(`   Path: ${url.pathname}`);
        console.log(`   Has AWS Signature: ${url.searchParams.has('X-Amz-Signature') ? 'Yes' : 'No'}`);
        console.log(`   Has AWS Credentials: ${url.searchParams.has('X-Amz-Credential') ? 'Yes' : 'No'}`);
        console.log(`   Expires param: ${url.searchParams.get('X-Amz-Expires')}`);

        if (url.searchParams.has('X-Amz-Signature')) {
            console.log('\n✅ URL appears to be a valid presigned URL');
            console.log('\n💡 The 403 error might be due to:');
            console.log('   1. R2 API Token permissions - check if token has "Object Read & Write" permission');
            console.log('   2. R2 CORS configuration - needs to allow PUT method');
            console.log('   3. R2 bucket policy - might restrict access');
            console.log('   4. Credentials might be for wrong account/bucket');
            console.log('\n📋 To fix:');
            console.log('   1. Go to Cloudflare Dashboard → R2');
            console.log('   2. Check bucket "hanbotorder" exists');
            console.log('   3. Create new API Token with "Object Read & Write" permission');
            console.log('   4. Update .env with new credentials');
            console.log('   5. Configure CORS: allow PUT method and * origin (for testing)');
        } else {
            console.log('\n❌ URL does not have AWS signature - presigning failed!');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

main();
