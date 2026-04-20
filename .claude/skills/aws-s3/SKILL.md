---
name: aws-s3
description: AWS S3 file upload skill for implementing secure file uploads, presigned URLs, image optimization, and CloudFront CDN integration. Use when working with file storage and media uploads.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# AWS S3 File Upload Skill

This skill helps you implement secure file uploads with AWS S3 and CloudFront CDN.

## Tech Stack Context

- **Storage**: AWS S3
- **CDN**: CloudFront
- **Runtime**: Bun / Node.js
- **Image Processing**: Sharp (optional)

## Environment Variables

```bash
# AWS Configuration
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# CloudFront (optional)
CLOUDFRONT_DOMAIN=d1234567890.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=APKAXXXXXX
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
```

## S3 Client Setup

### Initialize AWS SDK

```typescript
// lib/aws/s3-client.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET_NAME = process.env.AWS_S3_BUCKET!;
export const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
```

## Presigned URL Pattern (Recommended)

### Generate Upload URL

```typescript
// lib/aws/presigned-urls.ts
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, BUCKET_NAME } from './s3-client';
import { nanoid } from 'nanoid';

interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

export async function generateUploadUrl(
  folder: string,
  filename: string,
  contentType: string,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): Promise<PresignedUploadResult> {
  // Generate unique key
  const extension = filename.split('.').pop() ?? '';
  const fileKey = `${folder}/${nanoid()}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
    ContentLength: maxSizeBytes,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 3600, // 1 hour
  });

  const publicUrl = CLOUDFRONT_DOMAIN
    ? `https://${CLOUDFRONT_DOMAIN}/${fileKey}`
    : `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

  return { uploadUrl, fileKey, publicUrl };
}
```

### tRPC Procedure for Upload URL

```typescript
// server/routers/uploads.ts
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc/init';
import { generateUploadUrl } from '@/lib/aws/presigned-urls';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // 25MB

export const uploadsRouter = router({
  getPropertyImageUploadUrl: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        filename: z.string(),
        contentType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate content type
      if (!ALLOWED_IMAGE_TYPES.includes(input.contentType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF',
        });
      }

      // Check permission
      await checkPermission(ctx.user.id, 'properties:write', input.propertyId);

      return generateUploadUrl(
        `properties/${input.propertyId}/images`,
        input.filename,
        input.contentType,
        MAX_IMAGE_SIZE
      );
    }),

  getDocumentUploadUrl: protectedProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
        filename: z.string(),
        contentType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ALLOWED_DOCUMENT_TYPES.includes(input.contentType)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid file type. Only PDF allowed.',
        });
      }

      return generateUploadUrl(
        `bookings/${input.bookingId}/documents`,
        input.filename,
        input.contentType,
        MAX_DOCUMENT_SIZE
      );
    }),

  confirmUpload: protectedProcedure
    .input(
      z.object({
        fileKey: z.string(),
        entityType: z.enum(['property', 'booking', 'user']),
        entityId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify file exists in S3
      const exists = await verifyFileExists(input.fileKey);
      if (!exists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        });
      }

      // Save file reference to database
      const [file] = await db
        .insert(files)
        .values({
          key: input.fileKey,
          entityType: input.entityType,
          entityId: input.entityId,
          uploadedBy: ctx.user.id,
        })
        .returning();

      return file;
    }),
});
```

## React Upload Component

### Presigned URL Upload Hook

