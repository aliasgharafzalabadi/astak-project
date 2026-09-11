const Minio = require('minio');

const receiptObjectKey = (transactionId) => `receipts/${transactionId}.txt`;

function createReceiptStorage(minioConfig, { urlExpirySeconds }) {
  const { endPoint, port, useSSL, accessKey, secretKey, bucket, region } = minioConfig;

  const client = new Minio.Client({ endPoint, port, useSSL, accessKey, secretKey, region });
  const publicClient = new Minio.Client({ ...minioConfig.public, accessKey, secretKey, region });

  return {
    async ensureBucket() {
      if (await client.bucketExists(bucket)) {
        return;
      }
      try {
        await client.makeBucket(bucket, region);
      } catch (err) {
        if (err.code !== 'BucketAlreadyOwnedByYou' && err.code !== 'BucketAlreadyExists') {
          throw err;
        }
      }
    },

    async upload(objectKey, content, contentType) {
      const body = Buffer.from(content, 'utf8');
      await client.putObject(bucket, objectKey, body, body.length, { 'Content-Type': contentType });
    },

    getDownloadUrl(objectKey) {
      return publicClient.presignedGetObject(bucket, objectKey, urlExpirySeconds);
    },
  };
}

module.exports = { createReceiptStorage, receiptObjectKey };
