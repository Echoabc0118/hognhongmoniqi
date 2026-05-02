import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/ai/generate-text';
import type { LLMMessage } from '@/lib/ai/types';
import { ProviderError, getHttpStatusForProviderError } from '@/lib/provider-errors';
import {
  PERSONALITIES,
  SCENARIOS,
  getPleasureStage,
  generateSSML,
  stripNarrationText,
} from '@/lib/game-config';

interface ChatRequest {
  message?: string;
  gender: 'male' | 'female';
  personalityId: string;
  scenarioId: number;
  currentPleasure: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  isFirstMessage?: boolean;
}

export interface ReplyOption {
  id: number;
  content: string;
  type: 'angry' | 'happy' | 'funny' | 'sweet' | 'sincere' | 'neutral';
}

interface ChatResponse {
  reply: string;
  pleasureChange: number;
  newPleasure: number;
  ssml: string;
  pleasureStage: {
    label: string;
    emotion: string;
  };
  options: ReplyOption[];
}

type OptionType = ReplyOption['type'];

const OPTION_TYPES: OptionType[] = ['angry', 'happy', 'funny', 'sweet', 'sincere', 'neutral'];

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, gender, personalityId, scenarioId, currentPleasure, conversationHistory, isFirstMessage } = body;

    const personality = PERSONALITIES.find(p => p.id === personalityId);
    if (!personality) {
      return NextResponse.json({ error: '无效的性格类型' }, { status: 400 });
    }

    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: '无效的场景' }, { status: 400 });
    }

    let reply = '';
    let pleasureChange = 0;

    if (isFirstMessage) {
      const openingPrompt = buildOpeningPrompt(personality, scenario, gender, currentPleasure);
      const response = await generateText({
        messages: [{ role: 'user', content: openingPrompt }],
        temperature: 0.85,
        operation: 'game_opening',
      });

      reply = parseOpeningResponse(response.content);
    } else {
      if (!message) {
        return NextResponse.json({ error: '缺少玩家回复内容' }, { status: 400 });
      }

      const systemPrompt = buildSystemPrompt(personality, scenario, gender, currentPleasure);
      const messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: stripScoreLeak(msg.content),
        })),
        { role: 'user', content: message },
      ];

      const response = await generateText({
        messages,
        temperature: 0.85,
        operation: 'game_reply',
      });

      const parsed = parseResponse(response.content);
      reply = parsed.reply;
      pleasureChange = parsed.pleasureChange;
    }

    reply = normalizeReply(reply, personality.name, gender);
    const newPleasure = Math.max(0, Math.min(100, currentPleasure + pleasureChange));
    const pleasureStage = getPleasureStage(newPleasure);
    const voiceText = stripNarrationText(reply);
    const ssml = generateSSML(voiceText, pleasureStage);
    const options = await generateOptions(personality, scenario, gender, newPleasure, [
      ...conversationHistory,
      { role: 'assistant', content: reply },
    ]);

    const response: ChatResponse = {
      reply,
      pleasureChange,
      newPleasure,
      ssml,
      pleasureStage: {
        label: pleasureStage.label,
        emotion: pleasureStage.emotion,
      },
      options,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof ProviderError) {
      return NextResponse.json(
        { error: error.publicMessage, category: error.category },
        { status: getHttpStatusForProviderError(error) }
      );
    }

    return NextResponse.json(
      { error: '对话生成失败，请稍后再试' },
      { status: 500 }
    );
  }
}

