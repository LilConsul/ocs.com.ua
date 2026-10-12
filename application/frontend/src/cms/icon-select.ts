import { createElement as e, type MouseEventHandler, type ReactNode } from "react";

const ACCENT = "#009AA3";

type Option = string | { get(key: string): string };

interface ControlProps {
	value?: string;
	forID: string;
	onChange: (value: string) => void;
	field: {
		get(
			key: "options"
		): { map(fn: (opt: Option) => ReactNode): { toArray(): ReactNode[] } } | undefined;
	};
}

function tile(
	key: string,
	active: boolean,
	title: string,
	onClick: MouseEventHandler,
	content: ReactNode
) {
	return e(
		"button",
		{
			key,
			type: "button",
			title,
			onClick,
			style: {
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				width: "48px",
				height: "48px",
				padding: 0,
				cursor: "pointer",
				borderRadius: "6px",
				border: active ? `2px solid ${ACCENT}` : "1px solid #ccc",
				background: active ? "rgba(0,154,163,0.12)" : "#fff",
				color: active ? ACCENT : "#444",
			},
		},
		content
	);
}

/** Custom icon-select widget: clickable grid of Material Symbols. */
export function IconControl(props: ControlProps) {
	const value = props.value || "";
	const options = props.field.get("options");
	let selectedLabel = "";

	const tiles = options
		? options
				.map((opt) => {
					const label = typeof opt === "string" ? opt : opt.get("label");
					const val = typeof opt === "string" ? opt : opt.get("value");
					if (val === value) selectedLabel = label;
					return tile(
						val,
						val === value,
						label,
						() => props.onChange(val),
						e(
							"span",
							{
								className: "material-symbols-outlined",
								style: { fontSize: "28px", lineHeight: 1 },
							},
							val
						)
					);
				})
				.toArray()
		: [];

	// "No icon" tile clears the value
	tiles.unshift(
		tile(
			"__none",
			!value,
			"No icon",
			() => props.onChange(""),
			e(
				"span",
				{
					className: "material-symbols-outlined",
					style: { fontSize: "24px", lineHeight: 1, color: "#999" },
				},
				"block"
			)
		)
	);

	return e(
		"div",
		{ id: props.forID },
		e("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px" } }, tiles),
		e(
			"div",
			{ style: { marginTop: "8px", fontSize: "13px", color: "#666" } },
			value ? `Selected: ${selectedLabel || value}` : "No icon selected"
		)
	);
}

export function IconPreview(props: { value?: string }) {
	if (!props.value) return e("span", null);
	return e(
		"span",
		{ className: "material-symbols-outlined", style: { fontSize: "24px" } },
		props.value
	);
}
