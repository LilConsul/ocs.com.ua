import { useTina } from "tinacms/dist/react";
import type { ReactNode } from "react";

interface TinaProviderProps {
  children: (data: any) => ReactNode;
  query: string;
  variables: any;
  data: any;
}

/**
 * Wrapper component that enables Tina visual editing
 * When authenticated, this provides live editing capabilities
 * When not authenticated, it just passes through the data
 */
export function TinaProvider({ children, query, variables, data }: TinaProviderProps) {
  // useTina hook enables visual editing when authenticated
  const { data: tinaData } = useTina({
    query,
    variables,
    data,
  });

  return <>{children(tinaData)}</>;
}