async function generateOptions(
  personality: typeof PERSONALITIES[0],
  scenario: typeof SCENARIOS[0],
  gender: 'male' | 'female',
  currentPleasure: number,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ReplyOption[]> {
  const genderText = gender === 'female' ? '女朋友' : '男朋友';
  const playerPreviousReplies = conversationHistory
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content)
    .filter(content => content.trim());

  const lastAssistantReply = [...conversationHistory].reverse().find(msg => msg.role === 'assistant')?.content || '';
  const dialogueSummary = conversationHistory
    .slice(-10)
    .map(msg => {
      const role = msg.role === 'user' ? '玩家' : 'TA';
      return `${role}: ${msg.content}`;
    })
    .join('\n');

  const prompt = `你是恋爱哄哄模拟器的玩家回复选项设计师。

角色信息：
- 玩家做错了事，正在哄一位「${personality.name}」的${genderText}。
- 对方性格：${personality.description}
- 吵架场景：${scenario.context}
- 当前愉悦值：${currentPleasure}/100
- 对方刚说的话：${lastAssistantReply}

最近对话：
${dialogueSummary || '暂无'}

玩家已经说过的回复，严禁重复或改写成高度相似的句子：
${playerPreviousReplies.length > 0 ? playerPreviousReplies.map((reply, index) => `${index + 1}. ${reply}`).join('\n') : '暂无'}

请生成 6 个下一步可选回复。每个选项都要贴合“对方刚说的话”，并推动下一步对话，不要都只是简单道歉。
6 个选项分别覆盖这些策略：
1. angry：错误示范，找借口、推卸责任或态度不佳，会让对方更生气。
2. sincere：认真承担责任，明确承认伤害，不求立刻原谅。
3. happy：提出具体补救行动，例如现在怎么做、今晚怎么弥补、以后怎么避免。
4. sweet：情绪安抚和共情，先接住对方委屈。
5. funny：轻松化解，但不能油腻，必须仍然承认问题。
6. neutral：解释但不狡辩，说明事实边界，并邀请对方继续表达。

输出要求：
- 只输出 JSON，不要 Markdown，不要解释。
- 格式：{"options":[{"type":"sincere","content":"..."}, ...]}
- content 不要包含选项编号，不要超过 45 个中文字符。
- 不要重复历史回复，不要使用空泛句子，如“对不起我错了”“别生气了”。`;

  const response = await generateText({
    messages: [{ role: 'user', content: prompt }],
    temperature: 1.0,
    operation: 'game_options',
  });

  const options = dedupeOptions(parseOptions(response.content), playerPreviousReplies);
  return completeOptions(options, scenario, currentPleasure, playerPreviousReplies);
}

function parseOptions(response: string): ReplyOption[] {
  const json = extractJson(response);
  if (json) {
    try {
      const parsed = JSON.parse(json) as { options?: Array<{ type?: string; content?: string }> };
      const options = parsed.options ?? [];
      return options
        .filter(option => typeof option.content === 'string' && option.content.trim())
        .slice(0, 6)
        .map((option, index) => ({
          id: index + 1,
          content: sanitizeOptionContent(option.content || ''),
          type: normalizeOptionType(option.type),
        }));
    } catch {
      // Fall through to line parser.
    }
  }

  const lines = response.trim().split('\n').filter(line => line.trim());
  const options: ReplyOption[] = [];
  for (const line of lines) {
    const match = line.trim().match(/^\[?([a-zA-Z\u4e00-\u9fa5]+)\]?[：:\s-]+(.+)$/);
    if (!match) continue;
    options.push({
      id: options.length + 1,
      type: normalizeOptionType(match[1]),
      content: sanitizeOptionContent(match[2]),
    });
    if (options.length >= 6) break;
  }

  return options;
}

function dedupeOptions(options: ReplyOption[], previousReplies: string[]): ReplyOption[] {
  const seen = new Set(previousReplies.map(normalizeTextForCompare));
  const deduped: ReplyOption[] = [];

  for (const option of options) {
    const normalized = normalizeTextForCompare(option.content);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push({ ...option, id: deduped.length + 1 });
  }

  return deduped;
}

function completeOptions(
  options: ReplyOption[],
  scenario: typeof SCENARIOS[0],
  currentPleasure: number,
  previousReplies: string[]
): ReplyOption[] {
  const used = new Set([...previousReplies, ...options.map(option => option.content)].map(normalizeTextForCompare));
  const completed = [...options];

  for (const fallback of getDefaultOptions(scenario, currentPleasure)) {
    if (completed.length >= 6) break;
    const normalized = normalizeTextForCompare(fallback.content);
    if (used.has(normalized)) continue;
    used.add(normalized);
    completed.push({ ...fallback, id: completed.length + 1 });
  }

  return completed.slice(0, 6).map((option, index) => ({ ...option, id: index + 1 }));
}

