interface Babel {
    transform(code: string, options?: TransformOptions): BabelFileResult;
    createConfigItem(value: any, options: any): any;
}

interface TransformOptions {
    presets?: any;
}

interface BabelFileResult {
    code: string;
}

declare var babel: Babel;

declare module "@babel/core" {
	export = babel
}

declare module "@babel/preset-env" { }