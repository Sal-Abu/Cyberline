import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderOgSvg } from '@/lib/og';
import { getProjectSlug } from '@/lib/projects';
import { defaultLocale } from '@/i18n';

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await getCollection('projects', ({ data }) => {
    return data.locale === defaultLocale && (import.meta.env.PROD ? data.draft !== true : true);
  });
  return projects.map((project) => ({
    params: { slug: getProjectSlug(project.id, project.data.locale) },
    props: {
      title: project.data.title,
      description: project.data.description,
    },
  }));
};

export const GET: APIRoute = ({ props }) => {
  const svg = renderOgSvg({
    title: props.title as string,
    subtitle: props.description as string | undefined,
    kind: 'PROJECTS',
  });
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
