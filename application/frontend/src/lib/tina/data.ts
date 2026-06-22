// @ts-nocheck (generated types/client appear after your first tinacms dev run)
import { requestWithMetadata } from '@tinacms/astro/data';
import client from '../../../tina/__generated__/client';

export const getPost = (slug: string) =>
  requestWithMetadata(client.queries.post({ relativePath: slug + '.md' }), {
    priority: 'primary',
  });

export const getHomepage = (locale: string) =>
  requestWithMetadata(client.queries.homepage({ relativePath: `${locale}/homepage.json` }), {
    priority: 'primary',
  });

export const getNavigation = (locale: string) =>
  requestWithMetadata(client.queries.navigation({ relativePath: `${locale}/navigation.json` }), {
    priority: 'primary',
  });

export const getSiteConfig = (locale: string) =>
  requestWithMetadata(client.queries.siteConfig({ relativePath: `${locale}/site-config.json` }), {
    priority: 'primary',
  });
