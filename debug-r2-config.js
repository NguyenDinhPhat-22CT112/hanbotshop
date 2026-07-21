/**
 * Debug R2 Configuration
 * Tests R2 credentials and bucket access
 */

const { S3Client, HeadBucketCommand, ListObjectsV2Command, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

async function testR2Config() {
    console.log('🔍 R2 Configuration Debug\n');
    console.log('='.repeat(60));

    // Check environment variables
    console.log('\n📋 Environment Variables:');
    const endpoint = process.env.CLOUD_STORAGE_ENDPOINT;
    const bucket = process.env.CLOUD_STORAGE_BUCKET;
    const accessKeyId = process.env.CLOUD_STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUD_STORAGE_SECRET_ACCESS_KEY;
    const region = process.env.CLOUD_STORAGE_REGION || 'auto';

    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Bucket: ${bucket}`);
    console.log(`   Region: ${region}`);
    console.log(`   Access Key ID: ${accessKeyId ? accessKeyId.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`   Secret Key: ${secretAccessKey ? '***' + secretAccessKey.slice(-4) : 'NOT SET'}`);

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
        console.error('\n❌ ERROR: Missing required environment variables');
        console.error('   Please check your .env file');
        return;
    }

    // Create S3 client
    console.log('\n📝 Creating S3 client...');
    const client = new S3Client({
        region,
        endpoint: endpoint.replace(/\/$/, ''),
        forcePathStyle: true,
        credentials: {
            accessKeyId,
            secretAccessKey
        }
    });
    console.log('✅ S3 client created');

    // Test 1: Check bucket access
    console.log('\n📝 Test 1: Checking bucket access...');
    try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        console.log('✅ Bucket exists and is accessible');
    } catch (error) {
        console.error('❌ Cannot access bucket:', error.message);
        console.error('   Error code:', error.Code);
        console.error('\n💡 Possible issues:');
        console.error('   1. Bucket does not exist');
        console.error('   2. Credentials are invalid or expired');
        console.error('   3. Access key does not have permission to access this bucket');
        return;
    }

    // Test 2: List objects (optional)
    console.log('\n📝 Test 2: Listing objects in bucket...');
    try {
        const response = await client.send(new ListObjectsV2Command({
            Bucket: bucket,
            MaxKeys: 5
        }));
        console.log(`✅ Can list objects. Found ${response.KeyCount || 0} objects (showing max 5)`);
        if (response.Contents && response.Contents.length > 0) {
            console.log('   Recent objects:');
            response.Contents.forEach(obj => {
                console.log(`     - ${obj.Key} (${obj.Size} bytes)`);
            });
        }
    } catch (error) {
        console.error('⚠️  Cannot list objects:', error.message);
        console.error('   This might be a permission issue, but upload may still work');
    }

    // Test 3: Try to put an object
    console.log('\n📝 Test 3: Attempting to upload a test object...');
    const testKey = `test/debug-${Date.now()}.txt`;
    const testContent = 'R2 configuration test';

    try {
        await client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: testKey,
            Body: testContent,
            ContentType: 'text/plain'
        }));
        console.log('✅ Successfully uploaded test object');
        console.log(`   Key: ${testKey}`);
        console.log(`   Public URL: ${endpoint}/${bucket}/${testKey}`);
    } catch (error) {
        console.error('❌ Cannot upload object:', error.message);
        console.error('   Error code:', error.Code || error.name);
        console.error('\n💡 Possible issues:');
        console.error('   1. Access key does not have write permission');
        console.error('   2. Bucket policy restricts uploads');
        console.error('   3. CORS is blocking the request (if from browser)');
        return;
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ R2 Configuration Test Complete');
    console.log('\n📊 Summary:');
    console.log('   ✅ Environment variables configured');
    console.log('   ✅ Can access bucket');
    console.log('   ✅ Can upload objects');
    console.log('\n💡 Next step: Test presigned URL upload');
}

testR2Config().catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
});
