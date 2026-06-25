import type { ParamValues } from "@/params";
import type { TextElement, GraphicElement } from "@/timeline/types";
import type { ElementAnimations } from "@/animation/types";
import { mediaTimeFromSeconds, ZERO_MEDIA_TIME } from "@/wasm";

export type TitleTemplateCategory =
	| "cover"
	| "chapter"
	| "lower-third"
	| "corner"
	| "emphasis"
	| "badge";

export type AnimationPreset =
	| "fade-in"
	| "slide-left"
	| "slide-right"
	| "scale-in"
	| "none";

export interface TitleTemplate {
	id: string;
	/** i18n translation key (passed to t()) */
	nameKey: string;
	category: TitleTemplateCategory;
	/** CSS color used for the preview card background */
	previewColor: string;
	/** CSS color used for the preview text */
	previewTextColor: string;
	thumbnail?: string;
	buildTextElement: (text: string) => Partial<Omit<TextElement, "type" | "id">>;
	buildGraphicElements?: () => Partial<GraphicElement>[];
	animationPreset: AnimationPreset;
}

const HALF_SECOND = mediaTimeFromSeconds({ seconds: 0.5 });

/**
 * Build an ElementAnimations object for a given preset.
 * Returns undefined for the "none" preset.
 */
export function buildAnimationForPreset(
	preset: AnimationPreset,
): ElementAnimations | undefined {
	if (preset === "none") {
		return undefined;
	}

	switch (preset) {
		case "fade-in":
			return {
				opacity: {
					keys: [
						{
							id: "fade-k0",
							time: ZERO_MEDIA_TIME,
							value: 0,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
						{
							id: "fade-k1",
							time: HALF_SECOND,
							value: 1,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
					],
				},
			};

		case "slide-left":
			return {
				"transform.positionX": {
					keys: [
						{
							id: "slide-l-k0",
							time: ZERO_MEDIA_TIME,
							value: 200,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
						{
							id: "slide-l-k1",
							time: HALF_SECOND,
							value: 0,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
					],
				},
			};

		case "slide-right":
			return {
				"transform.positionX": {
					keys: [
						{
							id: "slide-r-k0",
							time: ZERO_MEDIA_TIME,
							value: -200,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
						{
							id: "slide-r-k1",
							time: HALF_SECOND,
							value: 0,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
					],
				},
			};

		case "scale-in":
			return {
				"transform.scaleX": {
					keys: [
						{
							id: "scale-x-k0",
							time: ZERO_MEDIA_TIME,
							value: 0.5,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
						{
							id: "scale-x-k1",
							time: HALF_SECOND,
							value: 1,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
					],
				},
				"transform.scaleY": {
					keys: [
						{
							id: "scale-y-k0",
							time: ZERO_MEDIA_TIME,
							value: 0.5,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
						{
							id: "scale-y-k1",
							time: HALF_SECOND,
							value: 1,
							segmentToNext: "linear",
							tangentMode: "auto",
						},
					],
				},
			};
	}
}

export const titleTemplates: TitleTemplate[] = [
	{
		id: "cover",
		nameKey: "templates.cover",
		category: "cover",
		previewColor: "#1a1a2e",
		previewTextColor: "#ffffff",
		animationPreset: "fade-in",
		buildTextElement: (text: string): Partial<Omit<TextElement, "type" | "id">> => ({
			name: "封面标题",
			params: {
				content: text,
				fontSize: 72,
				fontWeight: "bold",
				color: "#ffffff",
				textAlign: "center",
				"background.enabled": false,
			} satisfies Partial<ParamValues>,
		}),
	},
	{
		id: "subtitle",
		nameKey: "templates.subtitle",
		category: "cover",
		previewColor: "#16213e",
		previewTextColor: "#cccccc",
		animationPreset: "fade-in",
		buildTextElement: (text: string): Partial<Omit<TextElement, "type" | "id">> => ({
			name: "副标题",
			params: {
				content: text,
				fontSize: 32,
				fontWeight: "normal",
				color: "#cccccc",
				textAlign: "center",
				"background.enabled": false,
			} satisfies Partial<ParamValues>,
		}),
	},
	{
		id: "chapter",
		nameKey: "templates.chapter",
		category: "chapter",
		previewColor: "#0f3460",
		previewTextColor: "#ffffff",
		animationPreset: "slide-left",
		buildTextElement: (text: string): Partial<Omit<TextElement, "type" | "id">> => ({
			name: "章节标题",
			params: {
				content: text,
				fontSize: 48,
				fontWeight: "bold",
				color: "#ffffff",
				textAlign: "left",
				"background.enabled": true,
				"background.color": "rgba(0,0,0,0.55)",
				"background.cornerRadius": 4,
				"background.paddingX": 24,
				"background.paddingY": 14,
			} satisfies Partial<ParamValues>,
		}),
	},
	{
		id: "lower-third",
		nameKey: "templates.lowerThird",
		category: "lower-third",
		previewColor: "#533483",
		previewTextColor: "#ffffff",
		animationPreset: "slide-right",
		buildTextElement: (text: string): Partial<Omit<TextElement, "type" | "id">> => ({
			name: "下方条幅",
			params: {
				content: text,
				fontSize: 28,
				fontWeight: "normal",
				color: "#ffffff",
				textAlign: "left",
				"background.enabled": true,
				"background.color": "rgba(0,0,0,0.6)",
				"background.cornerRadius": 0,
				"background.paddingX": 20,
				"background.paddingY": 10,
				"transform.positionY": 120,
			} satisfies Partial<ParamValues>,
		}),
	},
	{
		id: "name-bar",
		nameKey: "templates.nameBar",
		category: "lower-third",
		previewColor: "#2c3e50",
		previewTextColor: "#ffffff",
		animationPreset: "slide-right",
		buildTextElement: (text: string): Partial<Omit<TextElement, "type" | "id">> => ({
			name: "人名条",
			params: {
				content: text,
				fontSize: 24,
				fontWeight: "normal",
				color: "#ffffff",
				textAlign: "left",
				"background.enabled": true,
				"background.color": "rgba(0,0,0,0.7)",
				"background.cornerRadius": 2,
				"background.paddingX": 16,
				"background.paddingY": 8,
				"transform.positionY": 100,
			} satisfies Partial<ParamValues>,
		}),
	},
	{
		id: "corner-label",
		nameKey: "templates.cornerLabel",
		category: "corner",
		previewColor: "#e94560",
		previewTextColor: "#ffffff",
		animationPreset: "scale-in",
		buildTextElement: (text: string): Partial<Omit<TextElement, "type" | "id">> => ({
			name: "角标",
			params: {
				content: text,
				fontSize: 20,
				fontWeight: "bold",
				color: "#ffffff",
				textAlign: "center",
				"background.enabled": true,
				"background.color": "#e94560",
				"background.cornerRadius": 8,
				"background.paddingX": 14,
				"background.paddingY": 8,
				"transform.positionX": -280,
				"transform.positionY": -180,
			} satisfies Partial<ParamValues>,
		}),
	},
	{
		id: "emphasis",
		nameKey: "templates.emphasis",
		category: "emphasis",
		previewColor: "#1a1a1a",
		previewTextColor: "#ff6b6b",
		animationPreset: "scale-in",
		buildTextElement: (text: string): Partial<Omit<TextElement, "type" | "id">> => ({
			name: "重点强调",
			params: {
				content: text,
				fontSize: 64,
				fontWeight: "bold",
				color: "#ff6b6b",
				textAlign: "center",
				"background.enabled": false,
			} satisfies Partial<ParamValues>,
		}),
	},
	{
		id: "number-badge",
		nameKey: "templates.numberBadge",
		category: "badge",
		previewColor: "#0a3d62",
		previewTextColor: "#ffffff",
		animationPreset: "scale-in",
		buildTextElement: (text: string): Partial<Omit<TextElement, "type" | "id">> => ({
			name: "数字标注",
			params: {
				content: text,
				fontSize: 36,
				fontWeight: "bold",
				color: "#ffffff",
				textAlign: "center",
				"background.enabled": true,
				"background.color": "#0a3d62",
				"background.cornerRadius": 50,
				"background.paddingX": 28,
				"background.paddingY": 28,
			} satisfies Partial<ParamValues>,
		}),
	},
];
