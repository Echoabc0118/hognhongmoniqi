import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/storage/database/drizzle-client';
import { gameRecords } from '@/storage/database/shared/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用户ID' },
        { status: 400 }
      );
    }

    const records = await db
      .select()
      .from(gameRecords)
      .where(eq(gameRecords.userId, parseInt(userId)))
      .orderBy(desc(gameRecords.playedAt))
      .limit(50);

    const totalGames = records.length;
    const wonGames = records.filter(r => r.result === 'won').length;
    const lostGames = records.filter(r => r.result === 'lost').length;
    const timeoutGames = records.filter(r => r.result === 'timeout').length;
    const avgScore = totalGames > 0
      ? Math.round(records.reduce((sum, r) => sum + r.finalScore, 0) / totalGames)
      : 0;

    return NextResponse.json({
      records,
      stats: {
        total: totalGames,
        won: wonGames,
        lost: lostGames,
        timeout: timeoutGames,
        winRate: totalGames > 0 ? Math.round((wonGames / totalGames) * 100) : 0,
        avgScore,
      },
    });
  } catch (error) {
    console.error('获取用户游戏历史 API 错误:', error);
    return NextResponse.json(
      { error: '获取游戏记录失败' },
      { status: 500 }
    );
  }
}
