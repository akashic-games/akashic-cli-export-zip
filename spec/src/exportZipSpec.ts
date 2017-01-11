import * as fs from "fs";
import * as mockfs from "mock-fs";
import * as path from "path";
import { exportZip } from "../../lib/exportZip";

describe("exportZip", () => {
	beforeEach(() => {
	});

	afterEach(() => {
		mockfs.restore();
	});

	it("no game.json",(done) => {
		mockfs({
		});
		exportZip({}, (err) => {
			expect(err.message).toBe("game.json is not found");
			done();
		});
	});

	it("output no name", (done) => {
		mockfs({
			"game.json": ""
		});
		exportZip({}, (err: any) => {
			expect(err).toBeUndefined();
			expect(fs.existsSync("game.zip")).toBe(true);
			done();
		});
	});

	it("output", (done) => {
		mockfs({
			"game.json": ""
		});
		exportZip({output: "hoge.zip"}, (err :any) => {
			expect(err).toBeUndefined();
			expect(fs.existsSync("hoge.zip")).toBe(true);
			done();
		});
	});

	it("zip", (done) => {
		mockfs({
			"game.json": ""
		});
		exportZip({output: "game.zip", exclude: ["exclude.txt"]}, (err: any) => {
			expect(err).toBeUndefined();
			expect(fs.existsSync("game.zip")).toBe(true);
			done();
		});
	});

	it("zip no file", (done) => {
		mockfs({
			"game.json": ""
		});
		exportZip({output: path.resolve("game.zip"), exclude: [path.resolve("game.json")]}, (err: any) => {
			expect(err.message).toBe("no file to archive");
			expect(fs.existsSync("game.zip")).toBe(false);
			done();
		});
	});
});
