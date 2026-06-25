"use client";

import { useEditor } from "@/editor/use-editor";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { toast } from "sonner";
import {
	BatchCommand,
	UpdateElementsCommand,
} from "@/commands";
import { findTrackInSceneTracks } from "@/timeline";
import type { TextElement, TimelineElement } from "@/timeline";
import { readElementParamValue } from "@/params/registry";
import { getElementParams } from "@/params/registry";

const SUBTITLE_NAME_PREFIXES = ["Caption", "字幕"];

export function isSubtitleElement({ element }: { element: TimelineElement }): boolean {
	if (element.type !== "text") return false;
	return SUBTITLE_NAME_PREFIXES.some((prefix) => element.name.startsWith(prefix));
}

const STYLE_PARAM_KEYS = [
	"fontFamily",
	"fontSize",
	"color",
	"textAlign",
	"fontWeight",
	"fontStyle",
	"textDecoration",
	"letterSpacing",
	"lineHeight",
	"background.enabled",
	"background.color",
	"background.cornerRadius",
	"background.paddingX",
	"background.paddingY",
	"background.offsetX",
	"background.offsetY",
] as const;

export function StyleSyncButton({
	element,
	trackId,
}: {
	element: TextElement;
	trackId: string;
}) {
	const t = useT();
	const editor = useEditor();

	if (!isSubtitleElement({ element })) {
		return null;
	}

	const handleApplyToAll = () => {
		const scene = editor.scenes.getActiveScene();
		const track = findTrackInSceneTracks({
			tracks: scene.tracks,
			trackId,
		});

		if (!track) return;

		const params = getElementParams({ element }).filter((param) =>
			STYLE_PARAM_KEYS.includes(param.key as (typeof STYLE_PARAM_KEYS)[number]),
		);

		const currentStyleValues: Record<string, unknown> = {};
		for (const param of params) {
			const value = readElementParamValue({ element, param });
			if (value !== null) {
				currentStyleValues[param.key] = value;
			}
		}

		const otherSubtitleElements = track.elements.filter(
			(el): el is TextElement =>
				el.type === "text" &&
				el.id !== element.id &&
				isSubtitleElement({ element: el }),
		);

		if (otherSubtitleElements.length === 0) {
			return;
		}

		const updates = otherSubtitleElements.map((targetElement) => ({
			trackId,
			elementId: targetElement.id,
			patch: {
				params: {
					...targetElement.params,
					...currentStyleValues,
				},
			},
		}));

		editor.command.execute({
			command: new BatchCommand([new UpdateElementsCommand({ updates })]),
		});

		toast.success(t("subtitles.appliedToAll"));
	};

	return (
		<div className="px-4 pb-4">
			<Button
				type="button"
				variant="outline"
				className="w-full"
				onClick={handleApplyToAll}
			>
				{t("subtitles.applyToAll")}
			</Button>
		</div>
	);
}
