import { useTina } from "tinacms/dist/react";
import type { ReactNode } from "react";

interface TinaWrapperProps {
  children: ReactNode;
  query: string;
  variables: { relativePath: string };
  data: any;
}

/**
 * Minimal React wrapper that provides TinaCMS context for visual editing
 * This enables click-to-edit functionality while keeping Astro components for SEO
 */
export function TinaWrapper({ children, query, variables, data }: TinaWrapperProps) {
  // useTina hook enables visual editing when in TinaCMS admin
  useTina({
    query,
    variables,
    data,
  });

  // Just render children - the useTina hook above provides the editing context
  return <>{children}</>;
}

// Made with Bob
