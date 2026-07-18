/**
 * ABW-BOS MinIO Storage Library
 *
 * Handles file uploads to MinIO object storage instead of localStorage/base64.
 * All files (logos, letterheads, documents, CVs, etc.) are stored in MinIO
 * and the database stores only the file path/URL.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT;
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "443");
const MINIO_USE_SSL = process.env.MINIO_USE_SSL !== "false"; // default true
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_BUCKET = process.env.MINIO_BUCKET || "abw-bos";

function isMinioConfigured(): boolean {
  return !!(MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY);
}

const protocol = MINIO_USE_SSL ? "https" : "http";
const endpoint = MINIO_ENDPOINT ? `${protocol}://${MINIO_ENDPOINT}:${MINIO_PORT}` : "";

// Lazily-instantiated S3 client (only created when MinIO is configured)
let s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (s3Client) return s3Client;
  if (!isMinioConfigured()) {
    throw new Error("MinIO is not configured. Set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY env vars.");
  }
  s3Client = new S3Client({
    endpoint: endpoint!,
    region: "us-east-1",
    credentials: {
      accessKeyId: MINIO_ACCESS_KEY!,
      secretAccessKey: MINIO_SECRET_KEY!,
    },
    forcePathStyle: true,
  });
  return s3Client;
}

/**
 * Upload a file to MinIO storage.
 * @param folder - e.g. "company/logo", "employees/cv", "invoices/pdf"
 * @param filename - the file name
 * @param data - file content as Buffer or Uint8Array
 * @param contentType - MIME type
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  folder: string,
  filename: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const key = `${folder}/${filename}`;
  
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  );

  // Return the public URL
  return `${endpoint}/${MINIO_BUCKET}/${key}`;
}

/**
 * Upload a base64-encoded file to MinIO.
 * @param folder - e.g. "company/logo"
 * @param filename - file name
 * @param base64Data - base64 encoded data (with or without data URL prefix)
 * @returns The public URL
 */
export async function uploadBase64(
  folder: string,
  filename: string,
  base64Data: string,
): Promise<string> {
  // Remove data URL prefix if present
  const base64 = base64Data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  
  // Detect content type from data URL prefix or default to octet-stream
  const contentTypeMatch = base64Data.match(/^data:([^;]+);/);
  const contentType = contentTypeMatch ? contentTypeMatch[1] : "application/octet-stream";

  return uploadFile(folder, filename, buffer, contentType);
}

/**
 * Delete a file from MinIO.
 * @param fileUrl - The full URL of the file to delete
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  // Extract key from URL: https://endpoint/bucket/folder/filename
  const url = new URL(fileUrl);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // First part is bucket name, rest is the key
  const key = pathParts.slice(1).join("/");
  
  if (key) {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
      })
    );
  }
}

/**
 * Get the public URL for a file in MinIO.
 * @param key - The file key (e.g. "company/logo.png")
 * @returns The full public URL
 */
export function getFileUrl(key: string): string {
  return `${endpoint}/${MINIO_BUCKET}/${key}`;
}

export { isMinioConfigured, MINIO_BUCKET, endpoint as MINIO_ENDPOINT_URL };
