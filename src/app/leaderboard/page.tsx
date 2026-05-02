'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  Trophy,
  Medal,
  Award,
  Clock,
  ArrowLeft,
  User,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  id: number;
  rank: number;
  userId: number;
  username: string;
  scenario: string;
  finalScore: number;
  result: 'won' | 'lost' | 'timeout';
  achievedAt: string;
}

export default function LeaderboardPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('获取排行榜失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-gray-400 font-bold text-lg">{rank}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getResultText = (result: LeaderboardEntry['result']) => {
    if (result === 'won') return '通关';
    if (result === 'timeout') return '次数用完';
    return '未哄好';
  };

  const isCurrentUser = (entry: LeaderboardEntry) => {
    return isAuthenticated && user && entry.userId === user.id;
  };

  const renderEntryMeta = (entry: LeaderboardEntry) => (
    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
      <Clock className="w-3 h-3 shrink-0" />
      <span className="truncate">
        {formatDate(entry.achievedAt)} · {getResultText(entry.result)} · {entry.scenario}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex-1">榜单风云</h1>
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {user.username}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                退出
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="outline" size="sm">
                  登录
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  注册
                </Button>
              </Link>
            </div>
          )}
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">排行榜 TOP 20</h2>
              <p className="text-gray-500 text-sm">
                所有游戏记录都会参与排名，按每位用户最佳成绩展示
              </p>
            </div>

            {!isAuthenticated && (
              <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800 text-center">
                  登录后，你的每局游戏成绩都会自动参与排行榜。
                </p>
              </div>
            )}

            {loading ? (
              <div className="text-center py-12 text-gray-400">加载中...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>还没有人上榜</p>
                <p className="text-sm mt-2">快来第一个挑战吧！</p>
                <Link href="/">
                  <Button className="mt-4 bg-pink-500 hover:bg-pink-600">
                    开始游戏
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg transition-all transform hover:scale-[1.02]',
                      isCurrentUser(entry)
                        ? 'bg-gradient-to-r from-pink-100 to-pink-50 border-2 border-pink-300 shadow-md'
                        : index === 0
                        ? 'bg-gradient-to-r from-yellow-100 to-amber-50 border-2 border-yellow-300 shadow-md'
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-100 to-slate-50 border-2 border-gray-300'
                        : 'bg-gradient-to-r from-amber-100 to-yellow-50 border-2 border-amber-300'
                    )}
                  >
                    <div className="w-12 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-lg truncate">
                          {entry.username}
                        </div>
                        {isCurrentUser(entry) && (
                          <span className="text-xs bg-pink-500 text-white px-2 py-1 rounded-full font-medium">
                            你
                          </span>
                        )}
                      </div>
                      {renderEntryMeta(entry)}
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-bold text-pink-600">
                        {entry.finalScore}
                      </div>
                      <div className="text-xs text-gray-500">愉悦值</div>
                    </div>
                  </div>
                ))}

                {leaderboard.slice(3).map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors',
                      isCurrentUser(entry)
                        ? 'bg-pink-100 border-2 border-pink-300'
                        : 'bg-gray-50'
                    )}
                  >
                    <div className="w-8 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{entry.username}</div>
                        {isCurrentUser(entry) && (
                          <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">
                            你
                          </span>
                        )}
                      </div>
                      {renderEntryMeta(entry)}
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-bold text-pink-600">
                        {entry.finalScore}
                      </div>
                      <div className="text-xs text-gray-500">愉悦值</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>所有结局都会进入排行榜，按最终愉悦值排名。</p>
          <p className="mt-1">每个用户只展示一条最佳记录，同分时通关记录优先。</p>
        </div>
      </div>
    </div>
  );
}
