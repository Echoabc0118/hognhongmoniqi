import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { PERSONALITIES, SCENARIOS, getPleasureStage, generateSSML } from '@/lib/game-config';

// 请求类型
interface ChatRequest {
  message?: string; // 玩家选择的回复（可选，开场白时不需要）
  gender: 'male' | 'female';
  personalityId: string;
  scenarioId: number;
  currentPleasure: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  isFirstMessage?: boolean; // 是否是开场白
}

// 选项类型
export interface ReplyOption {
  id: number;
  content: string;
  type: 'angry' | 'happy' | 'funny' | 'sweet' | 'sincere' | 'neutral';
}

// 响应类型
interface ChatResponse {
  reply: string; // TA的回复
  pleasureChange: number; // 愉悦值变化
  newPleasure: number; // 新愉悦值
  ssml: string; // SSML语音标记
  pleasureStage: {
    label: string;
    emotion: string;
  };
  options: ReplyOption[]; // 6个可选回复
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, gender, personalityId, scenarioId, currentPleasure, conversationHistory, isFirstMessage } = body;
    
    // 获取性格配置
    const personality = PERSONALITIES.find(p => p.id === personalityId);
    if (!personality) {
      return NextResponse.json({ error: '无效的性格类型' }, { status: 400 });
    }
    
    // 获取场景配置
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: '无效的场景' }, { status: 400 });
    }
    
    // 初始化 LLM 客户端
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);
    
    let reply = '';
    let pleasureChange = 0;
    
    if (isFirstMessage) {
      // 开场白：生成TA的第一句话
      const openingPrompt = buildOpeningPrompt(personality, scenario, gender, currentPleasure);
      const messages = [{ role: 'system' as const, content: openingPrompt }];
      
      let fullResponse = '';
      const stream = client.stream(messages, { temperature: 0.8 });
      
      for await (const chunk of stream) {
        if (chunk.content) {
          fullResponse += chunk.content.toString();
        }
      }
      
      reply = fullResponse.trim();
      pleasureChange = 0;
    } else {
      // 玩家选择了某个回复，生成TA的反应
      const systemPrompt = buildSystemPrompt(personality, scenario, gender, currentPleasure);
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: message! },
      ];
      
      let fullResponse = '';
      const stream = client.stream(messages, { temperature: 0.8 });
      
      for await (const chunk of stream) {
        if (chunk.content) {
          fullResponse += chunk.content.toString();
        }
      }
      
      // 解析响应（提取愉悦值变化）
      const parsed = parseResponse(fullResponse);
      reply = parsed.reply;
      pleasureChange = parsed.pleasureChange;
    }
    
    // 计算新愉悦值
    const newPleasure = Math.max(0, Math.min(100, currentPleasure + pleasureChange));
    
    // 获取愉悦值阶段
    const pleasureStage = getPleasureStage(newPleasure);
    
    // 生成 SSML
    const ssml = generateSSML(reply, pleasureStage);
    
    // 生成6个可选回复
    const options = await generateOptions(client, personality, scenario, gender, newPleasure, [
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
    return NextResponse.json(
      { error: '对话生成失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 生成6个可选回复
async function generateOptions(
  client: LLMClient,
  personality: typeof PERSONALITIES[0],
  scenario: typeof SCENARIOS[0],
  gender: 'male' | 'female',
  currentPleasure: number,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ReplyOption[]> {
  const genderText = gender === 'female' ? '女朋友' : '男朋友';

  // 提取玩家之前选择过的回复（所有role为user的content）
  const playerPreviousReplies = conversationHistory
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content)
    .filter(content => content.trim());

  // 构建对话历史摘要
  const dialogueSummary = conversationHistory
    .map((msg, idx) => {
      const role = msg.role === 'user' ? '玩家' : 'TA';
      return `${role}: ${msg.content}`;
    })
    .join('\n');

  const prompt = `你是一个恋爱哄哄模拟游戏的选项生成器。

【角色说明】
- 玩家是做错事的一方（比如迟到、忘记纪念日、放鸽子等）
- 玩家需要哄一个【${personality.name}】的${genderText}开心
- 玩家是被伤害者的伴侣，现在来道歉、哄对方

【场景】${scenario.context}

【当前状态】
- 对方愉悦值：${currentPleasure}/100
- 对方刚说的话：${conversationHistory[conversationHistory.length - 1]?.content || ''}

【完整对话历史】
${dialogueSummary}

【玩家之前说过的回复】（以下这些回复已经被使用过，不要重复生成）
${playerPreviousReplies.length > 0 ? playerPreviousReplies.map((r, i) => `${i + 1}. ${r}`).join('\n') : '（还没有回复过）'}

【代词使用规范 - 重要！】
- 当提到第三者（如前任、朋友等）时，必须直接说"前任"、"TA的朋友"等，不要用"他"或"她"
- 例如：说"你和前任聊天"而不是"你和她聊天"或"你和他聊天"

【选项生成要求】
1. 必须根据对方刚说的话和当前愉悦值，生成有针对性的回复选项
2. 选项内容要与对方的话语有逻辑关联，不能是泛泛而谈
3. 对方刚刚提到了什么话题，选项要回应这个话题
4. 如果对方语气缓和，选项要更积极；如果对方还在生气，选项要更诚恳
5. 绝对不能重复上面【玩家之前说过的回复】中的任何内容
6. 选项要具体、真实、有代入感，不要说空话

请生成6个玩家可以选择的回复选项，每种类型各一个：
1. 【惹人生气的】- 找借口、推卸责任、态度不好的话
2. 【让人开心的】- 真诚温暖的话，能让对方心软
3. 【搞笑的】- 幽默风趣的话，用轻松的方式化解尴尬
4. 【撒娇卖萌的】- 软萌可爱的语气，试图用可爱融化对方
5. 【诚恳道歉的】- 正经认真地认错，态度端正
6. 【出其不意的】- 让人意想不到的回复，可能有点无厘头或惊喜

【格式要求】
每行一个选项，格式：[类型]选项内容

【示例说明】
假设场景是"约会迟到"：
- 对方刚说："你终于来了...让我等了这么久，你知不知道外面有多冷...而且你还穿得这么少..."
- 之前玩家说过："对不起对不起，我不该迟到的"

生成的6个选项应该是针对"外面冷"、"穿得少"这些具体内容来回应，而不是泛泛而谈：

[惹人生气的]我这不是来了吗？外面冷你自己不会早点走啊？
[让人开心的]对不起让你受冻了...我看你穿得这么少，赶紧去吃点热乎的暖暖身子吧
[搞笑的]下次我一定提前到，如果迟到我就把外套给你当被子盖，这样你就不会冷了！
[撒娇卖萌的]宝贝~你冷不冷啊？我知道错了，快让我给你暖暖手好不好？
[诚恳道歉的]我知道让你在冷风中等我很过分，下次我一定提前半小时到，再也不让你等了
[出其不意的]你看，我特意跑了几条街买了你最爱的热奶茶，赶紧喝了暖暖身子

请注意：这些选项都回应了"冷"、"等"等对方提到的具体内容，而不是只说空话。

请直接输出6个选项：`;

  const messages = [{ role: 'user' as const, content: prompt }];
  
  let fullResponse = '';
  const stream = client.stream(messages, { temperature: 1.0 });
  
  for await (const chunk of stream) {
    if (chunk.content) {
      fullResponse += chunk.content.toString();
    }
  }
  
  // 解析选项
  const options = parseOptions(fullResponse);
  
  // 如果解析失败，返回默认选项
  if (options.length < 6) {
    return getDefaultOptions();
  }
  
  return options;
}

// 解析选项
function parseOptions(response: string): ReplyOption[] {
  const lines = response.trim().split('\n').filter(line => line.trim());
  const options: ReplyOption[] = [];
  
  const typeMap: Record<string, ReplyOption['type']> = {
    '惹人生气的': 'angry',
    '让人开心的': 'happy',
    '搞笑的': 'funny',
    '撒娇卖萌的': 'sweet',
    '诚恳道歉的': 'sincere',
    '出其不意的': 'neutral',
  };
  
  for (let i = 0; i < lines.length && options.length < 6; i++) {
    const line = lines[i].trim();
    // 匹配 [类型]内容 格式
    const match = line.match(/^\[([^\]]+)\](.+)$/);
    if (match) {
      const typeText = match[1];
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

// 默认选项（备用）
function getDefaultOptions(): ReplyOption[] {
  return [
    { id: 1, content: '对不起，我知道我错了，下次一定注意', type: 'sincere' },
    { id: 2, content: '宝贝别生气了嘛~我错了，原谅我好不好？', type: 'sweet' },
    { id: 3, content: '其实我也没办法啊...', type: 'angry' },
    { id: 4, content: '你看我这么诚恳，给个机会吧？', type: 'happy' },
    { id: 5, content: '我给你讲个笑话消消气？', type: 'funny' },
    { id: 6, content: '要不...我请你吃好吃的？', type: 'neutral' },
  ];
}

// 构建系统提示（玩家选择后TA的反应）
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
- 你是被伤害的一方，你的伴侣做了对不起你的事
- 伴侣正在向你道歉、哄你开心
- 你需要根据伴侣的话语判断其真诚度，做出符合你性格的回应

【发生的事情】
${scenario.context}

你现在的状态：
- 愉悦值：${currentPleasure}/100（0为很不开心，100为很开心）

【愉悦值判定规则】
- 敷衍道歉（如"我错了"、"对不起嘛"、"别生气了"等没有具体内容的道歉）：愉悦值+0或-5
- 找借口/推卸责任（如"我也没办法"、"是你太敏感了"等）：愉悦值-5到-10
- 普通回应（无明显特征）：愉悦值+0到+5
- 真诚道歉（具体承认错误+表达歉意）：愉悦值+5到+10
- 深度共情（换位思考+提出改进方案+情感连接）：愉悦值+10到+15
- 搞笑/可爱（用幽默或可爱的方式化解）：愉悦值+3到+8
- 惹人生气（故意说让对方不开心的话）：愉悦值-8到-15

【回应要求】
1. 回应要自然口语化，适合语音输出
2. 符合你的性格特点：${personality.description}
3. 根据当前愉悦值调整语气：
   - 愉悦值0-29：语气冷淡、说话简短、有怨气
   - 愉悦值30-59：语气有所缓和、愿意听但还有情绪
   - 愉悦值60-89：语气明显缓和、心软了、愿意沟通
   - 愉悦值90-100：已经开心、语气轻松愉快
4. 适当使用省略号"..."表示停顿或犹豫
5. 不要使用任何英文

【代词使用规范 - 重要！】
- 当提到第三者（如前任、朋友等）时，必须直接说"前任"、"TA的朋友"等，不要用"他"或"她"
- 例如：说"你和前任聊天"而不是"你和她聊天"或"你和他聊天"

【输出格式】
第一行输出你的回应内容（纯文本，不要加引号）
第二行输出愉悦值变化（格式：愉悦值变化:+X 或 愉悦值变化:-X，X为具体数字）

示例：
我...我知道你不是故意的...但是你让我等了一个小时诶...
愉悦值变化:+5`;
}

// 构建开场白提示
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
- 你是被伤害的一方，你的伴侣做了对不起你的事
- 现在伴侣来向你道歉、哄你开心
- 你需要表达被伤害后的不满、生气或委屈

【发生的事情】
${scenario.context}

你现在的状态：
- 愉悦值：${currentPleasure}/100（非常不开心）
- 你很生气、很委屈，等待对方来哄你

【开场白要求】
1. 作为被伤害的一方，表达你的不满、生气或委屈
2. 要符合你的性格特点：${personality.description}
3. 语气要冷淡、有怨气（因为你被伤害了，很不开心）
4. 适当使用省略号"..."表示停顿或犹豫
5. 不要使用任何英文

【代词使用规范 - 重要！】
- 当提到第三者（如前任、朋友等）时，必须直接说"前任"、"TA的朋友"等，不要用"他"或"她"
- 例如：说"你和前任聊天"而不是"你和她聊天"或"你和他聊天"

【输出格式】
只输出你的话语，不需要输出愉悦值变化

【错误示例 - 不要这样说】
❌ "我也不想这样，谁愿意放你鸽子啊" - 这是施害者说的话，你是受害者！
❌ "对不起让你失望了" - 你不需要道歉，是对方做错了！

【正确示例】
场景是"约会迟到"时：
✓ 你终于来了...让我等了这么久，你知不知道外面有多冷...

场景是"临时取消约会"时：
✓ 你说好的旅行...说取消就取消...你知道我期待了多久吗...

场景是"忘记纪念日"时：
✓ 今天是什么日子...你记得吗...算了，你根本就不在意...

请根据场景和你的性格，说出被伤害后的第一句话：`;
}

// 解析响应
function parseResponse(response: string): { reply: string; pleasureChange: number } {
  const lines = response.trim().split('\n');
  
  // 查找愉悦值变化行
  const pleasureLine = lines.find(line => line.includes('愉悦值变化:'));
  
  let pleasureChange = 0;
  if (pleasureLine) {
    const match = pleasureLine.match(/愉悦值变化:([+-]?\d+)/);
    if (match) {
      pleasureChange = parseInt(match[1], 10);
    }
  }
  
  // 提取回复内容（排除愉悦值变化行）
  const replyLines = lines.filter(line => !line.includes('愉悦值变化:'));
  const reply = replyLines.join('\n').trim();
  
  return { reply, pleasureChange };
}
