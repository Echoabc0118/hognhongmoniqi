import { NextResponse } from 'next/server';
import { db } from '@/storage/database/drizzle-client';
import { blogPosts } from '@/storage/database/shared/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const posts = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        summary: blogPosts.summary,
        createdAt: blogPosts.createdAt
      })
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt));

    const postsWithReadTime = posts.map((post) => ({
      ...post,
      readTime: Math.ceil(post.summary.length / 50),
    }));

    return NextResponse.json({ posts: postsWithReadTime });
  } catch (error) {
    console.error('Blog API error:', error);
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}
