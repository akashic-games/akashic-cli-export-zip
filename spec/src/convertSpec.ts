import * as path from "path";
import * as mockfs from "mock-fs";
import * as fs from "fs";
import * as fsx from "fs-extra";
import { bundleScripts, convertGame } from "../../lib/convert";

describe("convert", () => {

	afterEach(() => {
		mockfs.restore();
	});

	describe("bundleScripts", () => {
		it("bundles scripts", (done) => {
			bundleScripts(require("../fixtures/simple_game/game.json").main, path.resolve(__dirname, "..", "fixtures", "simple_game"))
				.then((result) => {
					expect(result.filePaths).toEqual([
						"script/bar.js",
						"script/foo.js",
						"script/main.js",
						"text/test.json"
					]);

					// bundle結果の内容を確認するのは難しいので、簡易的に実行結果を確認しておく
					const f = new Function("module", "exports", result.bundle);
					const m = { exports: {} };
					f(m, m.exports);
					expect(typeof m.exports).toBe("function");
					expect((m.exports as Function)()).toEqual({ x: 200, y: 12 });

					done();
				}, done.fail);
		});
	});

	describe("convertGame", () => {
		const destDir = path.resolve(__dirname, "..", "fixtures", "output");
		afterEach(() => {
			fsx.removeSync(destDir);
		});
		it("can not convert game if script that is not written with ES5 syntax", (done) => {
			var warningMessage = "";
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game_es6"),
				dest: destDir,
				logger: {
					warn: (message: string) => {
						warningMessage = message;
					},
					print: (message: string) => {
						console.log(message);
					},
					error: (message: string) => {
						console.error(message);
					},
					info: (message: string) => {
						console.log(message);
					}
				}
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(destDir)).toBe(true);
					const expected = "The following ES5 syntax errors exist.\n"
						+ "script/main.js(1:1): Parsing error: The keyword 'const' is reserved\n"
						+ "script/foo.js(1:1): Parsing error: The keyword 'const' is reserved";
					expect(warningMessage).toBe(expected);
					done();
				}, done.fail);
		});
		it("copy all files in target directory", (done) => {
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game_using_external"),
				dest: destDir
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "node_modules/external/index.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "node_modules/external/package.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/main.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/unrefered.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "text/test.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(true);
					done();
				}, done.fail);
		});
		it("copy only necessary files in target directory when strip mode", (done) => {
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game_using_external"),
				dest: destDir,
				strip: true
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "node_modules/external/index.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "node_modules/external/package.json"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/main.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/unrefered.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "text/test.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(false);
					done();
				}, done.fail);
		});
		it("copy bundled-script and assets in target directory when bandle mode", (done) => {
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game_using_external"),
				dest: destDir,
				bundle: true
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "node_modules/external/index.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "node_modules/external/package.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/main.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/unrefered.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/aez_bundle_main.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "text/test.json"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(true);
					expect(fs.readFileSync(path.join(destDir, "game.json")))
						.not.toBe(fs.readFileSync(path.join(es6GameParameter.source, "game.json")));
					done();
				}, done.fail);
		});
		it("does not copy output directory, even if it exists in source directory", (done) => {
			const souceDirectory = path.resolve(__dirname, "..", "fixtures", "simple_game_using_external");
			const outputDirectory = path.join(souceDirectory, "output");
			const es6GameParameter = {
				source: souceDirectory,
				dest: outputDirectory,
				bundle: true
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(outputDirectory, "node_modules/external/index.js"))).toBe(false);
					expect(fs.existsSync(path.join(outputDirectory, "node_modules/external/package.json"))).toBe(true);
					expect(fs.existsSync(path.join(outputDirectory, "script/main.js"))).toBe(false);
					expect(fs.existsSync(path.join(outputDirectory, "script/unrefered.js"))).toBe(true);
					expect(fs.existsSync(path.join(outputDirectory, "script/aez_bundle_main.js"))).toBe(true);
					expect(fs.existsSync(path.join(outputDirectory, "text/test.json"))).toBe(false);
					expect(fs.existsSync(path.join(outputDirectory, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(outputDirectory, "package.json"))).toBe(true);
					expect(fs.existsSync(path.join(outputDirectory, "output"))).toBe(false);
					expect(fs.readFileSync(path.join(outputDirectory, "game.json")))
						.not.toBe(fs.readFileSync(path.join(es6GameParameter.source, "game.json")));
					fsx.removeSync(outputDirectory);
					done();
				}, done.fail);
		});
		it("copy only necessary files and bundled-script in target directory when strip and bundle mode", (done) => {
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game_using_external"),
				dest: destDir,
				strip: true,
				bundle: true
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "node_modules/external/index.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "node_modules/external/package.json"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/main.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/unrefered.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/aez_bundle_main.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "text/test.json"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(false);
					expect(fs.readFileSync(path.join(destDir, "game.json")))
						.not.toBe(fs.readFileSync(path.join(es6GameParameter.source, "game.json")));
					done();
				}, done.fail);
		});
		it("rewrite aez_bundle_main.js, even if aez_bundle_main script-asset already exists as entry-point", (done) => {
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game_with_aez_bundle_main"),
				dest: destDir,
				bundle: true
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "script/aez_bundle_main.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/bar.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/foo.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "text/test.json"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(true);
					expect(fs.readFileSync(path.join(destDir, "game.json")))
						.not.toBe(fs.readFileSync(path.join(es6GameParameter.source, "game.json")));
					expect(fs.readFileSync(path.join(destDir, "script/aez_bundle_main.js")))
						.not.toBe(fs.readFileSync(path.join(es6GameParameter.source, "script/aez_bundle_main.js")));
					done();
				}, done.fail);
		});
		it("does not rewrite aez_bundle_main.js, even if aez_bundle_main script-asset already exists as not entry-point", (done) => {
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game_with_aez_bundle_main2"),
				dest: destDir,
				bundle: true
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "script/aez_bundle_main.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/bar.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/foo.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/main.js"))).toBe(false);
					// script/aez_bundle_main.jsに被らない名前のスクリプトファイルが生成される
					expect(fs.existsSync(path.join(destDir, "script/aez_bundle_main0.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "text/test.json"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(true);
					expect(fs.readFileSync(path.join(destDir, "game.json")))
						.not.toBe(fs.readFileSync(path.join(es6GameParameter.source, "game.json")));
					done();
				}, done.fail);
		});
		it("rewrite mainScene.js, even if mainScene.js already exists", (done) => {
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game_with_main_scene"),
				dest: destDir,
				bundle: true
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "script/bar.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/foo.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/unrefered.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/mainScene.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "text/test.json"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(true);
					expect(fs.readFileSync(path.join(destDir, "game.json")))
						.not.toBe(fs.readFileSync(path.join(es6GameParameter.source, "game.json")));
					expect(fs.readFileSync(path.join(destDir, "script/mainScene.js")))
						.not.toBe(fs.readFileSync(path.join(es6GameParameter.source, "script/mainScene.js")));
					done();
				}, done.fail);
		});
	});
});
