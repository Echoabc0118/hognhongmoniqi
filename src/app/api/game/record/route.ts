import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/storage/database/drizzle-client';
import { gameRecords } from '@/storage/database/shared/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, scenario, finalScore, result } = body;

    if (!userId || !scenario || finalScore === undefined || !result) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!['won', 'lost', 'timeout'].includes(result)) {
      return NextResponse.json(
        { error: '无效的游戏结果' },
        { status: 400 }
      );
    }

    if (finalScore < 0 || finalScore > 100) {
      return NextResponse.json(
        { error: '分数必须在 0-100 之间' },
        { status: 400 }
      );
    }

    const [record] = await db
      .insert(gameRecords)
      .values({
        userId,
        scenario,
        finalScore,
        result,
      })
      .returning();

    return NextResponse.json({
      success: true,
      record,
    });
  } catch (error) {
    console.error('保存游戏记录 API 错误:', error);
    return NextResponse.json(
      { error: '保存游戏记录失败' },
      { status: 500 }
    );
  }
}
