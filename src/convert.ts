import * as fs from "fs";
import * as fsx from "fs-extra";
import * as path from "path";
import * as cmn from "@akashic/akashic-cli-commons";
import * as browserify from "browserify";
import readdir = require("fs-readdir-recursive");
import * as gcu from "./GameConfigurationUtil";
import * as UglifyJS from "uglify-js";

export interface ConvertGameParameterObject {
	bundle?: boolean;
	minify?: boolean;
	strip?: boolean;
	source?: string;
	hashLength?: number;
	dest: string;
	/**
	 * コマンドの出力を受け取るロガー。
	 * 省略された場合、akashic-cli-commons の `new ConsoleLogger()` 。
	 */
	logger?: cmn.Logger;
}

export function _completeConvertGameParameterObject(param: ConvertGameParameterObject): void {
	param.bundle = !!param.bundle;
	param.minify = !!param.minify;
	param.strip = !!param.strip;
	param.source = param.source || process.cwd();
	param.hashLength = param.hashLength || 0;
	param.logger = param.logger || new cmn.ConsoleLogger();
}

export interface BundleResult {
	bundle: string;
	filePaths: string[];
}

export function bundleScripts(entryPoint: string, basedir: string): Promise<BundleResult> {
	const b = browserify({
		entries: entryPoint,
		basedir,
		builtins: false,
		standalone: "aez_bundle_main"
	});
	b.external("g");
	const filePaths: string[] = [];
	b.on("dep", (row: any) => {
		filePaths.push(cmn.Util.makeUnixPath(path.relative(basedir, row.file)));
	});
	return new Promise<BundleResult>((resolve, reject) => {
		b.bundle((err: any, buf: Buffer) => {
			if (err)
				return reject(err);
			resolve({ bundle: buf.toString(), filePaths });
		});
	});
}

export function convertGame(param: ConvertGameParameterObject): Promise<void> {
	_completeConvertGameParameterObject(param);
	let gamejson: cmn.GameConfiguration;

	return Promise.resolve()
		.then(() => cmn.ConfigurationFile.read(path.join(param.source, "game.json"), param.logger))
		.then((result: cmn.GameConfiguration) => {
			gamejson = result;
			cmn.Util.mkdirpSync(path.dirname(path.resolve(param.dest)));

			// 全スクリプトがES5構文になっていることを確認する
			let errorMessages: string[] = [];
			gcu.extractScriptAssetFilePaths(gamejson).forEach(filePath => {
				const code = fs.readFileSync(path.resolve(param.source, filePath)).toString();
				errorMessages = errorMessages.concat(
					cmn.LintUtil.validateEs5Code(code).map(info => `${filePath}(${info.line}:${info.column}): ${info.message}`)
				);
			});
			if (errorMessages.length > 0) {
				throw new Error("The following ES5 syntax errors exist.\n" + errorMessages.join("\n"));
			}
			const files = param.strip ? gcu.extractFilePaths(gamejson, param.source) : readdir(param.source);
			files.forEach(p => {
				cmn.Util.mkdirpSync(path.dirname(path.resolve(param.dest, p)));
				fs.writeFileSync(path.resolve(param.dest, p), fs.readFileSync(path.resolve(param.source, p)));
			});

			if (!param.bundle)
				return;
			return bundleScripts(gamejson.main || gamejson.assets.mainScene.path, param.dest)
				.then(result => {
					gcu.removeScriptFromFilePaths(gamejson, result.filePaths);
					result.filePaths.forEach(p => fs.unlinkSync(path.resolve(param.dest, p)));

					let entryPointPath: string;
					if (!!gamejson.main) {
						entryPointPath = gcu.addScriptAsset(gamejson, "aez_bundle_main");
						gamejson.main = "./" + entryPointPath;
					} else {
						entryPointPath = "script/mainScene.js";
						gamejson.assets["mainScene"] = {
							type: "script",
							global: true,
							path: entryPointPath
						};
					}
					const entryPointAbsPath = path.resolve(param.dest, entryPointPath);
					cmn.Util.mkdirpSync(path.dirname(entryPointAbsPath));
					fs.writeFileSync(entryPointAbsPath, result.bundle);
					fs.writeFileSync(path.join(param.dest, "game.json"), JSON.stringify(gamejson, null, 2));
				});
		})
		.then(() => {
			if (param.hashLength > 0) {
				const hashLength = Math.ceil(param.hashLength);
				try {
					cmn.Renamer.renameAssetFilenames(gamejson, param.dest, hashLength);
				} catch (error) {
					// ファイル名のハッシュ化に失敗した場合、throwして作業中のコピー先ファイルを削除する
					fsx.removeSync(path.resolve(param.dest));
					if (error.message === cmn.Renamer.ERROR_FILENAME_CONFLICT) {
						throw new Error("Hashed filename conflict. Use larger hash-filename param on command line.");
					}
					throw error;
				}
			}
			return cmn.ConfigurationFile.write(gamejson, path.resolve(param.dest, "game.json"), param.logger);
		})
		.then(() => {
			if (!param.minify)
				return;
			const scriptAssetPaths = gcu.extractScriptAssetFilePaths(gamejson).map(p => path.resolve(param.dest, p));
			scriptAssetPaths.forEach(p => {
				fs.writeFileSync(p, UglifyJS.minify(p).code);
			});
		});
}