```typescript
// hooks/use-file-upload.ts
'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api/client';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UseFileUploadOptions {
  onSuccess?: (fileKey: string, publicUrl: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: UploadProgress) => void;
}

export function usePropertyImageUpload(propertyId: string, options?: UseFileUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const getUploadUrl = api.uploads.getPropertyImageUploadUrl.useMutation();
  const confirmUpload = api.uploads.confirmUpload.useMutation();

  const upload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setProgress(null);

      try {
        // 1. Get presigned URL
        const { uploadUrl, fileKey, publicUrl } = await getUploadUrl.mutateAsync({
          propertyId,
          filename: file.name,
          contentType: file.type,
        });

        // 2. Upload to S3
        await uploadToS3(uploadUrl, file, (p) => {
          setProgress(p);
          options?.onProgress?.(p);
        });

        // 3. Confirm upload
        await confirmUpload.mutateAsync({
          fileKey,
          entityType: 'property',
          entityId: propertyId,
        });

        options?.onSuccess?.(fileKey, publicUrl);
        return { fileKey, publicUrl };
      } catch (error) {
        options?.onError?.(error as Error);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [propertyId, getUploadUrl, confirmUpload, options]
  );

  return { upload, isUploading, progress };
}

async function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}
```

### Upload Component with Drag & Drop

```typescript
// components/file-upload.tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePropertyImageUpload } from '@/hooks/use-file-upload';

interface FileUploadProps {
  propertyId: string;
  onUploadComplete: (url: string) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  className?: string;
}

export function FileUpload({
  propertyId,
  onUploadComplete,
  maxFiles = 10,
  accept = { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
  className,
}: FileUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const { upload, isUploading, progress } = usePropertyImageUpload(propertyId, {
    onSuccess: (_, publicUrl) => {
      onUploadComplete(publicUrl);
    },
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Create previews
    const newPreviews = acceptedFiles.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);

    // Upload files sequentially
    for (const file of acceptedFiles) {
      await upload(file);
    }
  }, [upload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled: isUploading,
  });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          isUploading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">
                Uploading... {progress?.percentage ?? 0}%
              </p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isDragActive
                  ? 'Drop files here'
                  : 'Drag & drop files here, or click to select'}
              </p>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP up to 10MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mt-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={preview}
                alt=""
                className="object-cover w-full h-full rounded-lg"
              />
              <button
                onClick={() => {
                  URL.revokeObjectURL(preview);
                  setPreviews((prev) => prev.filter((_, i) => i !== index));
                }}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Image Optimization

### Server-Side with Sharp

```typescript
// lib/aws/image-processing.ts
import sharp from 'sharp';

interface ImageVariant {
  suffix: string;
  width: number;
  height?: number;
  quality: number;
}

const IMAGE_VARIANTS: ImageVariant[] = [
  { suffix: 'thumbnail', width: 200, height: 200, quality: 80 },
  { suffix: 'medium', width: 800, quality: 85 },
  { suffix: 'large', width: 1920, quality: 90 },
];

export async function processPropertyImage(
  buffer: Buffer,
  originalKey: string
): Promise<{ key: string; url: string }[]> {
  const results = [];
  const basePath = originalKey.replace(/\.[^.]+$/, '');

  for (const variant of IMAGE_VARIANTS) {
    const processedBuffer = await sharp(buffer)
      .resize(variant.width, variant.height, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .webp({ quality: variant.quality })
      .toBuffer();

    const variantKey = `${basePath}-${variant.suffix}.webp`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: variantKey,
        Body: processedBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000',
      })
    );

    results.push({
      key: variantKey,
      url: `https://${CLOUDFRONT_DOMAIN}/${variantKey}`,
    });
  }

  return results;
}
```

## Delete Files

### Delete from S3

```typescript
// lib/aws/delete.ts
import { DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from './s3-client';

export async function deleteFile(fileKey: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    })
  );
}

export async function deleteFiles(fileKeys: string[]): Promise<void> {
  if (fileKeys.length === 0) return;

  await s3Client.send(
    new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: fileKeys.map((key) => ({ Key: key })),
      },
    })
  );
}
```

## S3 Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/public/*"
    }
  ]
}
```

## CloudFront Configuration

- Create distribution pointing to S3 bucket
- Enable Origin Access Control (OAC)
- Configure cache behaviors for different file types
- Set up HTTPS with ACM certificate

## Reference Documentation

- See `docs/architecture/tech-stack.md` for AWS setup
- See `.cursorrules` for file upload patterns
