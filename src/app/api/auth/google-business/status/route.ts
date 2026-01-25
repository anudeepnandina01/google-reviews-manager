import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET: Check if user has Google Business Profile connected
export async function GET() {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const token = await prisma.googleBusinessToken.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      scope: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  
  if (!token) {
    return NextResponse.json({
      connected: false,
    });
  }
  
  return NextResponse.json({
    connected: true,
    scope: token.scope,
    connectedAt: token.createdAt,
    tokenExpiresAt: token.expiresAt,
  });
}

// DELETE: Disconnect Google Business Profile
export async function DELETE() {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Delete the token from database
  await prisma.googleBusinessToken.delete({
    where: { userId: session.userId },
  }).catch(() => {
    // Ignore if not found
  });
  
  return NextResponse.json({
    success: true,
    message: "Google Business Profile disconnected",
  });
}
