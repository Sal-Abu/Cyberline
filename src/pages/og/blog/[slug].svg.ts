import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderOgSvg } from '@/lib/og';
import { getPostSlug } from '@/lib/blog';
import { defaultLocale } from '@/i18n';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection('blog', ({ data }) => {
    return data.locale === defaultLocale && (import.meta.env.PROD ? data.draft !== true : true);
  });
  return posts.map((post) => ({
    params: { slug: getPostSlug(post.id, post.data.locale) },
    props: {
      title: post.data.title,
      description: post.data.description,
    },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const svg = renderOgSvg({
    title: props.title as string,
    subtitle: props.description as string | undefined,
    kind: 'BLOG',
  });
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
