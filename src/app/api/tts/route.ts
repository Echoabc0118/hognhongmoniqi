import { NextRequest, NextResponse } from 'next/server';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { PERSONALITIES, getPleasureStage, PLEASURE_STAGES } from '@/lib/game-config';

// 请求类型
interface TTSRequest {
  text: string;
  ssml?: string;
  gender: 'male' | 'female';
  personalityId: string;
  currentPleasure: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: TTSRequest = await request.json();
    const { text, gender, personalityId, currentPleasure } = body;
    
    if (!text) {
      return NextResponse.json({ error: '缺少文本内容' }, { status: 400 });
    }
    
    // 获取性格配置
    const personality = PERSONALITIES.find(p => p.id === personalityId);
    if (!personality) {
      return NextResponse.json({ error: '无效的性格类型' }, { status: 400 });
    }
    
    // 选择声音
    const speaker = gender === 'female' ? personality.femaleVoice : personality.maleVoice;
    
    // 获取愉悦值阶段，调整语速和音量
    const pleasureStage = getPleasureStage(currentPleasure);
    
    // 直接使用 game-config.ts 里的配置映射语速
    // slow/medium/fast 对应不同数值，整体1.25倍速
    const speechRateMap: Record<string, number> = {
      'slow': 8,    // 很不开心：0.6倍速
      'medium': 12,  // 心情一般：0.8倍速
      'fast': 15,      // 很开心：1倍速
    };
    
    const speechRate = speechRateMap[pleasureStage.speechRate] ?? -20;
    
    // 音量也使用配置文件里的映射
    const loudnessRateMap: Record<string, number> = {
      'soft': -20,
      'medium': 0,
      'loud': 15,
    };
    
    const loudnessRate = loudnessRateMap[pleasureStage.volume] ?? 0;
    
    // 初始化 TTS 客户端
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new TTSClient(config, customHeaders);
    
    // 生成语音 - 使用纯文本 + 参数控制语速音量
    const response = await client.synthesize({
      uid: 'honohon_user',
      text,
      speaker,
      audioFormat: 'mp3',
      sampleRate: 24000,
      speechRate,
      loudnessRate,
    });
    
    // 返回音频 URL
    return NextResponse.json({
      audioUrl: response.audioUri,
      audioSize: response.audioSize,
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: '语音合成失败，请稍后重试' },
      { status: 500 }
    );
  }
}
