import { NextRequest, NextResponse } from 'next/server';
import { generateText, OpenRouterMessage } from '@/lib/ai/openrouter';
import { ProviderError, getHttpStatusForProviderError } from '@/lib/provider-errors';
import { PERSONALITIES, SCENARIOS, getPleasureStage, generateSSML } from '@/lib/game-config';

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
        messages: [{ role: 'system', content: openingPrompt }],
        temperature: 0.8,
        operation: 'game_opening',
      });

      reply = response.content;
    } else {
      if (!message) {
        return NextResponse.json({ error: '缺少玩家回复内容' }, { status: 400 });
      }

      const systemPrompt = buildSystemPrompt(personality, scenario, gender, currentPleasure);
      const messages: OpenRouterMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
      ];

      const response = await generateText({
        messages,
        temperature: 0.8,
        operation: 'game_reply',
      });

      const parsed = parseResponse(response.content);
      reply = parsed.reply;
      pleasureChange = parsed.pleasureChange;
    }

    const newPleasure = Math.max(0, Math.min(100, currentPleasure + pleasureChange));
    const pleasureStage = getPleasureStage(newPleasure);
    const ssml = generateSSML(reply, pleasureStage);
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

  const dialogueSummary = conversationHistory
    .map(msg => {
      const role = msg.role === 'user' ? '玩家' : 'TA';
      return `${role}: ${msg.content}`;
    })
    .join('\n');

  const prompt = `你是一个恋爱哄哄模拟器的选项生成器。

【角色说明】
- 玩家是做错事的一方，正在哄一个【${personality.name}】的${genderText}开心。
- 对方是被伤害的一方，玩家需要道歉、解释、共情并修复关系。

【场景】
${scenario.context}

【当前状态】
- 对方愉悦值：${currentPleasure}/100
- 对方刚说的话：${conversationHistory[conversationHistory.length - 1]?.content || ''}

【完整对话历史】
${dialogueSummary}

【玩家之前说过的回复】这些回复已经使用过，不要重复生成。
${playerPreviousReplies.length > 0 ? playerPreviousReplies.map((reply, index) => `${index + 1}. ${reply}`).join('\n') : '（还没有回复过）'}

【代词使用规范】
- 当提到第三者（如前任、朋友等）时，必须直接说“前任”“TA的朋友”等，不要用“他”或“她”造成性别混淆。

【选项生成要求】
1. 必须根据对方刚说的话和当前愉悦值，生成有针对性的回复选项。
2. 选项内容要与对方的话语有逻辑关联，不要泛泛而谈。
3. 绝对不能重复玩家之前说过的任何回复。
4. 选项要具体、真实、有代入感，不要说空话。

请生成 6 个玩家可以选择的回复选项，每种类型各一个：
1. 【惹人生气的】找借口、推卸责任、态度不好的话。
2. 【让人开心的】真诚温暖的话，能让对方心软。
3. 【搞笑的】幽默风趣的话，用轻松方式化解尴尬。
4. 【撒娇卖萌的】软萌可爱的语气，试图用可爱融化对方。
5. 【诚恳道歉的】认真认错，态度端正。
6. 【出其不意的】让人意想不到的回复，可能有点无厘头或惊喜。

【格式要求】
每行一个选项，格式：[类型]选项内容
请直接输出 6 个选项。`;

  const response = await generateText({
    messages: [{ role: 'user', content: prompt }],
    temperature: 1.0,
    operation: 'game_options',
  });

  const options = parseOptions(response.content);
  return options.length < 6 ? getDefaultOptions() : options;
}

function parseOptions(response: string): ReplyOption[] {
  const lines = response.trim().split('\n').filter(line => line.trim());
  const options: ReplyOption[] = [];

  const typeMap: Record<string, ReplyOption['type']> = {
    惹人生气的: 'angry',
    让人开心的: 'happy',
    搞笑的: 'funny',
    撒娇卖萌的: 'sweet',
    诚恳道歉的: 'sincere',
    出其不意的: 'neutral',
  };

  for (let i = 0; i < lines.length && options.length < 6; i++) {
    const line = lines[i].trim().replace(/^\d+[.、]\s*/, '');
    const match = line.match(/^\[([^\]]+)\](.+)$/);

    if (match) {
      const typeText = match[1].trim();
      const content = match[2].trim();
      const type = typeMap[typeText] || 'neutral';

      options.push({
        id: options.length + 1,
        content,
        type,
      });
    }
  }

  return options;
}

