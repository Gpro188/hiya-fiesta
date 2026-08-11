import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bucketName = process.env.R2_BUCKET_NAME;

    if (!bucketName) {
      return NextResponse.json(
        { error: "R2 bucket configuration is missing" },
        { status: 500 }
      );
    }

    let isTruncated = true;
    let continuationToken: string | undefined = undefined;
    let totalDeleted = 0;

    // Iterate through all objects in the bucket
    while (isTruncated) {
      // @ts-ignore
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      });

      // @ts-ignore
      const listResponse = await s3Client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: listResponse.Contents.map((item: any) => ({ Key: item.Key })),
            Quiet: true,
          },
        });

        await s3Client.send(deleteCommand);
        totalDeleted += listResponse.Contents.length;
      }

      isTruncated = (listResponse as any).IsTruncated ?? false;
      continuationToken = (listResponse as any).NextContinuationToken;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} objects from the bucket.`,
    });
  } catch (error) {
    console.error("Error clearing bucket:", error);
    return NextResponse.json(
      { error: "Failed to clear bucket" },
      { status: 500 }
    );
  }
}
