import { NextRequest, NextResponse } from 'next/server';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { PERSONALITIES, getPleasureStage } from '@/lib/game-config';

// 请求类型
interface TTSRequest {
  text: string;
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
    // speechRate 范围: -50 到 100，0 是正常，整体提升到1.5倍速
    const baseSpeechRate = 50; // 基础语速偏移量，实现整体1.5倍速
    const speechRate = (pleasureStage.speechRate === 'slow' ? -30 : pleasureStage.speechRate === 'fast' ? 20 : 0) + baseSpeechRate;
    // loudnessRate 范围: -50 到 100，0 是正常
    const loudnessRate = pleasureStage.volume === 'soft' ? -20 : pleasureStage.volume === 'loud' ? 15 : 0;
    
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
