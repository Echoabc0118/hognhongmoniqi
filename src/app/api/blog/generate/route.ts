import { NextResponse } from 'next/server';
import { generateText } from '@/lib/ai/generate-text';
import { ProviderError, getHttpStatusForProviderError } from '@/lib/provider-errors';
import { db } from '@/storage/database/drizzle-client';
import { blogPosts } from '@/storage/database/shared/schema';

export async function POST() {
  try {
    const topics = [
      '如何应对伴侣的冷战',
      '送礼物避雷指南',
      '异地恋生存法则',
      '如何拒绝不合理要求',
      '纪念日惊喜攻略',
      '约会话题推荐',
      '如何处理婆媳关系',
      '恋爱中的安全感建立',
      '前任问题怎么谈',
      '吵架后的正确沟通方式',
    ];

    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

    const prompt = `你是一个恋爱专栏作者，擅长写轻松幽默的情感文章。
请写一篇关于“${randomTopic}”的文章。

要求：
1. 风格轻松幽默，像和朋友聊天一样。
2. 字数在 300-500 字之间。
3. 内容实用，能给读者一些有价值的建议。
4. 使用生动的例子和比喻。
5. 语气友好，带一点调侃。

请以 JSON 格式返回，格式如下：
{
  "title": "文章标题",
  "summary": "文章摘要，一句话，50字以内",
  "content": "文章正文"
}`;

    const response = await generateText({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      operation: 'blog_generate',
    });

    let articleData: { title?: string; summary?: string; content?: string };
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        articleData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法从响应中提取 JSON');
      }
    } catch {
      throw new Error('解析文章内容失败');
    }

    if (!articleData.title || !articleData.summary || !articleData.content) {
      throw new Error('文章内容不完整');
    }

    const [insertedPost] = await db
      .insert(blogPosts)
      .values({
        title: articleData.title,
        summary: articleData.summary,
        content: articleData.content,
      })
      .returning();

    return NextResponse.json({
      success: true,
      post: insertedPost,
    });
  } catch (error) {
    console.error('Generate blog API error:', error);

    if (error instanceof ProviderError) {
      return NextResponse.json(
        { error: error.publicMessage, category: error.category },
        { status: getHttpStatusForProviderError(error) }
      );
    }

    return NextResponse.json(
      { error: '生成文章失败' },
      { status: 500 }
    );
  }
}
