import * as mockfs from "mock-fs";
import * as cmn from "@akashic/akashic-cli-commons";
import * as gcu from "../../lib/GameConfigurationUtil";

describe("GameConfigurationUtil", () => {
	let gamejson: cmn.GameConfiguration;
	let gamejsonNoGlobalScripts: cmn.GameConfiguration;

	beforeEach(() => {
		gamejson = {
			width: 120,
			height: 120,
			fps: 40,
			assets: {
				"main": {
					type: "script",
					global: true,
					path: "script/main.js"
				},
				"sub": {
					type: "script",
					global: true,
					path: "script/sub.js"
				}
			},
			globalScripts: [
				"node_modules/foobar/lib/x.js",
				"node_modules/foobar/package.json"
			]
		};
		gamejsonNoGlobalScripts = {
			width: 120,
			height: 120,
			fps: 40,
			assets: {
				"main": {
					type: "script",
					global: true,
					path: "script/main.js"
				},
				"sub": {
					type: "script",
					global: true,
					path: "script/sub.js"
				}
			}
		};
	});

	afterEach(() => {
		mockfs.restore();
	});

	describe("removeScriptFromFilePaths", () => {
		it("removes scripts", () => {
			gcu.removeScriptFromFilePaths(gamejsonNoGlobalScripts, ["node_modules/foobar/lib/x.js", "script/sub.js"]);
			expect(gamejsonNoGlobalScripts).toEqual({
				width: 120,
				height: 120,
				fps: 40,
				assets: {
					"main": {
						type: "script",
						global: true,
						path: "script/main.js"
					}
				}
			});
		});

		it("removes scripts from globalScripts", () => {
			gcu.removeScriptFromFilePaths(gamejson, ["node_modules/foobar/lib/x.js", "script/sub.js"]);
			expect(gamejson).toEqual({
				width: 120,
				height: 120,
				fps: 40,
				assets: {
					"main": {
						type: "script",
						global: true,
						path: "script/main.js"
					}
				},
				globalScripts: [
					"node_modules/foobar/package.json"
				]
			});
		});
	});

	describe("findUniqueScriptAssetName", () => {
		it("uses the given prefix if can be used", () => {
			expect(gcu.findUniqueScriptAssetName(gamejson, "foo")).toBe("foo");
		});

		it("detects confliction", () => {
			const gamejson: cmn.GameConfiguration = {
				width: 120,
				height: 120,
				fps: 40,
				assets: {
					"main": {
						type: "script",
						global: true,
						path: "script/main.js"
					},
					"sub": {
						type: "script",
						global: true,
						path: "script/sub.js"
					},
					"sub0": {
						type: "script",
						global: true,
						path: "script/sub0.js"
					}
				},
				globalScripts: [
					"node_modules/foobar/lib/x.js",
					"node_modules/foobar/package.json"
				]
			};
			expect(gcu.findUniqueScriptAssetName(gamejson, "sub")).toBe("sub1");
		});

		it("detects confliction from globalScripts", () => {
			const gamejson: cmn.GameConfiguration = {
				width: 120,
				height: 120,
				fps: 40,
				assets: {
					"main": {
						type: "script",
						global: true,
						path: "script/main.js"
					}
				},
				globalScripts: [  // エッジケース。通常globalScriptsに拡張子なし・node_modules以外のファイルを書くことはまずない
					"zoo",
					"zoo0"
				]
			};
			expect(gcu.findUniqueScriptAssetName(gamejson, "zoo")).toBe("zoo1");
		});
	});

	describe("addScriptAsset", () => {
		it("adds unique script asset", () => {
			gcu.addScriptAsset(gamejson, "sub");
			expect(gamejson).toEqual({
				width: 120,
				height: 120,
				fps: 40,
				assets: {
					"main": {
						type: "script",
						global: true,
						path: "script/main.js"
					},
					"sub": {
						type: "script",
						global: true,
						path: "script/sub.js"
					},
					"sub0": {
						type: "script",
						global: true,
						path: "script/sub0.js"
					}
				},
				globalScripts: [
					"node_modules/foobar/lib/x.js",
					"node_modules/foobar/package.json"
				]
			});
		});
	});

	describe("extractFilePaths", () => {
		it("lists paths", () => {
			expect(gcu.extractFilePaths(gamejson, ".")).toEqual([
				"script/main.js",
				"script/sub.js",
				"node_modules/foobar/lib/x.js",
				"node_modules/foobar/package.json"
			]);
		});

		it("completes audio extensions", () => {
			gamejson.assets.sound = {
				type: "audio",
				systemId: "sound",
				path: "audio/foo"
			};
			mockfs({
				gamejson: "",
				audio: {
					"foo.ogg": "",
					"foo.aac": "",
					"foo.invalid": "",
					"foo.mp4": {  // ファイルでなければ無視されねばならない
						"foo.mustbeignored.aac": ""
					}
				},
				script: {
					"main.js": "",
					"sub.js": ""
				},
				node_modules: {
					foobar: {
						lib: {
							"x.js": ""
						},
						"package.json": ""
					}
				}
			});

			expect(gcu.extractFilePaths(gamejson, ".")).toEqual([
				"script/main.js",
				"script/sub.js",
				"audio/foo.ogg",
				"audio/foo.aac",
				"node_modules/foobar/lib/x.js",
				"node_modules/foobar/package.json"
			]);
		});
	});

	describe("extractScriptAssetFilePaths", () => {
		it("extracts script assets", () => {
			expect(gcu.extractScriptAssetFilePaths(gamejsonNoGlobalScripts)).toEqual(["script/main.js", "script/sub.js"]);
		});
		it("extracts script assets from globalScripts", () => {
			expect(gcu.extractScriptAssetFilePaths(gamejson)).toEqual([
				"script/main.js",
				"script/sub.js",
				"node_modules/foobar/lib/x.js"
			]);
		});
	});

	describe("makeUniqueAssetPath", () => {
		it("can get asset path not used in game.json", () => {
			gamejson.assets["main0"] = {
				type: "script",
				global: true,
				path: "script/main0.js"
			};
			gamejson.assets["main2"] = {
				type: "script",
				global: true,
				path: "script/main2.js"
			};
			const result = gcu.makeUniqueAssetPath(gamejson, "script/main.js");
			expect(result).toBe("script/main1.js");
		});
	});

	describe("isEmptyScriptJs", () => {
		it("when buffer is empty true is returned", () => {
			const ret = gcu.isEmptyScriptJs("script/test.js", new Buffer(""));
			expect(ret).toBeTruthy();
		});
		it("when buffer isnt empty, false is returned", () => {
			const ret = gcu.isEmptyScriptJs("script/test.js", new Buffer("aaaaaaaaaaa"));
			expect(ret).toBeFalsy();
		});
		it("for interface logic only, true is returned", () => {
			const buff = new Buffer("\"use strict\"\r\nObject.defineProperty(exports, \"__esModule\", { value: true });");
			const ret = gcu.isEmptyScriptJs("script/hoge/test.js", buff);
			expect(ret).toBeTruthy();
		});
		it("when typescript less then equal to 2.2.0 and interface logic only, true is returned,", () => {
			const buff = new Buffer("\"use strict\";\r\n");
			const ret = gcu.isEmptyScriptJs("script/hoge2/test.js", buff);
			expect(ret).toBeTruthy();
		});
		it("when filepath prefix is not script, false is returned", () => {
			const buff = new Buffer("aaaa\r\nbbb\rcccc");
			const ret = gcu.isEmptyScriptJs("node_module/somewhere/test.js", buff);
			expect(ret).toBeFalsy();
		});
	});
});
