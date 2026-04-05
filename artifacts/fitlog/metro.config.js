const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Watch both the project folder and the workspace root so Metro can follow
// pnpm symlinks from node_modules/.pnpm/... back to their sources.
config.watchFolders = [projectRoot, workspaceRoot];

// Resolve modules from the project's own node_modules first, then workspace.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Only block workspace packages that aren't meant to be bundled by Metro
// (server-only code). Do NOT block .pnpm here — pnpm stores all packages
// under node_modules/.pnpm/ and Metro must be able to resolve through those
// symlinks (e.g. expo-router/entry lives there).
config.resolver.blockList = [
  /.*\/node_modules\/@workspace\/.*/,
  /.*pnpm-workspace\.yaml.*/,
];

// Enable subpath exports (required by several packages in this project).
// getDefaultConfig already sets this in SDK 53+, but we set it explicitly to
// be safe when running outside the normal Expo CLI managed environment.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
