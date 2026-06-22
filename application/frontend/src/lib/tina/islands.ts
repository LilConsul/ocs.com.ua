// @ts-nocheck (generated types/client appear after your first tinacms dev run)
import type { IslandRegistry } from '@tinacms/astro/experimental';
import type { QueryResult } from '@tinacms/astro/data';
import type { PostQuery, HomepageQuery } from '../../../tina/__generated__/types';
import PostBody from '../../components/tina/PostBody.astro';
import { HomepageEditor } from '../../components/tina/HomepageEditor';
import { getPost, getHomepage } from './data';

export const islands: IslandRegistry = {
  post: {
    fetch: (_request, params) => getPost(params.get('slug') ?? 'hello-world'),
    component: PostBody,
    wrapper: { tag: 'article' },
    propsFromData: (data) => ({
      data: (data as QueryResult<PostQuery>).data?.post,
    }),
  },
  homepage: {
    fetch: (request, _params) => {
      const url = new URL(request.url);
      const locale = url.searchParams.get('locale') ?? 'en';
      return getHomepage(locale);
    },
    component: HomepageEditor,
    wrapper: { tag: 'main', attrs: { id: 'main-content' } },
    propsFromData: (data) => ({
      data: (data as QueryResult<HomepageQuery>).data?.homepage,
    }),
  },
};
