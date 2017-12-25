import * as fs from "fs";
import * as path from "path";
import * as commander from "commander";
import { ConsoleLogger } from "@akashic/akashic-cli-commons";
import { promiseExportZip } from "./bundle";

interface CommandParameterObject {
	cwd?: string;
	quiet?: boolean;
	output?: string;
	strip?: boolean;
	minify?: boolean;
	bundle?: boolean;
	hashFilename?: any;
}


function cli(param: CommandParameterObject): void {
	var logger = new ConsoleLogger({ quiet: param.quiet });
	Promise.resolve()
		.then(() => promiseExportZip({
			bundle: param.bundle,
			minify: param.minify,
			strip: param.strip,
			source: param.cwd,
			dest: param.output,
			hashFilename: param.hashFilename,
			logger
		}))
		.catch((err: any) => {
			logger.error(err);
			process.exit(1);
		});
}

var ver = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8")).version;

commander
	.version(ver);

commander
	.description("Export an Akashic game to a zip file")
	.option("-C, --cwd <dir>", "A directory containing a game.json (default: .)")
	.option("-q, --quiet", "Suppress output")
	.option("-o, --output <fileName>", "Name of output file (default: game.zip)")
	.option("-s, --strip", "Contain only files refered by game.json")
	.option("-M, --minify", "Minify JavaScript files")
	.option("-H, --hash-filename [length]", "Rename asset files with their hash values")
	.option("-b, --bundle", "Bundle script assets into a single file");

export function run(argv: string[]): void {
	commander.parse(argv);
	cli({
		cwd: commander["cwd"],
		quiet: commander["quiet"],
		output: commander["output"],
		strip: commander["strip"],
		minify: commander["minify"],
		hashFilename: commander["hashFilename"],
		bundle: commander["bundle"]
	});
}
