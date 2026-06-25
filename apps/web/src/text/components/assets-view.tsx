import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/editor/use-editor";
import { useT } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import { DEFAULTS } from "@/timeline/defaults";
import { buildTextElement } from "@/timeline/element-utils";
import {
	titleTemplates,
	buildAnimationForPreset,
} from "@/text/templates/definitions";
import type { MediaTime } from "@/wasm";
import type { CreateTextElement } from "@/timeline/types";

export function TextView() {
	const editor = useEditor();
	const t = useT();

	const handleAddDefaultToTimeline = ({
		currentTime,
	}: { currentTime: MediaTime }) => {
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		const element = buildTextElement({
			raw: DEFAULTS.text.element,
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	const handleAddTemplateToTimeline =
		(templateId: string) =>
			({ currentTime }: { currentTime: MediaTime }) => {
				const template = titleTemplates.find((tpl) => tpl.id === templateId);
				if (!template) return;

				const activeScene = editor.scenes.getActiveScene();
				if (!activeScene) return;

				const raw = template.buildTextElement(
					t(template.nameKey as TranslationKey),
				);

				const element = buildTextElement({
					raw,
					startTime: currentTime,
				}) as CreateTextElement;

				// Apply animation preset if defined
				const animations = buildAnimationForPreset(template.animationPreset);
				if (animations) {
					element.animations = animations;
				}

				editor.timeline.insertElement({
					element,
					placement: { mode: "auto" },
				});
			};

	return (
		<PanelView title={t("templates.title")}>
			<div className="grid grid-cols-2 gap-2 pb-2">
				{titleTemplates.map((template) => (
					<DraggableItem
						key={template.id}
						name={t(template.nameKey as TranslationKey)}
						preview={
							<div
								className="flex size-full items-center justify-center rounded-sm"
								style={{ backgroundColor: template.previewColor }}
							>
								<span
									className="select-none text-center text-[10px] leading-tight font-bold px-1"
									style={{ color: template.previewTextColor }}
								>
									{t(template.nameKey as TranslationKey)}
								</span>
							</div>
						}
						dragData={{
							id: `template-${template.id}`,
							type: "text",
							name: t(template.nameKey as TranslationKey),
							content: t(template.nameKey as TranslationKey),
						}}
						aspectRatio={16 / 10}
						onAddToTimeline={handleAddTemplateToTimeline(template.id)}
						shouldShowLabel={true}
						containerClassName="w-full"
					/>
				))}

				<DraggableItem
					name={t("templates.defaultText")}
					preview={
						<div className="bg-accent flex size-full items-center justify-center rounded-sm">
							<span className="text-xs select-none">
								{t("templates.defaultText")}
							</span>
						</div>
					}
					dragData={{
						id: "temp-text-id",
						type: DEFAULTS.text.element.type,
						name: DEFAULTS.text.element.name,
						content: "默认文字",
					}}
					aspectRatio={16 / 10}
					onAddToTimeline={handleAddDefaultToTimeline}
					shouldShowLabel={true}
					containerClassName="w-full"
				/>
			</div>
		</PanelView>
	);
}
