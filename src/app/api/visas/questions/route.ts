import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const countryId = searchParams.get('countryId');
  const categoryId = searchParams.get('categoryId');
  const difficulty = searchParams.get('difficulty');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  try {
    const where: any = {
      status: 'published'
    };
    
    if (countryId) where.countryId = countryId;
    if (categoryId) where.categoryId = categoryId;
    if (difficulty) where.difficulty = difficulty;
    
    const questions = await prisma.visaQuestion.findMany({
      where,
      take: limit,
      include: {
        country: true,
        category: true,
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching visa questions:', error);
    return NextResponse.json({ error: 'Failed to fetch visa questions' }, { status: 500 });
  }
}
