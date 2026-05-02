'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Medal, Award, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  open: boolean;
  onClose: () => void;
}

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

export function Leaderboard({ open, onClose }: LeaderboardProps) {
  const { user, isAuthenticated } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLeaderboard();
    }
  }, [open]);

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
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-gray-400 font-medium">{rank}</span>;
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            榜单风云
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              还没有人上榜，快来第一个挑战吧！
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-colors',
                    isCurrentUser(entry)
                      ? 'bg-pink-100 border-2 border-pink-300'
                      : entry.rank <= 3
                      ? 'bg-yellow-50'
                      : 'bg-gray-50'
                  )}
                >
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium truncate">
                        {entry.username}
                      </div>
                      {isCurrentUser(entry) && (
                        <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">
                          你
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {formatDate(entry.achievedAt)} · {getResultText(entry.result)} · {entry.scenario}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-pink-600">
                      {entry.finalScore}
                    </div>
                    <div className="text-xs text-gray-500">愉悦值</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {!isAuthenticated && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800 text-center">
              登录后，每局游戏成绩都会自动参与排行榜。
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
