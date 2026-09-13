import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCurrentAdmin } from '@/lib/admin-auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    
    // Build where clause
    const where: any = {
      status: 'published'
    };
    
    if (category) {
      where.category = {
        slug: category
      };
    }
    
    if (featured === 'true') {
      where.featured = true;
    }
    
    const templates = await prisma.documentTemplate.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { ratings: true, bookmarks: true, comments: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Admin-only: this endpoint publishes arbitrary document content.
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    const template = await prisma.documentTemplate.create({
      data: {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        content: body.content,
        previewUrl: body.previewUrl,
        fileDocxUrl: body.fileDocxUrl,
        filePdfUrl: body.filePdfUrl,
        isPremium: body.isPremium || false,
        categoryId: body.categoryId,
        filters: body.filters,
        requiredFields: body.requiredFields,
        commonMistakes: body.commonMistakes,
        writingTips: body.writingTips,
        status: body.status || 'published',
        featured: body.featured || false,
      }
    });
    
    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
