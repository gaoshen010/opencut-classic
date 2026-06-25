"use client";

import { useMemo } from "react";
import { createTranslator, type TranslationKey } from "./translations";

type Translator = (key: TranslationKey, params?: Record<string, string | number>) => string;

// 单语言应用，直接返回翻译函数，无需 Context
const translator = createTranslator();

/**
 * 翻译 Hook
 * 用于 React 组件中获取翻译函数
 *
 * @example
 * ```tsx
 * const t = useT();
 * return <span>{t("export.button")}</span>
 * ```
 */
export function useT(): Translator {
	return useMemo(() => translator, []);
}
