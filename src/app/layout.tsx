import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';

export const metadata: Metadata = {
  title: {
    default: '恋爱哄哄模拟器 | 情感沟通练习',
    template: '%s | 恋爱哄哄模拟器',
  },
  description:
    '惹TA生气了不知道怎么哄？来恋爱哄哄模拟器练习吧！选择场景，通过真诚的对话获得TA的原谅，提升你的情感表达和共情能力。',
  keywords: [
    '哄人练习',
    '情感沟通',
    '恋爱技巧',
    '吵架和好',
    '共情能力',
    '情侣游戏',
    'AI对话',
  ],
  authors: [{ name: '恋爱哄哄模拟器', url: 'https://code.coze.cn' }],
  generator: 'Coze Code',
  // icons: {
  //   icon: '',
  // },
  openGraph: {
    title: '扣子编程 | 你的 AI 工程师已就位',
    description:
      '我正在使用扣子编程 Vibe Coding，让创意瞬间上线。告别拖拽，拥抱心流。',
    url: 'https://code.coze.cn',
    siteName: '扣子编程',
    locale: 'zh_CN',
    type: 'website',
    // images: [
    //   {
    //     url: '',
    //     width: 1200,
    //     height: 630,
    //     alt: '扣子编程 - 你的 AI 工程师',
    //   },
    // ],
  },
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'Coze Code | Your AI Engineer is Here',
  //   description:
  //     'Build and deploy full-stack applications through AI conversation. No env setup, just flow.',
  //   // images: [''],
  // },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
