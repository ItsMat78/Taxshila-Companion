// This file has been replaced by the more specific /api/admin/create-student-auth/route.ts
// to align with the working pattern of the edit student feature and is no longer in use.
// It is intentionally left blank and can be deleted.

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({ success: false, error: "This endpoint is deprecated." }, { status: 404 });
}
