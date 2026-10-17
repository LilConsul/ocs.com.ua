import { describe, expect, it } from "bun:test";
import { renderEnv } from "../../scripts/render-env.mjs";

const manifest = {
	env_file: "/home/ocs/test.env",
	secrets: {
		MY_SECRET: "SECRET_VAR",
	},
	variables: {
		MY_VAR: "PUBLIC_VAR",
	},
};

describe("renderEnv", () => {
	it("maps secret to env line", () => {
		const result = renderEnv(manifest, { MY_SECRET: "s3cr3t" }, { MY_VAR: "x" });
		expect(result).toContain('SECRET_VAR="s3cr3t"');
	});

	it("maps variable to env line", () => {
		const result = renderEnv(manifest, { MY_SECRET: "x" }, { MY_VAR: "hello" });
		expect(result).toContain('PUBLIC_VAR="hello"');
	});

	it("escapes backslashes in values", () => {
		const result = renderEnv(manifest, { MY_SECRET: "back\\slash" }, { MY_VAR: "x" });
		expect(result).toContain('SECRET_VAR="back\\\\slash"');
	});

	it("escapes double quotes in values", () => {
		const result = renderEnv(manifest, { MY_SECRET: 'say "hi"' }, { MY_VAR: "x" });
		expect(result).toContain('SECRET_VAR="say \\"hi\\""');
	});

	it("throws if a listed name is missing", () => {
		expect(() => renderEnv(manifest, {}, { MY_VAR: "x" })).toThrow(/MY_SECRET/);
	});

	it("throws if a listed name is empty string", () => {
		expect(() => renderEnv(manifest, { MY_SECRET: "" }, { MY_VAR: "x" })).toThrow(/MY_SECRET/);
	});

	it("throws if value contains a newline", () => {
		expect(() => renderEnv(manifest, { MY_SECRET: "bad\nvalue" }, { MY_VAR: "x" })).toThrow();
	});
});
