"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useStoragePersistence } from "@/services/storage/use-storage-persistence";
import { useT } from "@/i18n";

export function StoragePersistenceDialog() {
	const { showDialog, onConfirm, onDismiss } = useStoragePersistence();
	const t = useT();

	return (
		<Dialog open={showDialog} onOpenChange={(open) => !open && onDismiss()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("storage.dontLose")}</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<p className="text-base text-muted-foreground">
						{t("storage.browserDelete")}
					</p>
					<p className="text-base text-muted-foreground">
						{t("storage.allowProtect")}
					</p>
				</DialogBody>
				<DialogFooter>
					<Button variant="outline" onClick={onDismiss}>
						{t("storage.notNow")}
					</Button>
					<Button onClick={onConfirm}>{t("storage.allow")}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
