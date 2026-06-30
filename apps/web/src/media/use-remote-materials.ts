"use client";

import { useState, useCallback, useRef } from "react";
import { materialApi } from "@/services/storage/remote-api";
import type {
	RemoteMaterial,
	PaginationInfo,
} from "@/services/storage/remote-types";

interface UseRemoteMaterialsResult {
	/** List of remote materials */
	materials: RemoteMaterial[];
	/** Loading state */
	isLoading: boolean;
	/** Error message if any */
	error: string | null;
	/** Current pagination info */
	pagination: PaginationInfo | null;
	/** Current type filter */
	typeFilter: "image" | "video" | "audio" | "all";
	/** Set the type filter and re-fetch */
	setTypeFilter: (type: "image" | "video" | "audio" | "all") => void;
	/** Load the next page */
	loadNextPage: () => void;
	/** Refresh the list */
	refresh: () => void;
	/** Upload a file to the server */
	upload: (
		file: File,
		metadata?: {
			width?: number;
			height?: number;
			duration?: number;
			fps?: number;
			hasAudio?: boolean;
			thumbnailDataUrl?: string;
		},
		onProgress?: (progress: number) => void,
	) => Promise<RemoteMaterial | null>;
	/** Delete a remote material */
	deleteMaterial: (id: string) => Promise<void>;
}

export function useRemoteMaterials(): UseRemoteMaterialsResult {
	const [materials, setMaterials] = useState<RemoteMaterial[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pagination, setPagination] = useState<PaginationInfo | null>(null);
	const [typeFilter, setTypeFilterState] = useState<
		"image" | "video" | "audio" | "all"
	>("all");

	const currentPageRef = useRef(1);

	const fetchMaterials = useCallback(
		async (page: number, append: boolean = false) => {
			setIsLoading(true);
			setError(null);

			try {
				const result = await materialApi.list({
					type: typeFilter,
					page,
					pageSize: 50,
				});

				if (append && page > 1) {
					setMaterials((prev) => [...prev, ...result.materials]);
				} else {
					setMaterials(result.materials);
				}
				setPagination(result.pagination);
				currentPageRef.current = page;
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "加载素材失败";
				setError(message);
			} finally {
				setIsLoading(false);
			}
		},
		[typeFilter],
	);

	const setTypeFilter = useCallback(
		(type: "image" | "video" | "audio" | "all") => {
			setTypeFilterState(type);
			currentPageRef.current = 1;
			// The fetch will be triggered by the useEffect below
		},
		[],
	);

	const loadNextPage = useCallback(() => {
		if (pagination && currentPageRef.current < pagination.totalPages) {
			fetchMaterials(currentPageRef.current + 1, true);
		}
	}, [pagination, fetchMaterials]);

	const refresh = useCallback(() => {
		fetchMaterials(1);
	}, [fetchMaterials]);

	const upload = useCallback(
		async (
			file: File,
			metadata?: {
				width?: number;
				height?: number;
				duration?: number;
				fps?: number;
				hasAudio?: boolean;
				thumbnailDataUrl?: string;
			},
			onProgress?: (progress: number) => void,
		): Promise<RemoteMaterial | null> => {
			try {
				const material = await materialApi.upload(file, metadata, onProgress);
				// Prepend to the list
				setMaterials((prev) => [material, ...prev]);
				return material;
			} catch (err) {
				console.error("Upload failed:", err);
				return null;
			}
		},
		[],
	);

	const deleteMaterial = useCallback(async (id: string): Promise<void> => {
		try {
			await materialApi.delete(id);
			setMaterials((prev) => prev.filter((m) => m.id !== id));
		} catch (err) {
			console.error("Delete failed:", err);
			throw err;
		}
	}, []);

	// Fetch on mount and when filter changes
	// Using a simple effect-like pattern with a ref
	const lastFilterRef = useRef(typeFilter);
	if (lastFilterRef.current !== typeFilter) {
		lastFilterRef.current = typeFilter;
		// Trigger a fetch with the new filter
		fetchMaterials(1);
	}

	return {
		materials,
		isLoading,
		error,
		pagination,
		typeFilter,
		setTypeFilter,
		loadNextPage,
		refresh,
		upload,
		deleteMaterial,
	};
}
