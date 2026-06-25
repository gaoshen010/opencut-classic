"use client";

import { useT } from "@/i18n";
import type { TranslationKey } from "@/i18n";
import type { TWatermarkConfig } from "@/project/types";
import {
	Section,
	SectionContent,
	SectionHeader,
	SectionTitle,
} from "@/components/section";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ColorPicker } from "@/components/ui/color-picker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/ui";

const FONT_FAMILIES = [
	"Arial",
	"Helvetica",
	"Times New Roman",
	"Georgia",
	"Courier New",
	"Verdana",
	"Impact",
	"Comic Sans MS",
];

const POSITION_GRID: Array<{
	value: TWatermarkConfig["position"];
	labelKey: TranslationKey;
}> = [
	{ value: "top-left", labelKey: "watermark.position.topLeft" },
	{ value: "top-center", labelKey: "watermark.position.topCenter" },
	{ value: "top-right", labelKey: "watermark.position.topRight" },
	{ value: "center-left", labelKey: "watermark.position.centerLeft" },
	{ value: "center", labelKey: "watermark.position.center" },
	{ value: "center-right", labelKey: "watermark.position.centerRight" },
	{ value: "bottom-left", labelKey: "watermark.position.bottomLeft" },
	{ value: "bottom-center", labelKey: "watermark.position.bottomCenter" },
	{ value: "bottom-right", labelKey: "watermark.position.bottomRight" },
];

interface WatermarkSettingsProps {
	watermark: TWatermarkConfig | undefined;
	onUpdate: (watermark: TWatermarkConfig) => void;
}

const DEFAULT_WATERMARK: TWatermarkConfig = {
	enabled: false,
	type: "text",
	text: "",
	fontFamily: "Arial",
	fontSize: 24,
	fontColor: "#ffffff",
	opacity: 0.3,
	position: "bottom-right",
	offsetX: 20,
	offsetY: 20,
	rotation: 0,
	scale: 1,
	tileMode: "none",
};

