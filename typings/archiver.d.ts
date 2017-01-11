declare module "archiver" {
	interface nameInterface {
		name?: string;
	}

	interface Archiver {
		on(name: string, cb: (err: any) => void): void;
		pipe(writeStream: any): void;
		bulk(files: any): Archiver;
		append(readStream: any, name: nameInterface): Archiver;
		finalize(): void;
	}

	interface Options {

	}

	function archiver(format: string, options?: Options): Archiver;

	export = archiver;
}
