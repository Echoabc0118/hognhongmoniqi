import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/storage/database/drizzle-client';
import { gameRecords, users } from '@/storage/database/shared/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const records = await db
      .select({
        id: gameRecords.id,
        userId: gameRecords.userId,
        username: users.username,
        finalScore: gameRecords.finalScore,
        result: gameRecords.result,
        playedAt: gameRecords.playedAt
      })
      .from(gameRecords)
      .innerJoin(users, eq(gameRecords.userId, users.id))
      .where(eq(gameRecords.result, 'won'))
      .orderBy(desc(gameRecords.finalScore), desc(gameRecords.playedAt))
      .limit(100);

    const userBestScores = new Map();
    records.forEach((record) => {
      const userId = record.userId;
      if (!userBestScores.has(userId)) {
        userBestScores.set(userId, record);
      } else {
        const current = userBestScores.get(userId);
        if (
          record.finalScore > current.finalScore ||
          (record.finalScore === current.finalScore &&
            record.playedAt && current.playedAt &&
            new Date(record.playedAt) < new Date(current.playedAt))
        ) {
          userBestScores.set(userId, record);
        }
      }
    });

    const leaderboard = Array.from(userBestScores.values())
      .slice(0, 20)
      .map((record, index) => ({
        id: record.id,
        rank: index + 1,
        userId: record.userId,
        username: record.username,
        finalScore: record.finalScore,
        achievedAt: record.playedAt,
      }));

    return NextResponse.json({
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error('Leaderboard GET error:', error);
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: '游戏记录已自动保存到排行榜',
  });
}