function getDefaultOptions(scenario: typeof SCENARIOS[0], currentPleasure: number): ReplyOption[] {
  const softer = currentPleasure >= 60;
  return [
    {
      id: 1,
      type: 'sincere',
      content: softer
        ? `我不急着翻篇，先把${scenario.title}这件事说清楚。`
        : `这次是我伤到你了，我先听你把委屈说完。`,
    },
    {
      id: 2,
      type: 'happy',
      content: `我现在先补一个实际行动，你说最想让我做哪件？`,
    },
    {
      id: 3,
      type: 'sweet',
      content: `你刚才那句话我听进去了，不是小题大做。`,
    },
    {
      id: 4,
      type: 'funny',
      content: `我申请暂停狡辩模式，改成认真修复模式。`,
    },
    {
      id: 5,
      type: 'neutral',
      content: `我可以解释经过，但先承认我的处理方式不对。`,
    },
    {
      id: 6,
      type: 'angry',
      content: `你也太敏感了吧，这事没必要一直揪着。`,
    },
  ];
}

function buildSystemPrompt(
  personality: typeof PERSONALITIES[0],
  scenario: typeof SCENARIOS[0],
  gender: 'male' | 'female',
  currentPleasure: number
): string {
  const genderText = gender === 'female' ? '女朋友' : '男朋友';
  const traitsText = personality.traits.join('、');

  return `你正在扮演恋爱哄哄模拟器里被伤害的一方，是一位「${personality.name}」的${genderText}。

角色设定：
- 你的性格特点：${traitsText}
- 性格说明：${personality.description}
- 发生的事情：${scenario.context}
- 当前愉悦值：${currentPleasure}/100。0 是非常生气，100 是完全被哄好。

回复规则：
1. 你要像真实伴侣一样回应玩家刚才的话，不要机械说教。
2. 可以在回复开头或句中加入括号旁白，描述动作、表情、神态，例如：（TA别过脸，声音低了些）。
3. 括号旁白只写可见动作/神态，不写心理旁白，不要太长。
4. 绝对不要在 reply 里说出愉悦值、分数、加几分、扣几分、好感度变化。
5. 根据玩家回复判断诚意和有效性，给出 pleasureChange，范围 -15 到 +15。
6. 回复要推动下一轮对话，可以表达需要解释、需要行动、需要补偿或继续倾听。

打分参考：
- 敷衍道歉：-5 到 0
- 找借口/推卸责任：-15 到 -5
- 普通回应：0 到 +5
- 真诚承担：+5 到 +10
- 深度共情或具体补救：+10 到 +15

只输出 JSON，不要 Markdown，不要解释：
{"reply":"（动作/神态）角色说的话","pleasureChange":数字}`;
}

function buildOpeningPrompt(
  personality: typeof PERSONALITIES[0],
  scenario: typeof SCENARIOS[0],
  gender: 'male' | 'female',
  currentPleasure: number
): string {
  const genderText = gender === 'female' ? '女朋友' : '男朋友';
  const traitsText = personality.traits.join('、');

  return `你正在扮演恋爱哄哄模拟器里被伤害的一方，是一位「${personality.name}」的${genderText}。

角色设定：
- 你的性格特点：${traitsText}
- 性格说明：${personality.description}
- 发生的事情：${scenario.context}
- 当前愉悦值：${currentPleasure}/100，非常不开心。

请说出游戏开场第一句话：
- 表达受伤、生气、委屈或冷淡。
- 可以包含一个括号旁白，显示动作、表情或神态。
- 不要输出愉悦值、分数、加分、扣分、好感度变化。
- 不要输出英文。

只输出 JSON，不要 Markdown，不要解释：
{"reply":"（动作/神态）角色说的话"}`;
}

