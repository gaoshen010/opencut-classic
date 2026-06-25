import { BaseNode } from "./base-node";
import type { TWatermarkConfig } from "@/project/types";

export class WatermarkNode extends BaseNode<
	TWatermarkConfig,
	undefined
> {
	constructor(config: TWatermarkConfig) {
		super(config);
	}

	get config(): TWatermarkConfig {
		return this.params;
	}
}
