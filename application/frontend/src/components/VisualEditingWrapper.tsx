import { useTina } from "tinacms/dist/react";
import type { TinaMarkdown } from "tinacms/dist/rich-text";

interface VisualEditingWrapperProps {
	query: string;
	variables: Record<string, any>;
	data: any;
	children: (props: { data: any; tinaField: any }) => React.ReactNode;
}

/**
 * Wrapper component that enables Tina visual editing
 * Wraps content and provides data + tinaField helper for visual editing
 */
export function VisualEditingWrapper({
	query,
	variables,
	data,
	children,
}: VisualEditingWrapperProps) {
	// useTina hook enables visual editing when in Tina admin
	const { data: tinaData } = useTina({
		query,
		variables,
		data,
	});

	// Helper function to generate data-tina-field attributes
	const tinaField = (obj: any, ...path: (string | number)[]) => {
		if (!obj) return undefined;
		return path.join(".");
	};

	return <>{children({ data: tinaData, tinaField })}</>;
}
