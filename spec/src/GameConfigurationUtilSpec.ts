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
});
