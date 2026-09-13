import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Story ID is required' }, { status: 400 });
    }

    const story = await prisma.successStory.update({
      where: { id },
      data: {
        likes: { increment: 1 }
      }
    });

    return NextResponse.json({ success: true, likes: story.likes });
  } catch (error) {
    console.error('Error voting for story:', error);
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}
