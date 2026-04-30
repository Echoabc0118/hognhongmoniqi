'use client';

import { useGame } from '@/context/game-context';
import { SCENARIOS } from '@/lib/game-config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ScenarioSelect() {
  const { selectScenario, resetGame } = useGame();

  const handleSelectScenario = (scenarioId: number) => {
    selectScenario(scenarioId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Button
          variant="ghost"
          onClick={resetGame}
          className="mb-4 text-gray-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">
          选择吵架场景
        </h1>
        <p className="text-center text-gray-500 mb-6">
          你们因为什么吵架了？选择一个场景开始练习哄TA
        </p>

        {/* 场景列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SCENARIOS.map((scenario) => (
            <Card
              key={scenario.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]',
                'border-2 border-transparent hover:border-pink-200'
              )}
              onClick={() => handleSelectScenario(scenario.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">
                    {scenario.id === 1 && '⏰'}
                    {scenario.id === 2 && '🎂'}
                    {scenario.id === 3 && '📱'}
                    {scenario.id === 4 && '💔'}
                    {scenario.id === 5 && '❌'}
                    {scenario.id === 6 && '😰'}
                    {scenario.id === 7 && '🎮'}
                    {scenario.id === 8 && '📵'}
                    {scenario.id === 9 && '🗓️'}
                    {scenario.id === 10 && '🎁'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {scenario.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {scenario.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Smile className="w-4 h-4 text-pink-500" />
                      <span className="text-sm text-pink-600">
                        初始愉悦值: {scenario.initialPleasure}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