export function WatermarkSettings({
	watermark,
	onUpdate,
}: WatermarkSettingsProps) {
	const t = useT();
	const config = watermark ?? DEFAULT_WATERMARK;

	const update = (partial: Partial<TWatermarkConfig>) => {
		onUpdate({ ...config, ...partial });
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (event) => {
			const dataUrl = event.target?.result as string;
			update({ imageDataUrl: dataUrl });
		};
		reader.readAsDataURL(file);
	};

	const fontColorHex = (config.fontColor ?? "#ffffff").replace("#", "");

	return (
		<Section
			showTopBorder={false}
			collapsible
			sectionKey="settings:watermark"
		>
			<SectionHeader>
				<SectionTitle className="flex-1">{t("watermark.title")}</SectionTitle>
				<Switch
					checked={config.enabled}
					onCheckedChange={(checked) => update({ enabled: checked })}
				/>
			</SectionHeader>
			{config.enabled && (
				<SectionContent className="px-3.5 pb-3 flex flex-col gap-4">
					{/* Type selector */}
					<div className="flex flex-col gap-2">
						<Label>{t("watermark.type")}</Label>
						<RadioGroup
							value={config.type}
							onValueChange={(value) =>
								update({ type: value as "text" | "image" })
							}
							className="flex gap-4"
						>
							<div className="flex items-center gap-1.5">
								<RadioGroupItem value="text" id="wm-type-text" />
								<Label
									htmlFor="wm-type-text"
									className="text-sm cursor-pointer"
								>
									{t("watermark.type.text")}
								</Label>
							</div>
							<div className="flex items-center gap-1.5">
								<RadioGroupItem value="image" id="wm-type-image" />
								<Label
									htmlFor="wm-type-image"
									className="text-sm cursor-pointer"
								>
									{t("watermark.type.image")}
								</Label>
							</div>
						</RadioGroup>
					</div>

					{/* Text options */}
					{config.type === "text" && (
						<>
							<div className="flex flex-col gap-2">
								<Label>{t("watermark.text")}</Label>
								<Input
									value={config.text ?? ""}
									onChange={(e) => update({ text: e.target.value })}
									placeholder={t("watermark.textPlaceholder")}
									size="sm"
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>{t("watermark.fontFamily")}</Label>
								<Select
									value={config.fontFamily ?? "Arial"}
									onValueChange={(value) => update({ fontFamily: value })}
								>
									<SelectTrigger className="h-7">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{FONT_FAMILIES.map((font) => (
											<SelectItem key={font} value={font}>
												{font}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-2">
								<div className="flex justify-between items-center">
									<Label>{t("watermark.fontSize")}</Label>
									<span className="text-xs text-muted-foreground">
										{config.fontSize ?? 24}px
									</span>
								</div>
								<Slider
									value={[config.fontSize ?? 24]}
									onValueChange={([value]) => update({ fontSize: value })}
									min={12}
									max={72}
									step={1}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label>{t("watermark.fontColor")}</Label>
								<ColorPicker
									value={fontColorHex}
									onChange={(value) =>
										update({ fontColor: `#${value.replace("#", "")}` })
									}
								/>
							</div>
						</>
					)}

					{/* Image options */}
					{config.type === "image" && (
						<div className="flex flex-col gap-2">
							<Label>{t("watermark.uploadImage")}</Label>
							<Input
								type="file"
								accept=".png,.svg,image/png,image/svg+xml"
								onChange={handleImageUpload}
								size="sm"
							/>
						</div>
					)}

					{/* Opacity */}
					<div className="flex flex-col gap-2">
						<div className="flex justify-between items-center">
							<Label>{t("watermark.opacity")}</Label>
							<span className="text-xs text-muted-foreground">
								{Math.round((config.opacity ?? 0.3) * 100)}%
							</span>
						</div>
						<Slider
							value={[config.opacity ?? 0.3]}
							onValueChange={([value]) => update({ opacity: value })}
							min={0}
							max={1}
							step={0.01}
						/>
					</div>

					{/* Position (9-grid) */}
					<div className="flex flex-col gap-2">
						<Label>{t("watermark.position")}</Label>
						<div className="grid grid-cols-3 gap-1 w-fit">
							{POSITION_GRID.map(({ value, labelKey }) => (
								<button
									key={value}
									type="button"
									className={cn(
										"size-7 rounded-sm border text-xs flex items-center justify-center transition-colors",
										config.position === value
											? "bg-primary border-primary text-primary-foreground"
											: "border-border hover:bg-accent",
									)}
									onClick={() => update({ position: value })}
									title={t(labelKey)}
								/>
							))}
						</div>
					</div>

					{/* Scale */}
					<div className="flex flex-col gap-2">
						<div className="flex justify-between items-center">
							<Label>{t("watermark.scale")}</Label>
							<span className="text-xs text-muted-foreground">
								{(config.scale ?? 1).toFixed(1)}x
							</span>
						</div>
						<Slider
							value={[config.scale ?? 1]}
							onValueChange={([value]) => update({ scale: value })}
							min={0.1}
							max={2}
							step={0.1}
						/>
					</div>

					{/* Rotation */}
					<div className="flex flex-col gap-2">
						<div className="flex justify-between items-center">
							<Label>{t("watermark.rotation")}</Label>
							<span className="text-xs text-muted-foreground">
								{config.rotation ?? 0}°
							</span>
						</div>
						<Slider
							value={[config.rotation ?? 0]}
							onValueChange={([value]) => update({ rotation: value })}
							min={-180}
							max={180}
							step={1}
						/>
					</div>

					{/* Tile mode */}
					<div className="flex flex-col gap-2">
						<Label>{t("watermark.tileMode")}</Label>
						<RadioGroup
							value={config.tileMode ?? "none"}
							onValueChange={(value) =>
								update({
									tileMode: value as "none" | "tile" | "diagonal",
								})
							}
							className="flex flex-col gap-1.5"
						>
							{(["none", "tile", "diagonal"] as const).map((mode) => (
								<div key={mode} className="flex items-center gap-1.5">
									<RadioGroupItem value={mode} id={`wm-tile-${mode}`} />
									<Label
										htmlFor={`wm-tile-${mode}`}
										className="text-sm cursor-pointer"
									>
										{t(
											`watermark.tileMode.${mode}` as TranslationKey,
										)}
									</Label>
								</div>
							))}
						</RadioGroup>
					</div>
				</SectionContent>
			)}
		</Section>
	);
}
