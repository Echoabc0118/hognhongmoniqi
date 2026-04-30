'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { ArrowLeft, BookOpen, Clock, Calendar, Loader2 } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  summary: string;
  content: string;
  created_at: string;
}

export default function BlogDetailPage() {
  const params = useParams();
  const articleId = parseInt(params.id as string);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [recommendedPosts, setRecommendedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(articleId)) {
      notFound();
      return;
    }

    fetchPost();
    window.scrollTo(0, 0);
  }, [articleId]);

  const fetchPost = async () => {
    try {
      // 获取文章详情
      const postResponse = await fetch(`/api/blog/${articleId}`);
      const postData = await postResponse.json();

      if (postData.error) {
        console.error('获取文章失败:', postData.error);
        setLoading(false);
        return;
      }

      if (!postData.post) {
        notFound();
        return;
      }

      setPost(postData.post);

      // 获取文章列表用于推荐
      const listResponse = await fetch('/api/blog');
      const listData = await listResponse.json();

      if (listData.posts) {
        // 推荐其他2篇文章（排除当前文章）
        const recommended = listData.posts
          .filter((p: BlogPost) => p.id !== articleId)
          .slice(0, 2);
        setRecommendedPosts(recommended);
      }
    } catch (error) {
      console.error('获取文章失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 py-12 px-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  if (!post) {
    notFound();
    return null;
  }

  const readTime = Math.ceil(post.content.length / 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <Link href="/blog" className="inline-flex items-center text-pink-600 hover:text-pink-700 mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回文章列表
        </Link>

        {/* 文章头部 */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(post.created_at).toLocaleDateString('zh-CN')}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {readTime} 分钟阅读
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>

          <p className="text-gray-600 text-lg leading-relaxed">
            {post.summary}
          </p>
        </div>

        {/* 文章内容 */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
          <div className="prose prose-lg max-w-none">
            {post.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-gray-700 leading-relaxed mb-6 text-lg">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* 推荐阅读 */}
        {recommendedPosts.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-pink-600" />
              推荐阅读
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedPosts.map((recPost) => (
                <Link
                  key={recPost.id}
                  href={`/blog/${recPost.id}`}
                  className="group p-4 border-2 border-gray-100 rounded-xl hover:border-pink-200 hover:bg-pink-50 transition-all"
                >
                  <h3 className="font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors">
                    {recPost.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {recPost.summary}
                  </p>
                  <div className="flex items-center mt-3 text-pink-600 text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    {Math.ceil(recPost.summary.length / 50)} 分钟阅读
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 返回游戏按钮 */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-full hover:from-pink-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
          >
            开始哄哄游戏
          </Link>
        </div>
      </div>
    </div>
  );
}
