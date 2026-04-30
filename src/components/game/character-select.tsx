'use client';

import { useGame } from '@/context/game-context';
import { PERSONALITIES, PersonalityType } from '@/lib/game-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Heart, User, User2, BookOpen, Trophy } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export function CharacterSelect() {
  const { startGame } = useGame();
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('female');
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType | null>(null);

  const handleStart = () => {
    if (!selectedPersonality) return;
    // 进入场景选择阶段，暂时用一个占位场景ID
    startGame({
      gender: selectedGender,
      personality: selectedPersonality,
      scenarioId: 0, // 0 表示待选择
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {/* 性别选择 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-center mb-4 text-gray-700">
          选择TA的性别
        </h2>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setSelectedGender('female')}
            className={cn(
              'flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all',
              selectedGender === 'female'
                ? 'border-pink-400 bg-pink-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-pink-200'
            )}
          >
            <User2 className={cn(
              'w-12 h-12',
              selectedGender === 'female' ? 'text-pink-500' : 'text-gray-400'
            )} />
            <span className={cn(
              'font-medium',
              selectedGender === 'female' ? 'text-pink-600' : 'text-gray-500'
            )}>女生</span>
          </button>
          
          <button
            onClick={() => setSelectedGender('male')}
            className={cn(
              'flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all',
              selectedGender === 'male'
                ? 'border-blue-400 bg-blue-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-blue-200'
            )}
          >
            <User className={cn(
              'w-12 h-12',
              selectedGender === 'male' ? 'text-blue-500' : 'text-gray-400'
            )} />
            <span className={cn(
              'font-medium',
              selectedGender === 'male' ? 'text-blue-600' : 'text-gray-500'
            )}>男生</span>
          </button>
        </div>
      </div>

      {/* 性格选择 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-center mb-4 text-gray-700">
          选择TA的性格
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {PERSONALITIES.map((p) => (
            <Card
              key={p.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedPersonality === p.id
                  ? 'ring-2 ring-pink-400 bg-pink-50'
                  : 'hover:bg-gray-50'
              )}
              onClick={() => setSelectedPersonality(p.id)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">
                  {p.id === 'gentle' && '🌸'}
                  {p.id === 'tsundere' && '😤'}
                  {p.id === 'stubborn' && '💪'}
                  {p.id === 'intellectual' && '📚'}
                  {p.id === 'scheming' && '😏'}
                </div>
                <h3 className="font-semibold text-gray-800">{p.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{p.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 开始按钮 */}
      <div className="flex flex-wrap justify-center gap-4">
        <Button
          size="lg"
          onClick={handleStart}
          disabled={!selectedPersonality}
          className="bg-pink-500 hover:bg-pink-600 text-white px-8 py-6 text-lg rounded-full shadow-lg"
        >
          <Heart className="w-5 h-5 mr-2" />
          开始游戏
        </Button>
        <Link href="/blog">
          <Button
            size="lg"
            variant="outline"
            className="text-gray-700 px-8 py-6 text-lg rounded-full shadow-md"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            恋爱攻略
          </Button>
        </Link>
        <Link href="/leaderboard">
          <Button
            size="lg"
            variant="outline"
            className="text-gray-700 px-8 py-6 text-lg rounded-full shadow-md"
          >
            <Trophy className="w-5 h-5 mr-2" />
            排行榜
          </Button>
        </Link>
      </div>
    </div>
  );
}
