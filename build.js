#!/usr/bin/env node
/**
 * Cross-platform JSON minify + zip
 * Usage:
 *   node build.js <srcDir> <outDir> <zipName>
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const [, , srcArg, outArg, zipArg] = process.argv;

if (!srcArg || !outArg || !zipArg) {
	console.error("Usage: node minify-and-zip.js <srcDir> <outDir> <zipName>");
	process.exit(1);
}

const SRC = path.resolve(srcArg);
const OUT = path.resolve(outArg);
const ZIP = path.resolve(zipArg);

function ensureDir(p) {
	fs.mkdirSync(p, { recursive: true });
}

function minifyJson(src, dst) {
	ensureDir(path.dirname(dst));
	const data = fs.readFileSync(src, "utf8");
	const min = JSON.stringify(JSON.parse(data));
	fs.writeFileSync(dst, min, "utf8");
}

function copyFile(src, dst) {
	ensureDir(path.dirname(dst));
	fs.copyFileSync(src, dst);
}

function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (["node_modules", ".git", "dist", "build"].includes(entry.name)) continue;

		const full = path.join(dir, entry.name);
		const rel = path.relative(SRC, full);
		const out = path.join(OUT, rel);

		if (entry.isDirectory()) {
			walk(full);
		} else if (entry.isFile()) {
			if (entry.name.toLowerCase().endsWith(".json")) {
				try {
					minifyJson(full, out);
				} catch (e) {
					console.error(`Invalid JSON skipped: ${rel}`);
				}
			} else {
				copyFile(full, out);
			}
		}
	}
}

function zipFolder() {
	console.log("Zipping with 7-Zip (max compression)…");

	const result = spawnSync(
		"7z",
		[
			"a",              // add to archive
			"-tzip",          // zip format (Minecraft-compatible)
			"-mx=9",          // maximum compression
			"-mfb=258",       // max number of fast bytes (better compression)
			"-mpass=15",      // multiple compression passes
			ZIP,              // output zip file
			"."               // archive contents
		],
		{
			cwd: OUT,
			stdio: "inherit"
		}
	);

	if (result.error) {
		throw new Error("7-Zip not found on PATH");
	}
	if (result.status !== 0) {
		throw new Error("7-Zip compression failed");
	}
}

ensureDir(OUT);
walk(SRC);
zipFolder();

console.log(`Done.\nOutput folder: ${OUT}\nZip file: ${ZIP}`);