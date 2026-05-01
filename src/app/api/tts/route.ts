import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/tts/doubao';
import { ProviderError, getHttpStatusForProviderError } from '@/lib/provider-errors';
import { PERSONALITIES, getPleasureStage } from '@/lib/game-config';

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

    const personality = PERSONALITIES.find(p => p.id === personalityId);
    if (!personality) {
      return NextResponse.json({ error: '无效的性格类型' }, { status: 400 });
    }

    const speaker = gender === 'female' ? personality.femaleVoice : personality.maleVoice;
    getPleasureStage(currentPleasure);

    const response = await synthesizeSpeech({
      text,
      speaker,
      format: 'mp3',
      sampleRate: 24000,
    });

    return NextResponse.json({
      audioUrl: response.audioUrl,
      audioSize: response.audioSize,
    });
  } catch (error) {
    console.error('TTS API error:', error);

    if (error instanceof ProviderError) {
      return NextResponse.json(
        { error: error.publicMessage, category: error.category },
        { status: getHttpStatusForProviderError(error) }
      );
    }

    return NextResponse.json(
      { error: '语音合成失败，请稍后再试' },
      { status: 500 }
    );
  }
}
