import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@clerk/nextjs/server";
import { requireActionOrg } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { MAX_FILE_BYTES } from "@/lib/spreadsheet";

/**
 * Issues Vercel Blob client-upload tokens (direct browser → storage, so large
 * spreadsheets never traverse this serverless function's 4.5 MB body limit).
 *
 * Every token request is authenticated (Clerk session + app:create), bound to
 * the caller's own org path prefix (`<orgId>/...` — a user cannot request a
 * pathname under another workspace), constrained to spreadsheet content types
 * and MAX_FILE_BYTES, and given a random suffix so URLs stay unguessable.
 */
const SPREADSHEET_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/csv",
  "text/plain",
  "application/octet-stream",
];

export async function POST(request: Request): Promise<Response> {
  try {
    // Auth first — anonymous probes get 401 regardless of body shape.
    // Throws AuthRequiredError when signed out.
    const ctx = await requireActionOrg();
    const { userId } = await auth();
    if (!userId || !can(ctx.role, "app:create")) {
      return Response.json({ error: "Not allowed to upload here." }, { status: 403 });
    }

    let body: HandleUploadBody;
    try {
      body = (await request.json()) as HandleUploadBody;
    } catch {
      return Response.json({ error: "Invalid upload request." }, { status: 400 });
    }

    const result = await handleUpload({
      request,
      body,
      async onBeforeGenerateToken(pathname) {
        // Re-derive the org server-side; the client may only write under it.
        if (!pathname.startsWith(`${ctx.orgId}/`)) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: SPREADSHEET_TYPES,
          maximumSizeInBytes: MAX_FILE_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload not authorized.";
    return Response.json({ error: message }, { status: 401 });
  }
}
