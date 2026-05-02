import { NextResponse } from 'next/server';
import { db } from '@/storage/database/drizzle-client';
import { gameRecords, users } from '@/storage/database/shared/schema';
import { desc, eq } from 'drizzle-orm';

const RESULT_PRIORITY: Record<string, number> = {
  won: 3,
  timeout: 2,
  lost: 1,
};

export async function GET() {
  try {
    const records = await db
      .select({
        id: gameRecords.id,
        userId: gameRecords.userId,
        username: users.username,
        scenario: gameRecords.scenario,
        finalScore: gameRecords.finalScore,
        result: gameRecords.result,
        playedAt: gameRecords.playedAt,
      })
      .from(gameRecords)
      .innerJoin(users, eq(gameRecords.userId, users.id))
      .orderBy(desc(gameRecords.finalScore), desc(gameRecords.playedAt))
      .limit(500);

    const userBestScores = new Map<number, (typeof records)[number]>();

    records.forEach((record) => {
      const current = userBestScores.get(record.userId);
      if (!current || isBetterRecord(record, current)) {
        userBestScores.set(record.userId, record);
      }
    });

    const leaderboard = Array.from(userBestScores.values())
      .sort(compareLeaderboardRecords)
      .slice(0, 20)
      .map((record, index) => ({
        id: record.id,
        rank: index + 1,
        userId: record.userId,
        username: record.username,
        scenario: record.scenario,
        finalScore: record.finalScore,
        result: record.result,
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

export async function POST() {
  return NextResponse.json({
    success: false,
    message: '游戏记录已自动保存到排行榜',
  });
}

function isBetterRecord(
  record: { finalScore: number; result: string; playedAt: string },
  current: { finalScore: number; result: string; playedAt: string }
): boolean {
  return compareLeaderboardRecords(record, current) < 0;
}

function compareLeaderboardRecords(
  a: { finalScore: number; result: string; playedAt: string },
  b: { finalScore: number; result: string; playedAt: string }
): number {
  if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore;

  const aPriority = RESULT_PRIORITY[a.result] ?? 0;
  const bPriority = RESULT_PRIORITY[b.result] ?? 0;
  if (aPriority !== bPriority) return bPriority - aPriority;

  return new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime();
}
