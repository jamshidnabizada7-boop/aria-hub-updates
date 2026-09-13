import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const categoryId = searchParams.get('categoryId');
  const difficulty = searchParams.get('difficulty');
  const limit = parseInt(searchParams.get('limit') || '50');
  
  try {
    const where: any = {
      status: 'published'
    };
    
    if (categoryId) where.categoryId = categoryId;
    if (difficulty) where.difficulty = difficulty;
    
    const questions = await prisma.interviewQuestion.findMany({
      where,
      take: limit,
      include: {
        category: true,
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching interview questions:', error);
    return NextResponse.json({ error: 'Failed to fetch interview questions' }, { status: 500 });
  }
}
