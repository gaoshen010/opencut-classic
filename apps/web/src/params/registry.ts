import type {
	ParamDefinition,
	ParamValue,
	ParamValues,
} from "@/params";
import { MIN_TRANSFORM_SCALE } from "@/animation/transform";
import type { BlendMode } from "@/rendering";
import type {
	ElementType,
	TimelineElement,
} from "@/timeline";
import { DEFAULTS } from "@/timeline/defaults";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "@/timeline/audio-constants";
import {
	CORNER_RADIUS_MAX,
	CORNER_RADIUS_MIN,
} from "@/text/background";
import { t } from "@/i18n";

export type ElementParamDefinition<TKey extends string = string> =
	ParamDefinition<TKey> & {
		read?: ({ element }: { element: TimelineElement }) => ParamValue | null;
		write?: ({
			element,
			value,
		}: {
			element: TimelineElement;
			value: ParamValue;
		}) => TimelineElement;
	};

export function buildDefaultParamValues(
	params: readonly ParamDefinition[],
): ParamValues {
	const values: ParamValues = {};
	for (const param of params) {
		values[param.key] = param.default;
	}
	return values;
}

export class DefinitionRegistry<TKey extends string, TDefinition> {
	private definitions = new Map<TKey, TDefinition>();
	private entityName: string;

	constructor(entityName: string) {
		this.entityName = entityName;
	}

	register({
		key,
		definition,
	}: {
		key: TKey;
		definition: TDefinition;
	}): void {
		this.definitions.set(key, definition);
	}

	has(key: TKey): boolean {
		return this.definitions.has(key);
	}

	get(key: TKey): TDefinition {
		const def = this.definitions.get(key);
		if (!def) {
			throw new Error(`Unknown ${this.entityName}: ${key}`);
		}
		return def;
	}

	getAll(): TDefinition[] {
		return Array.from(this.definitions.values());
	}
}

const BLEND_MODE_OPTIONS: Array<{ value: BlendMode; label: string }> = [
	{ value: "normal", label: t("blend.normal") },
	{ value: "darken", label: t("blend.darken") },
	{ value: "multiply", label: t("blend.multiply") },
	{ value: "color-burn", label: t("blend.colorBurn") },
	{ value: "lighten", label: t("blend.lighten") },
	{ value: "screen", label: t("blend.screen") },
	{ value: "plus-lighter", label: t("blend.plusLighter") },
	{ value: "color-dodge", label: t("blend.colorDodge") },
	{ value: "overlay", label: t("blend.overlay") },
	{ value: "soft-light", label: t("blend.softLight") },
	{ value: "hard-light", label: t("blend.hardLight") },
	{ value: "difference", label: t("blend.difference") },
	{ value: "exclusion", label: t("blend.exclusion") },
	{ value: "hue", label: t("blend.hue") },
	{ value: "saturation", label: t("blend.saturation") },
	{ value: "color", label: t("blend.color") },
	{ value: "luminosity", label: t("blend.luminosity") },
];

const visualElementParams: ElementParamDefinition[] = [
	{
		key: "transform.positionX",
		label: t("params.positionX"),
		type: "number",
		default: DEFAULTS.element.transform.position.x,
		min: -100_000,
		step: 1,
	},
	{
		key: "transform.positionY",
		label: t("params.positionY"),
		type: "number",
		default: DEFAULTS.element.transform.position.y,
		min: -100_000,
		step: 1,
	},
	{
		key: "transform.scaleX",
		label: t("params.scaleX"),
		type: "number",
		default: DEFAULTS.element.transform.scaleX,
		min: MIN_TRANSFORM_SCALE,
		step: 0.01,
	},
	{
		key: "transform.scaleY",
		label: t("params.scaleY"),
		type: "number",
		default: DEFAULTS.element.transform.scaleY,
		min: MIN_TRANSFORM_SCALE,
		step: 0.01,
	},
	{
		key: "transform.rotate",
		label: t("params.rotate"),
		type: "number",
		default: DEFAULTS.element.transform.rotate,
		min: -360,
		max: 360,
		step: 1,
	},
	{
		key: "opacity",
		label: t("params.opacity"),
		type: "number",
		default: DEFAULTS.element.opacity,
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		key: "blendMode",
		label: t("params.blendMode"),
		type: "select",
		default: DEFAULTS.element.blendMode,
		keyframable: false,
		options: BLEND_MODE_OPTIONS,
	},
];

const audioElementParams: ElementParamDefinition[] = [
	{
		key: "volume",
		label: t("params.volume"),
		type: "number",
		default: DEFAULTS.element.volume,
		min: VOLUME_DB_MIN,
		max: VOLUME_DB_MAX,
		step: 0.01,
	},
	{
		key: "muted",
		label: t("params.muted"),
		type: "boolean",
		default: false,
		keyframable: false,
	},
];

