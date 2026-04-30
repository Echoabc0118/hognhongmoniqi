// 游戏配置文件

// 性格类型
export type PersonalityType = 'gentle' | 'tsundere' | 'stubborn' | 'intellectual' | 'scheming';

// 性格配置
export interface Personality {
  id: PersonalityType;
  name: string;
  description: string;
  femaleVoice: string;
  maleVoice: string;
  traits: string[];
}

// 性格列表
export const PERSONALITIES: Personality[] = [
  {
    id: 'gentle',
    name: '温柔型',
    description: '温柔体贴、轻声细语，容易被真诚打动',
    femaleVoice: 'zh_female_xiaohe_uranus_bigtts',
    maleVoice: 'zh_male_ruyayichen_saturn_bigtts',
    traits: ['善解人意', '容易心软', '注重感受'],
  },
  {
    id: 'tsundere',
    name: '傲娇型',
    description: '嘴硬心软、有点小脾气，需要耐心哄',
    femaleVoice: 'saturn_zh_female_tiaopigongzhu_tob',
    maleVoice: 'saturn_zh_male_tiancaitongzhuo_tob',
    traits: ['嘴硬心软', '需要台阶', '爱面子'],
  },
  {
    id: 'stubborn',
    name: '倔强型',
    description: '坚持己见、不容易妥协，需要真诚和行动',
    femaleVoice: 'saturn_zh_female_cancan_tob',
    maleVoice: 'zh_male_m191_uranus_bigtts',
    traits: ['固执', '需要行动证明', '不容易原谅'],
  },
  {
    id: 'intellectual',
    name: '知性型',
    description: '理性冷静、讲道理，需要逻辑和反思',
    femaleVoice: 'zh_female_vv_uranus_bigtts',
    maleVoice: 'zh_male_dayi_saturn_bigtts',
    traits: ['理性', '讲道理', '注重逻辑'],
  },
  {
    id: 'scheming',
    name: '腹黑型',
    description: '外柔内刚、心思缜密，需要真心和小惊喜',
    femaleVoice: 'zh_female_meilinvyou_saturn_bigtts',
    maleVoice: 'zh_male_taocheng_uranus_bigtts',
    traits: ['心思缜密', '外柔内刚', '需要真心'],
  },
];

// 吵架场景
export interface Scenario {
  id: number;
  title: string;
  description: string;
  initialPleasure: number; // 初始愉悦值
  context: string;
}

// 场景列表
export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: '约会迟到',
    description: '约会迟到，让对方等了很久',
    initialPleasure: 20,
    context: '伴侣和你约好下午3点见面，但TA迟到了整整一个小时，你在寒风中等了很久，电话也没接。',
  },
  {
    id: 2,
    title: '忘记纪念日',
    description: '忘记了重要的纪念日/生日',
    initialPleasure: 20,
    context: '今天是你们在一起两周年纪念日，但伴侣完全忘记了，你期待了一整天，TA却像平常一样回家了。',
  },
  {
    id: 3,
    title: '看了对方手机',
    description: '不经同意看了对方的手机',
    initialPleasure: 20,
    context: '伴侣趁你洗澡的时候偷偷看了你的手机，被你发现后非常生气，觉得TA不信任你。',
  },
  {
    id: 4,
    title: '和前任联系',
    description: '和前任保持联系被发现了',
    initialPleasure: 20,
    context: '你发现伴侣最近和前任还有联系，虽然只是普通聊天，但你觉得这触碰了底线。',
  },
  {
    id: 5,
    title: '答应的事没做',
    description: '答应的事没有做到',
    initialPleasure: 20,
    context: '伴侣答应周末陪你看电影，结果因为打游戏忘记了这个约定，你一个人在电影院门口等。',
  },
  {
    id: 6,
    title: '当众说难堪话',
    description: '在朋友面前说了让对方难堪的话',
    initialPleasure: 20,
    context: '今天和朋友聚会时，伴侣开玩笑说了你的糗事，朋友们都在笑，你当时就黑脸了。',
  },
  {
    id: 7,
    title: '沉迷手机',
    description: '玩游戏/刷手机忽略了对方',
    initialPleasure: 20,
    context: '你们好不容易有时间一起吃饭，但伴侣全程都在刷手机打游戏，你说什么TA都敷衍回应。',
  },
  {
    id: 8,
    title: '失联',
    description: '没有及时回复消息，对方找不到人',
    initialPleasure: 20,
    context: '你今天给伴侣发了十几条消息，打了好几个电话，TA一个都没回，你担心了一整天。',
  },
  {
    id: 9,
    title: '临时取消约会',
    description: '约好的计划临时取消',
    initialPleasure: 20,
    context: '你们计划了好久的旅行，出发前一天伴侣突然说要加班去不了了，你非常失望。',
  },
  {
    id: 10,
    title: '送错礼物',
    description: '送了对方不喜欢的礼物',
    initialPleasure: 20,
    context: '你生日伴侣送了一个礼物，但那是你明确说过不喜欢的类型，你觉得TA根本没用心了解你。',
  },
];

