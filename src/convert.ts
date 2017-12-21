import * as fs from "fs";
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
	hashFilename: number;
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

export function mkdirpSync(p: string): void {
	p = path.resolve(p);
	try {
		fs.mkdirSync(p);
	} catch (e) {
		if (e.code === "ENOENT") {
			mkdirpSync(path.dirname(p));
			mkdirpSync(p);
		} else {
			var stat;
			try {
				stat = fs.statSync(p);
			} catch (e1) {
				throw e;
			}
			if (!stat.isDirectory())
				throw e;
		}
	}
};

export async function convertGame(param: ConvertGameParameterObject): Promise<void> {
	_completeConvertGameParameterObject(param);

	const content = await cmn.ConfigurationFile.read(path.join(param.source, "game.json"), param.logger);
	const gamejson = content;

	const files = param.strip ? gcu.extractFilePaths(gamejson, param.source) : readdir(param.source);
	files.forEach(p => {
		mkdirpSync(path.dirname(path.resolve(param.dest, p)));
		fs.writeFileSync(path.resolve(param.dest, p), fs.readFileSync(path.resolve(param.source, p)));
	});

	if (!param.bundle && !param.hashFilename) { // game.jsonをコピー(bundleまたはhashing時は改変したgame.jsonで上書きされるのでスキップ)
		mkdirpSync(path.dirname(path.resolve(param.dest)));
		cmn.ConfigurationFile.write(gamejson, path.resolve(param.dest, "game.json"), param.logger);
	}

	return Promise.resolve()
		.then(() => {
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
					mkdirpSync(path.dirname(entryPointAbsPath));
					fs.writeFileSync(entryPointAbsPath, result.bundle);
					fs.writeFileSync(path.join(param.dest, "game.json"), JSON.stringify(gamejson, null, 2));
				});
		})
		.then(() => {
			if (param.hashFilename > 0) {
				const hashLength = Math.ceil(param.hashFilename);
				const conf = new cmn.Configuration({ content: content });
				conf.hashingAssetNames(hashLength, param.dest);
			}
			mkdirpSync(path.dirname(path.resolve(param.dest))); // 既に呼んでいれば不要では？
			cmn.ConfigurationFile.write(gamejson, path.resolve(param.dest, "game.json"), param.logger);
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
