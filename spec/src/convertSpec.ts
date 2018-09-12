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
				source: path.resolve(__dirname, "..", "fixtures", "simple_game"),
				dest: destDir
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "script/bar.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/foo.js"))).toBe(true);
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
				source: path.resolve(__dirname, "..", "fixtures", "simple_game"),
				dest: destDir,
				strip: true
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "script/bar.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/foo.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/main.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "script/unrefered.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "text/test.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(false);
					done();
				}, done.fail);
		});
		it("copy only necessary files and bundled-script in target directory when strip and bundle mode", (done) => {
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game"),
				dest: destDir,
				strip: true,
				bundle: true
			};
			convertGame(es6GameParameter)
				.then(() => {
					expect(fs.existsSync(path.join(destDir, "script/bar.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/foo.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/main.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/unrefered.js"))).toBe(false);
					expect(fs.existsSync(path.join(destDir, "script/aez_bundle_main.js"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "text/test.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "game.json"))).toBe(true);
					expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(false);
					done();
				}, done.fail);
		});
	});
});
