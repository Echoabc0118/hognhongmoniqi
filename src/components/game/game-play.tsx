'use client';

import { useGame } from '@/context/game-context';
import { PERSONALITIES, SCENARIOS, getPleasureStage, Message } from '@/lib/game-config';
import { ReplyOption } from '@/app/api/chat/route';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Heart,
  Loader2,
  Pause,
  Play,
  Smile,
  Frown
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

// 选项类型颜色配置（不带图标）
const optionTypeColor: Record<ReplyOption['type'], string> = {
  angry: 'border-red-300 bg-red-50',
  happy: 'border-green-300 bg-green-50',
  funny: 'border-yellow-300 bg-yellow-50',
  sweet: 'border-pink-300 bg-pink-50',
  sincere: 'border-blue-300 bg-blue-50',
  neutral: 'border-purple-300 bg-purple-50',
};

export function GamePlay() {
  const { state, addMessage, updatePleasure, incrementRound, resetGame } = useGame();
  const [options, setOptions] = useState<ReplyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false); // 追踪是否已初始化

  const settings = state.settings;
  const personality = PERSONALITIES.find(p => p.id === settings?.personality);
  const scenario = SCENARIOS.find(s => s.id === settings?.scenarioId);
  const pleasureStage = getPleasureStage(state.pleasure);

  // 过滤括号内的描述性文字（肢体动作、情感描述等）
  const filterBracketContent = (text: string): string => {
    return text
      .replace(/（[^）]*）/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 播放 TTS
  const playTTS = useCallback(async (text: string) => {
    const textForTTS = filterBracketContent(text);
    if (!textForTTS) return;
    
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textForTTS,
          gender: settings?.gender,
          personalityId: settings?.personality,
          currentPleasure: state.pleasure,
        }),
      });

      const data = await response.json();

      if (data.audioUrl) {
        setCurrentAudio(prev => {
          if (prev) prev.pause();
          return null;
        });

        const audio = new Audio(data.audioUrl);
        setCurrentAudio(audio);
        setIsPlaying(true);
        
        audio.onended = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
        };

        await audio.play();
      }
    } catch (error) {
      console.error('TTS 播放失败:', error);
    }
  }, [settings?.gender, settings?.personality, state.pleasure]);

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages, options]);

  // 初始消息 - 让 AI 先说话并获取选项
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (state.messages.length > 0) return;
    if (!scenario || !settings) return;
    
    hasInitializedRef.current = true;
    
    const fetchInitialMessage = async () => {
      setIsLoading(true);
      setIsLoadingOptions(true);
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gender: settings.gender,
            personalityId: settings.personality,
            scenarioId: settings.scenarioId,
            currentPleasure: state.pleasure,
            conversationHistory: [],
            isFirstMessage: true,
          }),
        });

        const data = await response.json();

        // 添加回复消息
        const assistantMessage: Message = {
          id: `initial_${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          pleasureChange: 0,
          currentPleasure: state.pleasure,
          timestamp: Date.now(),
        };
        addMessage(assistantMessage);

        // 设置选项
        setOptions(data.options || []);

        // 播放语音
        if (data.reply) {
          playTTS(data.reply);
        }
      } catch (error) {
        console.error('获取初始消息失败:', error);
        const fallbackMessage: Message = {
          id: `initial_${Date.now()}`,
          role: 'assistant',
          content: `你来了...你知不知道我等了多久...`,
          pleasureChange: 0,
          currentPleasure: state.pleasure,
          timestamp: Date.now(),
        };
        addMessage(fallbackMessage);
      } finally {
        setIsLoading(false);
        setIsLoadingOptions(false);
      }
    };

    fetchInitialMessage();
  }, [scenario, settings]);

  // 选择选项发送消息
  const handleSelectOption = async (option: ReplyOption) => {
    if (isLoading || isLoadingOptions) return;

    // 添加用户消息
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: option.content,
      pleasureChange: 0,
      timestamp: Date.now(),
    };
    addMessage(userMessage);
    
    // 清空选项，显示加载状态
    setOptions([]);
    setIsLoading(true);
    setIsLoadingOptions(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: option.content,
          gender: settings?.gender,
          personalityId: settings?.personality,
          scenarioId: settings?.scenarioId,
          currentPleasure: state.pleasure,
          conversationHistory: state.messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      // 更新愉悦值
      updatePleasure(data.newPleasure, data.pleasureChange);
      incrementRound();

      // 添加回复消息
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        pleasureChange: data.pleasureChange,
        currentPleasure: data.newPleasure,
        timestamp: Date.now(),
      };
      addMessage(assistantMessage);

      // 设置新选项
      setOptions(data.options || []);

      // 播放语音
      playTTS(data.reply);
    } catch (error) {
      console.error('发送消息失败:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingOptions(false);
    }
  };

  // 暂停/播放音频
  const toggleAudio = () => {
    if (currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
      } else {
        currentAudio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 退出游戏
  const handleQuit = () => {
    if (confirm('确定要退出游戏吗？当前进度将不会保存。')) {
      if (currentAudio) {
        currentAudio.pause();
      }
      resetGame();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col">
      {/* 顶部状态栏 */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleQuit}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            退出
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              第 {state.round} / {state.maxRounds} 轮
            </div>
            <div className="flex items-center gap-2">
              <Smile className={cn(
                'w-5 h-5',
                state.pleasure >= 60 ? 'text-green-500' : 
                state.pleasure >= 30 ? 'text-yellow-500' : 'text-red-500'
              )} />
              <span className="font-medium">{pleasureStage.label}</span>
            </div>
          </div>
        </div>

        {/* 愉悦值进度条 */}
        <div className="max-w-4xl mx-auto mt-3">
          <div className="flex items-center gap-3">
            <Frown className="w-4 h-4 text-red-500" />
            <Progress 
              value={state.pleasure} 
              className="h-3 flex-1"
            />
            <Heart className="w-4 h-4 text-pink-500" />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>不开心</span>
            <span className="font-medium text-gray-600">愉悦值: {state.pleasure}</span>
            <span>很开心</span>
          </div>
        </div>
      </div>

      {/* 对话区域 */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="max-w-4xl mx-auto p-4 space-y-4">
            {/* 场景信息 */}
            {scenario && (
              <div className="bg-pink-50 rounded-2xl p-4 text-center">
                <div className="text-sm text-gray-500 mb-1">场景</div>
                <div className="font-medium text-gray-800">{scenario.title}</div>
                <div className="text-xs text-gray-400 mt-1">
                  TA的性格：{personality?.name}
                </div>
              </div>
            )}

            {/* 消息列表 */}
            {state.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl p-4',
                    message.role === 'user'
                      ? 'bg-pink-500 text-white rounded-br-md'
                      : 'bg-white shadow-md rounded-bl-md'
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && message.pleasureChange !== 0 && (
                    <div className={cn(
                      'text-xs mt-2 flex items-center gap-1',
                      message.pleasureChange > 0 ? 'text-green-500' : 'text-red-500'
                    )}>
                      {message.pleasureChange > 0 ? (
                        <>
                          <Heart className="w-3 h-3" />
                          TA开心了 +{Math.abs(message.pleasureChange)}
                        </>
                      ) : (
                        <>
                          <Frown className="w-3 h-3" />
                          TA不开心了 {Math.abs(message.pleasureChange)}
                        </>
                      )}
                    </div>
                  )}
                  {/* 当前愉悦值进度条 */}
                  {message.role === 'assistant' && message.currentPleasure !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">愉悦值:</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-300 rounded-full',
                            message.currentPleasure >= 60 ? 'bg-green-400' :
                            message.currentPleasure >= 30 ? 'bg-yellow-400' : 'bg-red-400'
                          )}
                          style={{ width: `${message.currentPleasure}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{message.currentPleasure}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* 加载中 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white shadow-md rounded-2xl rounded-bl-md p-4">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">TA正在思考...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 选项区域 */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          {/* 音频控制按钮 */}
          {currentAudio && (
            <div className="flex justify-center mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAudio}
                className="text-gray-500"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    暂停语音
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    播放语音
                  </>
                )}
              </Button>
            </div>
          )}

          {/* 选项按钮 */}
          {isLoadingOptions ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-pink-500 mr-2" />
              <span className="text-gray-400">正在生成回复选项...</span>
            </div>
          ) : options.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(option)}
                  disabled={isLoading}
                  className={cn(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    'shadow-sm hover:shadow-md',
                    optionTypeColor[option.type],
                    'hover:border-pink-400 hover:bg-pink-100',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {option.content}
                  </p>
                </button>
              ))}
            </div>
          ) : !isLoading && (
            <div className="text-center py-4 text-gray-400">
              选择一个回复来继续对话
            </div>
          )}

          {/* 提示 */}
          <div className="text-xs text-gray-400 mt-3 text-center">
            💡 不同类型的回复会影响TA的愉悦值，选择合适的回复哄TA开心吧！
          </div>
        </div>
      </div>
    </div>
  );
}