function parseOpeningResponse(response: string): string {
  const json = extractJson(response);
  if (json) {
    try {
      const parsed = JSON.parse(json) as { reply?: string };
      if (typeof parsed.reply === 'string' && parsed.reply.trim()) {
        return parsed.reply.trim();
      }
    } catch {
      // Fall through to plain text cleanup.
    }
  }

  return response.trim();
}

function parseResponse(response: string): { reply: string; pleasureChange: number } {
  const json = extractJson(response);
  if (json) {
    try {
      const parsed = JSON.parse(json) as { reply?: string; pleasureChange?: number | string };
      const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
      const pleasureChange = clampPleasureChange(Number(parsed.pleasureChange));
      if (reply) return { reply, pleasureChange };
    } catch {
      // Fall through to legacy parser.
    }
  }

  const lines = response.trim().split('\n').map(line => line.trim()).filter(Boolean);
  const pleasureLine = lines.find(line => /愉悦值|开心值|好感度|分数|pleasure/i.test(line));
  const legacyChange = pleasureLine?.match(/([+-]?\d+)/)?.[1];
  const replyLines = lines.filter(line => line !== pleasureLine);

  return {
    reply: replyLines.join('\n').trim() || response.trim(),
    pleasureChange: clampPleasureChange(Number(legacyChange)),
  };
}

function normalizeReply(reply: string, personalityName: string, gender: 'male' | 'female'): string {
  const fallback = gender === 'female'
    ? `（她抿了抿嘴，眼神还有点委屈）你先别急着解释，我想听你认真说。`
    : `（他沉默了一下，语气还是有点硬）你先别急着解释，我想听你认真说。`;

  const cleaned = stripScoreLeak(reply)
    .replace(/^["“]|["”]$/g, '')
    .trim();

  if (!cleaned) return fallback;
  if (/^\s*[\(（\[]/.test(cleaned)) return cleaned;
  return `（TA看着你，${personalityName}的语气里还带着情绪）${cleaned}`;
}

function stripScoreLeak(text: string): string {
  return text
    .replace(/^\s*["“]?愉悦值(?:变化)?\s*[:：]?\s*[+-]?\d+["”]?\s*$/gim, '')
    .replace(/^\s*["“]?(?:开心值|好感度|分数)(?:变化)?\s*[:：]?\s*[+-]?\d+["”]?\s*$/gim, '')
    .replace(/(?:愉悦值|开心值|好感度|分数)(?:变化)?\s*[:：]?\s*[+-]?\d+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripJsonCodeFence(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractJson(text: string): string | null {
  const cleaned = stripJsonCodeFence(text);
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first < 0 || last <= first) return null;
  return cleaned.slice(first, last + 1);
}

function clampPleasureChange(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-15, Math.min(15, Math.round(value)));
}

function normalizeOptionType(type?: string): OptionType {
  const normalized = (type || '').trim().toLowerCase();
  if (OPTION_TYPES.includes(normalized as OptionType)) return normalized as OptionType;
  if (/生气|错误|冒险|angry/.test(normalized)) return 'angry';
  if (/开心|补救|行动|happy/.test(normalized)) return 'happy';
  if (/搞笑|轻松|funny/.test(normalized)) return 'funny';
  if (/撒娇|安抚|共情|sweet/.test(normalized)) return 'sweet';
  if (/真诚|承担|道歉|sincere/.test(normalized)) return 'sincere';
  return 'neutral';
}

function sanitizeOptionContent(content: string): string {
  return stripScoreLeak(content)
    .replace(/^\s*\d+[.、]\s*/, '')
    .replace(/^["“]|["”]$/g, '')
    .trim();
}

function normalizeTextForCompare(text: string): string {
  return stripNarrationText(text)
    .replace(/[，。！？、,.!?；;：“”"'（）()\[\]【】\s]/g, '')
    .toLowerCase();
}
