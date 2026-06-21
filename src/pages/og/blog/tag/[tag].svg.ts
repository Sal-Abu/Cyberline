import type { APIRoute, GetStaticPaths } from 'astro';
import { collectTags, getPublishedPosts, tagToSlug } from '@/lib/blog';
import { renderOgSvg } from '@/lib/og';

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getPublishedPosts();
  const tags = collectTags(posts);

  return tags.map((tag) => {
    const count = posts.filter((p) => p.data.tags.includes(tag)).length;
    return {
      params: { tag: tagToSlug(tag) },
      props: { tag, count },
    };
  });
};

export const GET: APIRoute = ({ props }) => {
  const tag = props.tag as string;
  const count = props.count as number;
  const svg = renderOgSvg({
    title: `#${tag}`,
    subtitle: `${count} post${count === 1 ? '' : 's'} on the blog`,
    kind: 'TAG',
  });
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
