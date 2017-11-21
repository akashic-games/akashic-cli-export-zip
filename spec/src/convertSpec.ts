import * as path from "path";
import * as fs from "fs";
import * as mockfs from "mock-fs";
import * as cmn from "@akashic/akashic-cli-commons";
import { mkdirpSync, bundleEntryPoint } from "../../lib/convert";

describe("convert", () => {

	afterEach(() => {
		mockfs.restore();
	});

	describe("bundleEntryPoint", () => {
		it("bundles scripts", (done) => {
			bundleEntryPoint(require("../fixtures/simple_game/game.json"), path.resolve(__dirname, "..", "fixtures", "simple_game"))
				.then((result) => {
					expect(result.hasMain).toBe(true);
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

	describe("mkdirpSync", () => {
		it("creates directory", () => {
			mockfs({});
			expect(() => fs.statSync("./test/some/dir")).toThrow();
			mkdirpSync("./test/some/dir");
			expect(fs.statSync("./test/some/dir").isDirectory()).toBe(true);
		});

		it("does nothing if exists", () => {
			mockfs({
				"test": {
					"some": {
						"dir": {},
						"anotherDir": {}
					}
				}
			});
			expect(fs.statSync("./test/some/dir").isDirectory()).toBe(true);
			mkdirpSync("./test/some/dir");
			expect(fs.statSync("./test/some/dir").isDirectory()).toBe(true);
		});

		it("throws if it is a file", () => {
			mockfs({
				"test": {
					"some": {
						"dir": "a file"
					}
				}
			});
			expect(() => mkdirpSync("./test/some/dir")).toThrow();
		});

		it("throws when it finds a file in a path", () => {
			mockfs({
				"test": "a file"
			});
			expect(() => mkdirpSync("./test/some/dir")).toThrow();
		});
	});
});
