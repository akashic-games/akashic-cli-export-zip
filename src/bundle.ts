import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as cmn from "@akashic/akashic-cli-commons";
import archiver = require("archiver");
import readdir = require("fs-readdir-recursive");
import { convertGame } from "./convert";

export interface ExportZipParameterObject {
	bundle?: boolean;
	minify?: boolean;
	strip?: boolean;
	source?: string;
	dest?: string;
	logger?: cmn.Logger;
	hashLength?: number;
	omitEmptyJs?: boolean;
}

export function _completeExportZipParameterObject(param: ExportZipParameterObject): void {
	param.bundle = !!param.bundle;
	param.minify = !!param.minify;
	param.strip = !!param.strip;
	param.source = param.source || process.cwd();
	param.dest = param.dest || "./game.zip";
	param.logger = param.logger || new cmn.ConsoleLogger();
}

export function promiseExportZip(param: ExportZipParameterObject): Promise<void> {
	_completeExportZipParameterObject(param);
	const outZip = /\.zip$/.test(param.dest);
	const destDir = outZip ? fs.mkdtempSync(path.join(os.tmpdir(), "akashic-export-zip-")) : param.dest;

	return convertGame({
		bundle: param.bundle,
		minify: param.minify,
		strip: param.strip,
		source: param.source,
		dest: destDir,
		hashLength: param.hashLength,
		omitEmptyJs: param.omitEmptyJs,
		logger: param.logger
	})
		.then(() => {
			if (!outZip)
				return;
			return new Promise<void>((resolve, reject) => {
				const files = readdir(destDir).map(p => ({
					src: path.resolve(destDir, p),
					entryName: p
				}));
				const ostream = fs.createWriteStream(param.dest);
				const archive = archiver("zip");
				ostream.on("close", () => resolve());
				archive.on("error", (err) => reject(err));
				archive.pipe(ostream);
				files.forEach((f) => archive.file(f.src, {name: f.entryName}));
				archive.finalize();
			});
			// TODO mkdtempのフォルダを削除すべき？
		})
		.then(() => param.logger.info("Done!"));
}
