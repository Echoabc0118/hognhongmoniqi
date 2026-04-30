'use client';

import { GameProvider, useGame } from '@/context/game-context';
import { CharacterSelect } from '@/components/game/character-select';
import { ScenarioSelect } from '@/components/game/scenario-select';
import { GamePlay } from '@/components/game/game-play';
import { GameResult } from '@/components/game/game-result';
import { Button } from '@/components/ui/button';
import { Heart, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

function GameContent() {
  const { state, resetGame } = useGame();
  const { user, isAuthenticated, logout } = useAuth();

  const renderContent = () => {
    switch (state.status) {
      case 'idle':
        return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-pink-50 to-white">
            {/* 顶部导航 */}
            <div className="absolute top-6 right-6 flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
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
                    <LogOut className="w-4 h-4" />
                    退出
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
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

            <div className="text-center mb-8">
              <div className="text-6xl mb-4">💑</div>
              <h1 className="text-4xl font-bold text-pink-600 mb-2">恋爱哄哄模拟器</h1>
              <p className="text-gray-600 max-w-md mx-auto">
                惹TA生气了不知道怎么哄？来练习一下吧！选择场景，通过对话让TA原谅你~
              </p>
            </div>
            
            <div className="mb-8">
              <CharacterSelect />
            </div>
            
            <div className="text-sm text-gray-400">
              温馨提示：全程中文，请用真诚的话语打动对方
            </div>
          </div>
        );
      
      case 'selecting':
        return <ScenarioSelect />;
      
      case 'playing':
        return <GamePlay />;
      
      case 'won':
      case 'lost':
      case 'timeout':
        return <GameResult />;
      
      default:
        return null;
    }
  };

  return <>{renderContent()}</>;
}

export default function Home() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
