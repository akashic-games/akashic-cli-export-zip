import * as path from "path";
import * as mockfs from "mock-fs";
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
		it("can not convert game if script that is not written with ES5 syntax", (done) => {
			const es6GameParameter = {
				source: path.resolve(__dirname, "..", "fixtures", "simple_game_es6"),
				dest: path.resolve(__dirname, "..", "fixtures", "simple_game_es6")
			};
			convertGame(es6GameParameter)
				.then(() => {
					done.fail();
				})
				.catch((e: any) => {
					expect(e.message).toBe("The following files is not written with ES5 syntax. script/main.js, script/foo.js");
					done();
				});
		});
	});
});
