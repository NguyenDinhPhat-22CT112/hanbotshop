/**
 * Test Script: Cloudflare R2 Upload via Presigned URL
 * 
 * This script tests the complete file upload workflow:
 * 1. Login as admin
 * 2. Request upload intent (get presigned URL)
 * 3. Upload test image to R2
 * 4. Confirm upload
 * 5. Verify file is accessible
 */

const fs = require('fs');
const path = require('path');

if (fs.existsSync('.env')) process.loadEnvFile();

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@hanbotorder.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) throw new Error('SEED_ADMIN_PASSWORD is required');

async function login() {
    console.log('📝 Step 1: Logging in as admin...');
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        })
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    console.log('✅ Logged in successfully');
    console.log(`   User: ${data.user.email} (${data.user.role})`);
    return data.accessToken;
}

async function createUploadIntent(token, filename, contentType, size) {
    console.log('\n📝 Step 2: Creating upload intent...');
    const response = await fetch(`${API_BASE}/files/upload-intent`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            originalName: filename,
            mimeType: contentType,
            size: size,
            isPublic: true
        })
    });

    if (!response.ok) {
        throw new Error(`Create upload intent failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    console.log('✅ Upload intent created');
    console.log(`   File ID: ${data.file.id}`);
    console.log(`   Storage Key: ${data.file.storageKey}`);
    console.log(`   Upload URL: ${data.upload.url.substring(0, 80)}...`);
    console.log(`   Expires in: ${data.upload.expiresInSeconds}s`);
    return data;
}

async function uploadToR2(uploadUrl, fileBuffer, contentType) {
    console.log('\n📝 Step 3: Uploading file to Cloudflare R2...');
    console.log(`   File size: ${fileBuffer.length} bytes`);
    console.log(`   Content-Type: ${contentType}`);

    const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': contentType
        },
        body: fileBuffer
    });

    if (!response.ok) {
        throw new Error(`Upload to R2 failed: ${response.status} ${await response.text()}`);
    }

    console.log('✅ File uploaded to R2 successfully');
    console.log(`   Response status: ${response.status}`);
}

async function confirmUpload(token, fileId) {
    console.log('\n📝 Step 4: Confirming upload...');
    const response = await fetch(`${API_BASE}/files/${fileId}/confirm`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Confirm upload failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    console.log('✅ Upload confirmed');
    console.log(`   Upload status: ${data.uploadStatus}`);
    console.log(`   Confirmed at: ${data.confirmedAt}`);
    return data;
}

async function verifyFile(token, fileId) {
    console.log('\n📝 Step 5: Verifying file metadata...');
    const response = await fetch(`${API_BASE}/files/${fileId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`Get file failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    console.log('✅ File metadata retrieved');
    console.log(`   File ID: ${data.id}`);
    console.log(`   Original name: ${data.originalName}`);
    console.log(`   Size: ${data.size} bytes`);
    console.log(`   Public URL: ${data.url}`);
    return data;
}

async function createTestImage() {
    // Create a simple 1x1 PNG image (smallest valid PNG)
    const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, // data
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
        0x42, 0x60, 0x82
    ]);

    return pngBuffer;
}

async function main() {
    try {
        console.log('🚀 Starting Cloudflare R2 Upload Test\n');
        console.log('='.repeat(60));

        // Create test image
        const testImage = await createTestImage();
        const filename = `test-image-${Date.now()}.png`;
        const contentType = 'image/png';

        // Step 1: Login
        const token = await login();

        // Step 2: Create upload intent
        const uploadIntent = await createUploadIntent(token, filename, contentType, testImage.length);

        // Step 3: Upload to R2
        await uploadToR2(uploadIntent.upload.url, testImage, contentType);

        // Step 4: Confirm upload
        await confirmUpload(token, uploadIntent.file.id);

        // Step 5: Verify file
        const fileData = await verifyFile(token, uploadIntent.file.id);

        console.log('\n' + '='.repeat(60));
        console.log('🎉 SUCCESS! R2 Upload Test Complete');
        console.log('='.repeat(60));
        console.log('\n📊 Summary:');
        console.log(`   ✅ File uploaded: ${filename}`);
        console.log(`   ✅ File size: ${testImage.length} bytes`);
        console.log(`   ✅ Storage key: ${fileData.storageKey}`);
        console.log(`   ✅ Public URL: ${fileData.url}`);
        console.log('\n💡 Next steps:');
        console.log('   1. Try accessing the public URL in browser');
        console.log('   2. Check Cloudflare R2 dashboard for the uploaded file');
        console.log('   3. Test with a real image file');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\n📝 Troubleshooting:');
        console.error('   1. Verify API is running on http://localhost:3001');
        console.error('   2. Check .env file has correct R2 credentials');
        console.error('   3. Verify R2 bucket exists and is accessible');
        console.error('   4. Check R2 CORS configuration allows PUT requests');
        process.exit(1);
    }
}

main();
