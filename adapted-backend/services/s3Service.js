const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Use same AWS_REGION pattern as the codebase (SES helper also uses AWS_REGION)
const REGION = process.env.AWS_REGION || 'ap-south-1';

// Optional explicit creds - Phase B6: standardized on AWS_ACCESS_KEY_ID/
// AWS_SECRET_ACCESS_KEY (the SDK's own naming, matching .env.example) instead
// of the AWS_ACCESS_KEY/AWS_SECRET_KEY names this file and the email helper
// used to read, which .env.example never actually documented.
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Lazy client cache (create once, reuse)
let _s3 = null;

const getS3Client = () => {
    if (_s3) return _s3;

    const cfg = { region: REGION };

    // If credentials are provided, use them; otherwise default AWS chain (IAM role, etc.)
    if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
        cfg.credentials = {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY
        };
    }

    _s3 = new S3Client(cfg);
    return _s3;
};

const getBucket = () => {
    const bucket = process.env.AWS_S3_BUCKET;
    if (!bucket) {
        throw new Error('AWS_S3_BUCKET is required');
    }
    return bucket;
};

// Creates a presigned URL for uploading a file directly to S3 via HTTP PUT.
const presignPutObject = async ({ key, contentType, expiresInSeconds = 300 }) => {
    const s3 = getS3Client();
    const bucket = getBucket();

    const cmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });

    return { uploadUrl, bucket, key, expiresInSeconds };
};

// Creates a presigned URL for downloading/viewing a file from S3.
const presignGetObject = async ({ key, expiresInSeconds = 300 }) => {
    const s3 = getS3Client();
    const bucket = getBucket();

    const cmd = new GetObjectCommand({
        Bucket: bucket,
        Key: key
    });

    const downloadUrl = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });

    return { downloadUrl, bucket, key, expiresInSeconds };
};

module.exports = {
    presignPutObject,
    presignGetObject
};