import AdmZip from "adm-zip";
import axios from "axios";
/**
 * Downloads an attachment from the specified URL and returns its contents as a Buffer.
 *
 * @param url - The URL of the attachment to download.
 * @returns A promise that resolves to a Buffer containing the downloaded data.
 * @throws Will throw an error if the HTTP request fails.
 */
export const downloadAttachment = async (url) => {
    const response = await axios.get(url, {
        responseType: "arraybuffer",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Content-Type": "application/octet-stream",
        },
    });
    return Buffer.from(response.data, "binary");
};
/**
 * Downloads a repository from the specified URL and returns its contents as an AdmZip instance.
 *
 * @param repoUrl - The URL of the repository to download (should point to a ZIP archive).
 * @returns A promise that resolves to an AdmZip instance containing the downloaded repository.
 * @throws Will throw an error if the download fails or the response is invalid.
 */
export const downloadRepository = async (repoUrl) => {
    const response = await axios.get(repoUrl, {
        responseType: "arraybuffer",
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
            "Accept": "application/vnd.github.v3+json",
        },
    });
    return new AdmZip(Buffer.from(response.data));
};
/**
 * Downloads a repository as a ZIP file from the given URL, extracts its contents to the specified path,
 * and returns the name of the extracted folder or entry.
 *
 * @param repoUrl - The URL of the repository to download.
 * @param extractPath - The local file system path where the repository should be extracted.
 * @returns A promise that resolves to the name of the extracted folder or entry, or an empty string if extraction fails.
 */
export const downloadAndExtractRepo = async (repoUrl, extractPath) => {
    const zip = await downloadRepository(repoUrl);
    zip.extractAllTo(extractPath, true);
    // Return the extracted folder name
    const entries = zip.getEntries();
    return entries[0]?.entryName || "";
};
