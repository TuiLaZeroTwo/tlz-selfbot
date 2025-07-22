import fs from "node:fs";
import path from "node:path";
/**
 * Recursively retrieves all files with the specified suffix from a directory and its subdirectories.
 *
 * @param dir - The root directory to search in.
 * @param suffix - The file suffix to filter by (e.g., ".js").
 * @returns An array of file paths matching the given suffix.
 * @throws If the specified directory does not exist.
 */
export const getFiles = (dir, suffix) => {
    if (!fs.existsSync(dir)) {
        throw new Error(`Directory does not exist: ${dir}`);
    }
    const files = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const itemPath = path.join(dir, item);
        if (fs.statSync(itemPath).isDirectory()) {
            files.push(...getFiles(itemPath, suffix));
        }
        else if (item.endsWith(suffix)) {
            files.push(itemPath);
        }
    }
    return files;
};
/**
 * Recursively copies the contents of a source directory to a destination directory.
 *
 * @param source - The path to the source directory.
 * @param destination - The path to the destination directory.
 * @throws If the source directory does not exist.
 */
export const copyDirectory = (source, destination) => {
    if (!fs.existsSync(source)) {
        throw new Error(`Source directory does not exist: ${source}`);
    }
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }
    const items = fs.readdirSync(source);
    for (const item of items) {
        const sourcePath = path.join(source, item);
        const destPath = path.join(destination, item);
        if (fs.statSync(sourcePath).isDirectory()) {
            copyDirectory(sourcePath, destPath);
        }
        else {
            fs.copyFileSync(sourcePath, destPath);
        }
    }
};
