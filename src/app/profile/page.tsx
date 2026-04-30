'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  User,
  Trophy,
  Target,
  Clock,
  TrendingUp,
  LogOut,
  ArrowLeft,
  Gamepad2,
  Smile,
  Frown,
  Timer
} from 'lucide-react';

interface GameRecord {
  id: number;
  user_id: number;
  scenario: string;
  final_score: number;
  result: 'won' | 'lost' | 'timeout';
  played_at: string;
}

interface GameStats {
  total: number;
  won: number;
  lost: number;
  timeout: number;
  winRate: number;
  avgScore: number;
}

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchRecords();
  }, [isAuthenticated, user]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      console.log('[个人中心] 开始获取游戏记录，用户ID:', user?.id);
      const response = await fetch(`/api/user/records?userId=${user?.id}`);
      console.log('[个人中心] 响应状态:', response.status);
      const data = await response.json();
      console.log('[个人中心] 响应数据:', data);

      if (response.ok) {
        setRecords(data.records || []);
        setStats(data.stats || null);
      } else {
        console.error('[个人中心] 获取记录失败:', data.error);
        alert('获取游戏记录失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('[个人中心] 获取游戏记录失败:', error);
      alert('获取游戏记录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const formatPlayTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'won':
        return <Smile className="w-5 h-5 text-green-500" />;
      case 'lost':
        return <Frown className="w-5 h-5 text-red-500" />;
      case 'timeout':
        return <Timer className="w-5 h-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'won':
        return '开心';
      case 'lost':
        return '不开心';
      case 'timeout':
        return '超时';
      default:
        return '';
    }
  };

  const getResultClass = (result: string) => {
    switch (result) {
      case 'won':
        return 'bg-green-50 text-green-700';
      case 'lost':
        return 'bg-red-50 text-red-700';
      case 'timeout':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Button>
          <h1 className="text-2xl font-bold flex-1">个人中心</h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </Button>
        </div>

        {/* 用户信息卡片 */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-pink-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.username}</h2>
                <p className="text-gray-500 text-sm">
                  注册于 {new Date(user?.createdAt || '').toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 游戏统计 */}
        {stats && (
          <Card className="mb-6 shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-pink-500" />
                游戏统计
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-pink-600">{stats.total}</div>
                  <div className="text-sm text-gray-500">总游戏次数</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.won}</div>
                  <div className="text-sm text-gray-500">成功次数</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{stats.winRate}%</div>
                  <div className="text-sm text-gray-500">成功率</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.avgScore}</div>
                  <div className="text-sm text-gray-500">平均分数</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 游戏历史 */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-pink-500" />
              游戏历史
            </h3>
            {records.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>还没有游戏记录</p>
                <Button
                  onClick={() => router.push('/')}
                  className="mt-4 bg-pink-500 hover:bg-pink-600"
                >
                  开始游戏
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{record.scenario}</span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${getResultClass(
                            record.result
                          )}`}
                        >
                          {getResultIcon(record.result)}
                          {getResultText(record.result)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatPlayTime(record.played_at)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4 text-pink-500" />
                        <span>愉悦值：</span>
                        <span className="font-bold">{record.final_score}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
