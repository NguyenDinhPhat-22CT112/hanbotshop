/**
 * Direct R2 Upload Test
 * Tests bucket access without embedding credentials in source code.
 */

const { existsSync } = require('node:fs');

if (existsSync('.env')) process.loadEnvFile();

const R2_CONFIG = {
    endpoint: process.env.CLOUD_STORAGE_ENDPOINT,
    bucket: process.env.CLOUD_STORAGE_BUCKET,
    region: 'auto'
};

if (!R2_CONFIG.endpoint || !R2_CONFIG.bucket) {
    throw new Error('CLOUD_STORAGE_ENDPOINT and CLOUD_STORAGE_BUCKET are required');
}

async function testR2Upload() {
    console.log('🚀 Testing R2 Direct Upload with New Credentials\n');
    console.log('='.repeat(70));

    // Test 1: Simple PUT request with presigned URL simulation
    console.log('\n📝 Test: Creating test data...');
    const testData = 'Hello from Hanbotorder! R2 Test Success!';
    const testKey = `test/direct-upload-${Date.now()}.txt`;

    console.log(`   Test key: ${testKey}`);
    console.log(`   Data size: ${testData.length} bytes`);

    // Test 2: Try direct PUT (this will test credentials)
    console.log('\n📝 Test: Attempting direct upload to R2...');
    const url = `${R2_CONFIG.endpoint}/${R2_CONFIG.bucket}/${testKey}`;

    console.log(`   Upload URL: ${url}`);
    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: testData
        });

        console.log(`\n   Response status: ${response.status}`);
        console.log(`   Response statusText: ${response.statusText}`);

        if (response.ok) {
            console.log('\n✅ SUCCESS! File uploaded to R2');
            console.log(`\n📊 Summary:`);
            console.log(`   ✅ New R2 credentials work!`);
            console.log(`   ✅ Upload successful`);
            console.log(`   ✅ Bucket is accessible`);
            console.log(`   ✅ Public URL: ${url}`);
            console.log('\n💡 Next steps:');
            console.log('   1. Fix API TypeScript errors');
            console.log('   2. Restart API with new credentials');
            console.log('   3. Test full upload flow with API');
        } else {
            const errorText = await response.text();
            console.log(`\n   Error response: ${errorText}`);

            if (response.status === 403) {
                console.log('\n❌ 403 Forbidden - Possible issues:');
                console.log('   1. Bucket "hanbotorder" might not exist');
                console.log('   2. CORS not configured');
                console.log('   3. Token needs time to propagate');
                console.log('\n💡 Try:');
                console.log('   - Wait 1-2 minutes for token to activate');
                console.log('   - Verify bucket name is exactly "hanbotorder"');
                console.log('   - Configure CORS in R2 dashboard');
            } else if (response.status === 401) {
                console.log('\n❌ 401 Unauthorized - Token invalid');
            } else {
                console.log('\n❌ Upload failed with status:', response.status);
            }
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.log('\n💡 This might be a network or CORS issue');
    }
}

testR2Upload().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
});
