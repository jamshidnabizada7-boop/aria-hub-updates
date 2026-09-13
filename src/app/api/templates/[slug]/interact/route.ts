import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const body = await request.json();
    const { action, payload } = body;
    
    // TODO: Verify NextAuth session and get userId
    // For now, assume a dummy userId if none provided
    const userId = payload.userId || 'dummy-user-id';
    
    const template = await prisma.documentTemplate.findUnique({
      where: { slug: params.slug }
    });
    
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }
    
    switch (action) {
      case 'comment':
        const comment = await prisma.templateComment.create({
          data: {
            content: payload.content,
            templateId: template.id,
            userId,
          }
        });
        return NextResponse.json({ success: true, data: comment });
        
      case 'rate':
        const rating = await prisma.templateRating.upsert({
          where: {
            templateId_userId: { templateId: template.id, userId }
          },
          update: { score: payload.score },
          create: { score: payload.score, templateId: template.id, userId }
        });
        return NextResponse.json({ success: true, data: rating });
        
      case 'bookmark':
        if (payload.bookmarked) {
          const bookmark = await prisma.templateBookmark.upsert({
            where: {
              templateId_userId: { templateId: template.id, userId }
            },
            update: {},
            create: { templateId: template.id, userId }
          });
          return NextResponse.json({ success: true, data: bookmark });
        } else {
          await prisma.templateBookmark.delete({
            where: {
              templateId_userId: { templateId: template.id, userId }
            }
          }).catch(() => {}); // ignore if it doesn't exist
          return NextResponse.json({ success: true });
        }
        
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Error handling interaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process interaction' },
      { status: 500 }
    );
  }
}
