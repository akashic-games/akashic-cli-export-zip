import * as fs from "fs";
import * as path from "path";
import * as commander from "commander";
import { ConsoleLogger } from "@akashic/akashic-cli-commons";
import { promiseExportZip } from "./exportZip";

interface CommandParameterObject {
	quiet?: boolean;
	output?: string;
	exclude?: string[];
}

function cli(param: CommandParameterObject): void {
	var logger = new ConsoleLogger({ quiet: param.quiet });
	var exportParam = {quiet: param.quiet, output: param.output, exclude: param.exclude, logger: logger };

	Promise.resolve()
		.then(() => promiseExportZip(exportParam))
		.catch((err: any) => {
			logger.error(err);
			process.exit(1);
		});
}

var ver = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8")).version;

commander
	.version(ver);

commander
	.description("Export a directory as a zip")
	.option("-q, --quiet", "Suppress output")
	.option("-o, --output <fileName>", "Name of output file")
	.option("-e, --exclude [fileNames]", "Name of exclude file", (fileNames: string, list: string[]) => {
		list.push(fileNames);
		return list; }, []);

export function run(argv: string[]): void {
	commander.parse(argv);
	cli(commander);
}