// 愉悦值阶段
export interface PleasureStage {
  min: number;
  max: number;
  label: string;
  emotion: string;
  speechRate: 'slow' | 'medium' | 'fast';
  volume: 'soft' | 'medium' | 'loud';
  breakTime: number; // 毫秒
}

export const PLEASURE_STAGES: PleasureStage[] = [
  {
    min: 0,
    max: 29,
    label: '很不开心',
    emotion: '冷淡、生气',
    speechRate: 'slow',
    volume: 'soft',
    breakTime: 800,
  },
  {
    min: 30,
    max: 59,
    label: '有点缓和',
    emotion: '有所软化',
    speechRate: 'medium',
    volume: 'medium',
    breakTime: 400,
  },
  {
    min: 60,
    max: 89,
    label: '心情好转',
    emotion: '愿意沟通',
    speechRate: 'medium',
    volume: 'medium',
    breakTime: 200,
  },
  {
    min: 90,
    max: 100,
    label: '很开心',
    emotion: '开心、原谅',
    speechRate: 'fast',
    volume: 'loud',
    breakTime: 100,
  },
];

// 获取当前愉悦值阶段
export function getPleasureStage(pleasure: number): PleasureStage {
  for (const stage of PLEASURE_STAGES) {
    if (pleasure >= stage.min && pleasure <= stage.max) {
      return stage;
    }
  }
  return PLEASURE_STAGES[0];
}

// 生成 SSML
export function generateSSML(text: string, pleasureStage: PleasureStage): string {
  const rateMap = {
    slow: '-20%',   // 0.6倍速
    medium: '-10%', // 0.8倍速
    fast: '0%',     // 1倍速
  };
  
  const volumeMap = {
    soft: '-30%',
    medium: '0%',
    loud: '+20%',
  };

  // 如果文本中有省略号，添加停顿
  let processedText = text.replace(/\.\.\./g, `<break time="${pleasureStage.breakTime}ms"/>...`);
  
  // 在句号后添加停顿
  processedText = processedText.replace(/\。/g, `。<break time="${pleasureStage.breakTime}ms"/>`);

  // 简化 SSML，移除多余换行和缩进
  return `<speak><prosody rate="${rateMap[pleasureStage.speechRate]}" volume="${volumeMap[pleasureStage.volume]}">${processedText}</prosody></speak>`;
}

// 游戏状态
export type GameStatus = 'idle' | 'selecting' | 'playing' | 'won' | 'lost' | 'timeout';

// 游戏设置
export interface GameSettings {
  gender: 'male' | 'female';
  personality: PersonalityType;
  scenarioId: number;
}

// 游戏状态
export interface GameState {
  status: GameStatus;
  settings: GameSettings | null;
  pleasure: number; // 愉悦值 (0-100)
  round: number;
  maxRounds: number; // 最大对话次数 (10-20)
  messages: Message[];
  startTime: number | null;
  endTime: number | null;
}

// 消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  pleasureChange: number; // 愉悦值变化
  currentPleasure?: number; // 当前愉悦值（变化后的值，仅assistant消息需要）
  timestamp: number;
  audioUrl?: string;
  ssml?: string; // SSML语音标记
}

// 排行榜记录
export interface LeaderboardEntry {
  id: string;
  nickname: string;
  rounds: number;
  duration: number;
  personality: string;
  scenario: string;
  timestamp: number;
}

// 成就标签
export interface Achievement {
  id: string;
  name: string;
  description: string;
  condition: (state: GameState) => boolean;
}

// 成就列表
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'speed_demon',
    name: '速战速决',
    description: '10轮内让TA开心',
    condition: (state) => state.round <= 10 && state.status === 'won',
  },
  {
    id: 'sincere',
    name: '真诚满分',
    description: '连续3次增加愉悦值',
    condition: () => false, // 需要额外追踪
  },
  {
    id: 'patient',
    name: '耐心满分',
    description: '完成15轮以上对话并获得成功',
    condition: (state) => state.round >= 15 && state.status === 'won',
  },
  {
    id: 'master',
    name: '哄人高手',
    description: '成功让TA开心',
    condition: (state) => state.status === 'won',
  },
];
