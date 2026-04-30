'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Clock, Plus, Loader2, Sparkles } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  summary: string;
  created_at: string;
  readTime: number;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/blog');
      const data = await response.json();

      if (data.error) {
        console.error('获取文章列表失败:', data.error);
        return;
      }

      setPosts(data.posts || []);
    } catch (error) {
      console.error('获取文章列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewArticle = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/blog/generate', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.error) {
        alert(`生成文章失败: ${data.error}`);
        return;
      }

      alert('文章生成成功！');
      fetchPosts(); // 重新加载文章列表
    } catch (error) {
      console.error('生成文章失败:', error);
      alert('生成文章失败');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 py-12 px-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回首页
          </Link>

          <div className="text-center">
            <div className="inline-block bg-pink-100 px-4 py-2 rounded-full mb-4">
              <span className="text-pink-600 font-medium text-sm">💝 恋爱小课堂</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              恋爱攻略
            </h1>
            <p className="text-gray-600 text-lg mb-6">
              提升你的哄人技能，成为恋爱大师
            </p>

            {/* 生成文章按钮 */}
            <button
              onClick={generateNewArticle}
              disabled={generating}
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-full hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  正在生成...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  生成新文章
                </>
              )}
            </button>
          </div>
        </div>

        {/* 文章列表 */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="group bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-pink-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {post.summary}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center text-gray-500 text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    {post.readTime} 分钟阅读
                  </div>
                  <div className="text-pink-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                    阅读更多 →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">暂无文章</p>
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center bg-white px-6 py-3 rounded-full shadow-md">
            <BookOpen className="w-5 h-5 text-pink-600 mr-2" />
            <span className="text-gray-700">持续更新中，敬请期待更多内容！</span>
          </div>
        </div>
      </div>
    </div>
  );
}