const textElementParams: ElementParamDefinition[] = [
	{
		key: "content",
		label: t("params.content"),
		type: "text",
		default: "默认文字",
		keyframable: false,
	},
	{
		key: "fontFamily",
		label: t("params.fontFamily"),
		type: "font",
		default: "Arial",
		keyframable: false,
	},
	{
		key: "fontSize",
		label: t("params.fontSize"),
		type: "number",
		default: 15,
		min: 1,
		step: 1,
	},
	{
		key: "color",
		label: t("params.color"),
		type: "color",
		default: "#ffffff",
	},
	{
		key: "textAlign",
		label: t("params.textAlign"),
		type: "select",
		default: "center",
		keyframable: false,
		options: [
			{ value: "left", label: t("params.align.left") },
			{ value: "center", label: t("params.align.center") },
			{ value: "right", label: t("params.align.right") },
		],
	},
	{
		key: "fontWeight",
		label: t("params.fontWeight"),
		type: "select",
		default: "normal",
		keyframable: false,
		options: [
			{ value: "normal", label: t("params.weight.normal") },
			{ value: "bold", label: t("params.weight.bold") },
		],
	},
	{
		key: "fontStyle",
		label: t("params.fontStyle"),
		type: "select",
		default: "normal",
		keyframable: false,
		options: [
			{ value: "normal", label: t("params.style.normal") },
			{ value: "italic", label: t("params.style.italic") },
		],
	},
	{
		key: "textDecoration",
		label: t("params.textDecoration"),
		type: "select",
		default: "none",
		keyframable: false,
		options: [
			{ value: "none", label: t("params.decoration.none") },
			{ value: "underline", label: t("params.decoration.underline") },
			{ value: "line-through", label: t("params.decoration.lineThrough") },
		],
	},
	{
		key: "letterSpacing",
		label: t("params.letterSpacing"),
		type: "number",
		default: DEFAULTS.text.letterSpacing,
		min: -100,
		step: 0.1,
	},
	{
		key: "lineHeight",
		label: t("params.lineHeight"),
		type: "number",
		default: DEFAULTS.text.lineHeight,
		min: 0.1,
		step: 0.1,
	},
	{
		key: "background.enabled",
		label: t("params.bgEnabled"),
		type: "boolean",
		default: DEFAULTS.text.background.enabled,
		keyframable: false,
	},
	{
		key: "background.color",
		label: t("params.bgColor"),
		type: "color",
		default: DEFAULTS.text.background.color,
		dependencies: [{ param: "background.enabled", equals: true }],
	},
	{
		key: "background.cornerRadius",
		label: t("params.bgRadius"),
		type: "number",
		default: DEFAULTS.text.background.cornerRadius,
		min: CORNER_RADIUS_MIN,
		max: CORNER_RADIUS_MAX,
		step: 1,
		dependencies: [{ param: "background.enabled", equals: true }],
	},
	{
		key: "background.paddingX",
		label: t("params.bgPaddingX"),
		type: "number",
		default: DEFAULTS.text.background.paddingX,
		min: 0,
		step: 1,
		dependencies: [{ param: "background.enabled", equals: true }],
	},
	{
		key: "background.paddingY",
		label: t("params.bgPaddingY"),
		type: "number",
		default: DEFAULTS.text.background.paddingY,
		min: 0,
		step: 1,
		dependencies: [{ param: "background.enabled", equals: true }],
	},
	{
		key: "background.offsetX",
		label: t("params.bgOffsetX"),
		type: "number",
		default: DEFAULTS.text.background.offsetX,
		min: -100_000,
		step: 1,
		dependencies: [{ param: "background.enabled", equals: true }],
	},
	{
		key: "background.offsetY",
		label: t("params.bgOffsetY"),
		type: "number",
		default: DEFAULTS.text.background.offsetY,
		min: -100_000,
		step: 1,
		dependencies: [{ param: "background.enabled", equals: true }],
	},
];

export const elementParamRegistry = new DefinitionRegistry<
	ElementType,
	readonly ElementParamDefinition[]
>("element params");

elementParamRegistry.register({
	key: "video",
	definition: [...visualElementParams, ...audioElementParams],
});
elementParamRegistry.register({ key: "image", definition: visualElementParams });
elementParamRegistry.register({
	key: "text",
	definition: [...textElementParams, ...visualElementParams],
});
elementParamRegistry.register({
	key: "sticker",
	definition: visualElementParams,
});
elementParamRegistry.register({
	key: "graphic",
	definition: visualElementParams,
});
elementParamRegistry.register({ key: "audio", definition: audioElementParams });
elementParamRegistry.register({ key: "effect", definition: [] });

export function getElementParams({
	element,
}: {
	element: TimelineElement;
}): readonly ElementParamDefinition[] {
	return elementParamRegistry.has(element.type)
		? elementParamRegistry.get(element.type)
		: [];
}

export function getBuiltInElementParams({
	type,
}: {
	type: ElementType;
}): readonly ElementParamDefinition[] {
	return elementParamRegistry.has(type) ? elementParamRegistry.get(type) : [];
}

export function getElementParam({
	element,
	key,
}: {
	element: TimelineElement;
	key: string;
}): ElementParamDefinition | null {
	return (
		getElementParams({ element }).find((param) => param.key === key) ?? null
	);
}

export function readElementParamValue({
	element,
	param,
}: {
	element: TimelineElement;
	param: ElementParamDefinition;
}): ParamValue | null {
	if (param.read) {
		return param.read({ element });
	}
	if ("params" in element) {
		return element.params[param.key] ?? param.default;
	}
	return null;
}

export function writeElementParamValue({
	element,
	param,
	value,
}: {
	element: TimelineElement;
	param: ElementParamDefinition;
	value: ParamValue;
}): TimelineElement {
	if (param.write) {
		return param.write({ element, value });
	}
	if ("params" in element) {
		return {
			...element,
			params: {
				...element.params,
				[param.key]: value,
			},
		};
	}
	return element;
}

export function buildElementParamValues({
	element,
}: {
	element: TimelineElement;
}): ParamValues {
	const values: ParamValues = {};
	for (const param of getElementParams({ element })) {
		const value = readElementParamValue({ element, param });
		if (value !== null) {
			values[param.key] = value;
		}
	}
	return values;
}