function getDefaultOptions(): ReplyOption[] {
  return [
    { id: 1, content: '对不起，我知道我错了，下次一定注意。', type: 'sincere' },
    { id: 2, content: '宝贝别生气了嘛，我真的知道错了，原谅我好不好？', type: 'sweet' },
    { id: 3, content: '其实我也没办法啊，你别想太多。', type: 'angry' },
    { id: 4, content: '我知道这次让你难过了，先让我认真补偿你好不好？', type: 'happy' },
    { id: 5, content: '我现在申请进入反省模式，直到你点头为止。', type: 'funny' },
    { id: 6, content: '要不我先把今天的解释权交给你，我只负责听和改。', type: 'neutral' },
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

  return `你是一个【${personality.name}】的${genderText}，你的性格特点是：${traitsText}。

【重要角色说明】
- 你是被伤害的一方，你的伴侣做了对不起你的事。
- 伴侣正在向你道歉、哄你开心。
- 你需要根据伴侣的话语判断其真诚度，做出符合你性格的回应。

【发生的事情】
${scenario.context}

【当前状态】
- 愉悦值：${currentPleasure}/100，0 为很不开心，100 为很开心。

【愉悦值判定规则】
- 敷衍道歉：-5 到 0
- 找借口/推卸责任：-10 到 -5
- 普通回应：0 到 +5
- 真诚道歉：+5 到 +10
- 深度共情：+10 到 +15
- 搞笑/可爱化解：+3 到 +8
- 惹人生气：-15 到 -8

【回应要求】
1. 回应要自然口语化，适合语音输出。
2. 符合你的性格特点：${personality.description}
3. 根据当前愉悦值调整语气：
   - 0-29：冷淡、生气、简短、有怨气。
   - 30-59：有所缓和，愿意听但还有情绪。
   - 60-89：明显缓和，心软了，愿意沟通。
   - 90-100：已经开心，语气轻松愉快。
4. 适当使用省略号“...”表示停顿或犹豫。
5. 不要使用任何英文。
6. 当提到第三者时，直接说“前任”“TA的朋友”等，不要用“他”或“她”造成性别混淆。

【输出格式】
第一行输出你的回应内容，纯文本，不要加引号。
第二行输出愉悦值变化，格式：愉悦值变化 +X 或 愉悦值变化 -X。`;
}

function buildOpeningPrompt(
  personality: typeof PERSONALITIES[0],
  scenario: typeof SCENARIOS[0],
  gender: 'male' | 'female',
  currentPleasure: number
): string {
  const genderText = gender === 'female' ? '女朋友' : '男朋友';
  const traitsText = personality.traits.join('、');

  return `你是一个【${personality.name}】的${genderText}，你的性格特点是：${traitsText}。

【重要角色说明】
- 你是被伤害的一方，你的伴侣做了对不起你的事。
- 现在伴侣来向你道歉、哄你开心。
- 你需要表达被伤害后的不满、生气或委屈。

【发生的事情】
${scenario.context}

【当前状态】
- 愉悦值：${currentPleasure}/100，非常不开心。
- 你很生气、很委屈，等待对方来哄你。

【开场白要求】
1. 作为被伤害的一方，表达你的不满、生气或委屈。
2. 符合你的性格特点：${personality.description}
3. 语气冷淡、有怨气。
4. 适当使用省略号“...”表示停顿或犹豫。
5. 不要使用任何英文。
6. 当提到第三者时，直接说“前任”“TA的朋友”等，不要用“他”或“她”造成性别混淆。

请根据场景和性格，说出被伤害后的第一句话。只输出你的话，不要输出愉悦值变化。`;
}

function parseResponse(response: string): { reply: string; pleasureChange: number } {
  const lines = response.trim().split('\n').map(line => line.trim()).filter(Boolean);
  const pleasureLine = lines.find(line => line.includes('愉悦值变化'));

  let pleasureChange = 0;
  if (pleasureLine) {
    const match = pleasureLine.match(/愉悦值变化\s*[:：]?\s*([+-]?\d+)/);
    if (match) {
      pleasureChange = parseInt(match[1], 10);
    }
  }

  const replyLines = lines.filter(line => !line.includes('愉悦值变化'));
  const reply = replyLines.join('\n').trim() || response.trim();

  return { reply, pleasureChange };
}
