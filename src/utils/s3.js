import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.config.js";

const s3Client = new S3Client({ region: env.AWS_REGION });

const SIGNED_URL_EXPIRY_SECONDS = 900;

export const uploadToS3 = async (buffer, key, mimetype) => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );
  return key;
};

export const getSignedUrlFor = async (key) => {
  if (!key) return null;
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
    { expiresIn: SIGNED_URL_EXPIRY_SECONDS }
  );
};
