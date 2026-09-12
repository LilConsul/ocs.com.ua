function readPackage(pkg, context) {
	// Allow build scripts for specific packages
	const allowedBuilds = [
		"esbuild",
		"sharp",
		"better-sqlite3",
		"core-js",
		"@biomejs/biome",
		"@biomejs/cli-win32-x64",
		"@img/sharp-win32-x64",
	];

	// If this package is in the allowed list, ensure its scripts can run
	if (allowedBuilds.includes(pkg.name)) {
		context.log(`Allowing build scripts for: ${pkg.name}`);
	}

	return pkg;
}

module.exports = {
	hooks: {
		readPackage,
	},
};
