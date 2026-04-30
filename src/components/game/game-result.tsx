'use client';

import { useGame } from '@/context/game-context';
import { useAuth } from '@/context/auth-context';
import { PERSONALITIES, SCENARIOS, ACHIEVEMENTS } from '@/lib/game-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Heart,
  Flame,
  RotateCcw,
  Share2,
  Trophy,
  Clock,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  LogIn
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export function GameResult() {
  const { state, resetGame } = useGame();
  const { user, isAuthenticated } = useAuth();
  const [shareLoading, setShareLoading] = useState(false);
  const [recordSaved, setRecordSaved] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string>('');
  const recordSavedRef = useRef(false); // 防止重复保存
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const settings = state.settings;
  const personality = PERSONALITIES.find(p => p.id === settings?.personality);
  const scenario = SCENARIOS.find(s => s.id === settings?.scenarioId);
  const duration = state.endTime && state.startTime
    ? Math.floor((state.endTime - state.startTime) / 1000)
    : 0;

  // 获取获得的成就
  const earnedAchievements = ACHIEVEMENTS.filter(a => a.condition(state));

  // 结果状态
  const isWon = state.status === 'won';
  const isLost = state.status === 'lost';
  const isTimeout = state.status === 'timeout';

  // 自动保存游戏记录 + 生成游戏结果卡片
  useEffect(() => {
    // 保存游戏记录
    const saveGameRecord = async () => {
      // 防止重复保存
      if (recordSavedRef.current) {
        console.log('[游戏记录保存] 已经保存过，跳过重复保存');
        return;
      }

      console.log('[游戏记录保存] 开始检查条件...');
      console.log('[游戏记录保存] scenario:', scenario);
      console.log('[游戏记录保存] personality:', personality);
      console.log('[游戏记录保存] isAuthenticated:', isAuthenticated);
      console.log('[游戏记录保存] user:', user);
      console.log('[游戏记录保存] state.pleasure:', state.pleasure);
      console.log('[游戏记录保存] state.status:', state.status);

      if (!scenario || !personality) {
        console.log('[游戏记录保存] 场景或性格为空，跳过保存');
        return;
      }

      if (isAuthenticated && user) {
        console.log('[游戏记录保存] 已登录用户，开始保存记录...');
        // 标记为已保存
        recordSavedRef.current = true;

        // 已登录用户自动保存记录
        try {
          const payload = {
            userId: user.id,
            scenario: scenario.title,
            finalScore: state.pleasure,
            result: state.status,
          };
          console.log('[游戏记录保存] 保存数据:', payload);

          const response = await fetch('/api/game/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          console.log('[游戏记录保存] 响应状态:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('[游戏记录保存] 保存成功:', data);
            setRecordSaved(true);
          } else {
            const errorText = await response.text();
            console.error('[游戏记录保存] 保存失败:', response.status, errorText);
            // 保存失败时重置标记，允许重试
            recordSavedRef.current = false;
          }
        } catch (error) {
          console.error('[游戏记录保存] 保存游戏记录失败:', error);
          // 保存失败时重置标记，允许重试
          recordSavedRef.current = false;
        }
      } else {
        console.log('[游戏记录保存] 未登录用户，显示提示');
        // 未登录用户也标记为已处理，避免重复显示提示
        recordSavedRef.current = true;
        setShowLoginPrompt(true);
      }
    };

    // 生成游戏结果卡片
    const generateResultCard = () => {
      if (!scenario || !personality) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 设置画布尺寸
      canvas.width = 600;
      canvas.height = 800;

      // 背景渐变
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      if (isWon) {
        gradient.addColorStop(0, '#fce7f3'); // pink-100
        gradient.addColorStop(1, '#fff1f2'); // pink-50
      } else {
        gradient.addColorStop(0, '#fef3c7'); // amber-100
        gradient.addColorStop(1, '#fffbeb'); // amber-50
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 边框
      ctx.strokeStyle = isWon ? '#ec4899' : '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // 标题
      ctx.fillStyle = isWon ? '#ec4899' : '#f59e0b';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('恋爱哄哄模拟器', canvas.width / 2, 100);

      // 结果图标
      ctx.font = '80px sans-serif';
      const emoji = isWon ? '🎉' : isLost ? '😢' : '😅';
      ctx.fillText(emoji, canvas.width / 2, 200);

      // 结果文字
      ctx.fillStyle = isWon ? '#059669' : isLost ? '#dc2626' : '#d97706';
      ctx.font = 'bold 32px sans-serif';
      const resultText = isWon ? '成功让TA开心' : isLost ? 'TA不开心' : '对话次数用完';
      ctx.fillText(resultText, canvas.width / 2, 270);

      // 游戏数据
      ctx.fillStyle = '#4b5563';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'left';

      const data = [
        { icon: '🎭', label: '场景', value: scenario.title },
        { icon: '💎', label: '性格', value: personality.name },
        { icon: '🔄', label: '对话轮数', value: `${state.round}轮` },
        { icon: '💕', label: '愉悦值', value: `${state.pleasure}/100` },
        { icon: '⏱️', label: '用时', value: `${Math.floor(duration / 60)}分${duration % 60}秒` },
      ];

      let y = 350;
      data.forEach((item) => {
        ctx.fillText(`${item.icon} ${item.label}`, 80, y);
        ctx.textAlign = 'right';
        ctx.fillText(item.value, canvas.width - 80, y);
        ctx.textAlign = 'left';
        y += 50;
      });

      // 成就
      if (earnedAchievements.length > 0) {
        y += 20;
        ctx.fillStyle = '#7c3aed';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 获得成就', canvas.width / 2, y);

        y += 40;
        ctx.font = '18px sans-serif';
        earnedAchievements.forEach((achievement, index) => {
          ctx.fillStyle = '#fff';
          ctx.fillRect(100, y - 20, canvas.width - 200, 30);

          ctx.fillStyle = '#7c3aed';
          ctx.textAlign = 'center';
          ctx.fillText(achievement.name, canvas.width / 2, y + 5);
          y += 40;
        });
      }

      // 邀请语
      y += 30;
      ctx.fillStyle = '#6b7280';
      ctx.font = 'italic 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('来挑战一下你能用几轮让TA开心吧！', canvas.width / 2, y);

      // 底部链接
      y += 40;
      const gameUrl = `${process.env.COZE_PROJECT_DOMAIN_DEFAULT || ''}`;
      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(gameUrl, canvas.width / 2, y);

      // 转换为图片 URL
      const imageUrl = canvas.toDataURL('image/png');
      setShareImageUrl(imageUrl);
    };

    // 执行两个操作
    saveGameRecord();
    generateResultCard();
  }, [scenario, personality, state, duration, earnedAchievements, isWon, isLost, isAuthenticated, user]);

  // 分享链接
  const handleShareLink = async () => {
    setShareLoading(true);

    // 使用当前页面地址作为真实链接
    const gameUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';

    // 创建分享内容
    const shareText = `我在【恋爱哄哄模拟器】中${isWon ? '成功让TA开心' : '挑战失败'}！
🎭 场景：${scenario?.title}
💎 性格：${personality?.name}
🔄 轮数：${state.round}轮
💕 愉悦值：${state.pleasure}/100
⏱️ 用时：${Math.floor(duration / 60)}分${duration % 60}秒
${earnedAchievements.length > 0 ? `🏆 成就：${earnedAchievements.map(a => a.name).join('、')}` : ''}

🔗 点击链接直接开始游戏：${gameUrl}

来挑战一下你能用几轮让TA开心吧！`;

    try {
      // 尝试使用原生分享 API
      if (navigator.share) {
        try {
          await navigator.share({
            title: '恋爱哄哄模拟器 - ' + (isWon ? '挑战成功' : '挑战失败'),
            text: shareText,
          });
          return; // 分享成功，直接返回
        } catch (shareError) {
          // 如果是用户取消分享，不显示错误提示
          if ((shareError as Error).name === 'AbortError') {
            console.log('用户取消了分享');
            return;
          }
          console.log('分享失败，尝试复制:', shareError);
        }
      }

      // 尝试复制到剪贴板
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(shareText);
          alert('✅ 分享内容已复制到剪贴板！');
          return;
        }
      } catch (clipboardError) {
        console.log('Clipboard API 失败，尝试备选方案:', clipboardError);
      }

      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.opacity = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const success = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (success) {
          alert('✅ 分享内容已复制到剪贴板！');
        } else {
          throw new Error('execCommand 复制失败');
        }
      } catch (execError) {
        console.error('所有复制方案都失败:', execError);
      }
    } finally {
      setShareLoading(false);
    }
  };

  // 保存图片
  const handleSaveImage = async () => {
    if (!shareImageUrl) return;

    try {
      const link = document.createElement('a');
      link.href = shareImageUrl;
      link.download = `恋爱哄哄模拟器-${state.status}-${Date.now()}.png`;
      link.click();

      alert('📸 游戏结果卡片已保存！');
    } catch (imgError) {
      console.error('保存图片失败:', imgError);
      alert('❌ 保存图片失败，请重试！');
    }
  };

  // 手动复制分享内容
  const handleManualCopy = async () => {
    // 使用当前页面地址作为真实链接
    const gameUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
    const shareText = `我在【恋爱哄哄模拟器】中${isWon ? '成功让TA开心' : '挑战失败'}！
🎭 场景：${scenario?.title}
💎 性格：${personality?.name}
🔄 轮数：${state.round}轮
💕 愉悦值：${state.pleasure}/100
⏱️ 用时：${Math.floor(duration / 60)}分${duration % 60}秒
${earnedAchievements.length > 0 ? `🏆 成就：${earnedAchievements.map(a => a.name).join('、')}` : ''}

🔗 点击链接直接开始游戏：${gameUrl}`;

    try {
      // 首先尝试使用现代的 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        alert('✅ 已复制到剪贴板！');
        return;
      }
    } catch (error) {
      console.log('Clipboard API 失败，尝试备选方案:', error);
    }

    // 备选方案：使用传统的 document.execCommand
    try {
      // 创建一个临时的 textarea 元素
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      
      // 防止页面滚动到底部
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // 尝试复制
      const success = document.execCommand('copy');
      
      // 移除临时元素
      document.body.removeChild(textArea);
      
      if (success) {
        alert('✅ 已复制到剪贴板！');
      } else {
        throw new Error('execCommand 复制失败');
      }
    } catch (error) {
      console.error('所有复制方案都失败:', error);
      // 如果都失败了，让用户手动选择文本复制
      alert('❌ 自动复制失败，请手动选择上方文本复制！');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="p-6">
          {/* 结果图标 */}
          <div className="text-center mb-6">
            {isWon && (
              <>
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-2xl font-bold text-green-600 mb-2">
                  TA很开心！
                </h1>
                <p className="text-gray-500">愉悦值达到100，你成功哄好了TA~</p>
              </>
            )}
            {isLost && (
              <>
                <div className="text-6xl mb-4">😢</div>
                <h1 className="text-2xl font-bold text-red-500 mb-2">
                  TA不开心
                </h1>
                <p className="text-gray-500">愉悦值太低了...下次要更真诚一些</p>
              </>
            )}
            {isTimeout && (
              <>
                <div className="text-6xl mb-4">😅</div>
                <h1 className="text-2xl font-bold text-yellow-600 mb-2">
                  对话次数用完了
                </h1>
                <p className="text-gray-500">愉悦值没有达到100，但TA看到了你的努力</p>
              </>
            )}
          </div>

          {/* 游戏统计 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-500">场景</div>
                <div className="font-medium">{scenario?.title}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">性格</div>
                <div className="font-medium">{personality?.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">对话轮数</div>
                <div className="font-medium flex items-center justify-center gap-1">
                  <MessageCircle className="w-4 h-4 text-pink-500" />
                  {state.round}轮
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">用时</div>
                <div className="font-medium flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4 text-pink-500" />
                  {Math.floor(duration / 60)}分{duration % 60}秒
                </div>
              </div>
            </div>
          </div>

          {/* 游戏记录保存提示 */}
          {recordSaved && (
            <div className="mb-6 text-center text-green-600 flex items-center justify-center gap-1 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              您的游戏记录已经保存
            </div>
          )}

          {showLoginPrompt && (
            <div className="mb-6 text-center text-amber-600 flex items-center justify-center gap-1 bg-amber-50 p-3 rounded-lg">
              <LogIn className="w-4 h-4" />
              登录后可保存你的游戏记录
              <a
                href="/login"
                className="ml-2 text-amber-700 underline hover:text-amber-800"
              >
                去登录
              </a>
            </div>
          )}

          {/* 成就 */}
          {earnedAchievements.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2 text-center">获得成就</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {earnedAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                  >
                    <Trophy className="w-3 h-3" />
                    {achievement.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 排行榜提示 */}
          {isWon && isAuthenticated && (
            <div className="mb-6 text-center text-purple-600 flex items-center justify-center gap-1 bg-purple-50 p-3 rounded-lg">
              <Trophy className="w-4 h-4" />
              您的成绩已自动提交到排行榜！
            </div>
          )}

          {isWon && !isAuthenticated && (
            <div className="mb-6 text-center text-amber-600 flex items-center justify-center gap-1 bg-amber-50 p-3 rounded-lg">
              <LogIn className="w-4 h-4" />
              登录后您的成绩可参与排行榜挑战
              <a
                href="/login"
                className="ml-2 text-amber-700 underline hover:text-amber-800"
              >
                去登录
              </a>
            </div>
          )}

          {/* 游戏结果卡片预览 */}
          {shareImageUrl && (
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2 text-center">
                游戏结果卡片
              </div>
              <div className="flex justify-center">
                <img
                  src={shareImageUrl}
                  alt="游戏结果卡片"
                  className="rounded-lg shadow-lg max-w-full h-auto"
                  style={{ maxWidth: '400px' }}
                />
              </div>
            </div>
          )}

          {/* 分享内容 */}
          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-2">分享内容</div>
            <div className="relative">
              <textarea
                readOnly
                value={`我在【恋爱哄哄模拟器】中${isWon ? '成功让TA开心' : '挑战失败'}！
🎭 场景：${scenario?.title}
💎 性格：${personality?.name}
🔄 轮数：${state.round}轮
💕 愉悦值：${state.pleasure}/100
⏱️ 用时：${Math.floor(duration / 60)}分${duration % 60}秒
${earnedAchievements.length > 0 ? `🏆 成就：${earnedAchievements.map(a => a.name).join('、')}` : ''}

🔗 点击链接直接开始游戏：${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000'}`}
                className="w-full h-40 p-3 text-sm border rounded-lg resize-none bg-gray-50"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleManualCopy}
              >
                复制
              </Button>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={resetGame}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              再来一局
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSaveImage}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              保存图片
            </Button>
            <Button
              className="flex-1 bg-pink-500 hover:bg-pink-600"
              onClick={handleShareLink}
              disabled={shareLoading}
            >
              <Share2 className="w-4 h-4 mr-2" />
              分享链接
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
