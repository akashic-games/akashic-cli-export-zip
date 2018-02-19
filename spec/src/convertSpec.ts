import * as path from "path";
import * as mockfs from "mock-fs";
import { bundleScripts } from "../../lib/convert";

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
});
