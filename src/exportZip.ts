import * as fs from "fs";
import * as path from "path";
import * as cmn from "@akashic/akashic-cli-commons";
import archiver = require("archiver");

import readdir = require("fs-readdir-recursive");


export interface ExportZipCommandParameterObject {
	quiet?: boolean;
	exclude?: string[];
	output?: string;
	logger?: cmn.Logger;
}

export function asZip(param: ExportZipCommandParameterObject): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		var files: {
			src: string;
			dest: string;
			expand: boolean;
			flatten: boolean;
		}[] = [];
		var rawFiles = readdir(".");
		for (var i = 0; i < rawFiles.length; i++) {
			var rawFile = path.resolve(rawFiles[i]);
			var exclude = false;
			if (!!param.exclude) {
				for (var j = 0; j < param.exclude.length; j++) {
					if (param.exclude[j] === rawFile || rawFile === param.output) {
						exclude = true;
						break;
					}
				}
			}
			if (exclude) continue;
			files.push({
				src: rawFile,
				dest: path.join("game", path.dirname(rawFiles[i])),
				expand: true,
				flatten: true
			});
		}
		if (files.length === 0) {
			reject("no file to archive");
		} else {
			var output = fs.createWriteStream(param.output);
			var archive = archiver("zip");
			output.on("close", () => resolve());
			archive.on("error", (err) => reject(err));
			archive.pipe(output);
			archive.bulk(files).finalize();
		}
	});
}

export function promiseExportZip(param: ExportZipCommandParameterObject): Promise<void> {
	_completeExportZipParameterObject(param);
	return new Promise<void>((resolve, reject) => {
		if (fs.existsSync("game.json")) {
			param.output = path.resolve(param.output);
			param.exclude = resolvePaths(param.exclude);
			asZip(param)
				.then(() => resolve())
				.catch((err) => reject(new Error(err)));
		} else {
			reject(new Error("game.json is not found"));
		}
	})
	.then(() => param.logger.info("Done!"));
};

export function exportZip(param: ExportZipCommandParameterObject, cb: (err?: any) => void): void {
	promiseExportZip(param).then(cb, cb);
}

function _completeExportZipParameterObject(param: ExportZipCommandParameterObject): void {
	param.logger = param.logger || new cmn.ConsoleLogger();
	param.output = param.output || "game.zip";
	if (!param.exclude || param.exclude.length === 0) param.exclude =  ["./npm-shrinkwrap.json", "./package.json"];

}

function resolvePaths(paths: string[] = []): string[] {
	for (var i = 0; i < paths.length; i++) {
		paths[i] = path.resolve(paths[i]);
	}
	return paths;
}
