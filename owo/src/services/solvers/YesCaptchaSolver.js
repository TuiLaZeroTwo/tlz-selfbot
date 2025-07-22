import axios from "axios";
// --- Helper Function ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// --- Class Implementation ---
export class YesCaptchaSolver {
    apiKey;
    axiosInstance;
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.axiosInstance = axios.create({
            baseURL: "https://api.yescaptcha.com",
            headers: { "User-Agent": "YesCaptcha-Node-Client" },
            validateStatus: () => true, // Handle all status codes in the response
        });
    }
    createTask(options) {
        return this.axiosInstance.post("/createTask", {
            clientKey: this.apiKey,
            task: options,
        });
    }
    async pollTaskResult(taskId) {
        while (true) {
            await delay(3000); // Wait 3 seconds between polls
            const response = await this.axiosInstance.post("/getTaskResult", {
                clientKey: this.apiKey,
                taskId: taskId,
            });
            if (response.data.status === "ready") {
                return response.data;
            }
            // Continue polling if status is "processing"
        }
    }
    async solveImage(imageData) {
        const { data } = await this.createTask({
            type: "ImageToTextTaskM1",
            body: imageData.toString("base64"),
        });
        if (data.errorId !== 0) {
            throw new Error(`[YesCaptcha] Image-to-text task failed: ${data.errorDescription}`);
        }
        return data.solution.text;
    }
    async solveHcaptcha(sitekey, siteurl) {
        const { data: createTaskData } = await this.createTask({
            type: "HCaptchaTaskProxyless",
            websiteKey: sitekey,
            websiteURL: siteurl,
        });
        if (createTaskData.errorId !== 0) {
            throw new Error(`[YesCaptcha] HCaptcha task creation failed: ${createTaskData.errorDescription}`);
        }
        const resultData = await this.pollTaskResult(createTaskData.taskId);
        if (resultData.errorId !== 0 || !resultData.solution) {
            throw new Error(`[YesCaptcha] HCaptcha solution failed: ${resultData.errorDescription}`);
        }
        return resultData.solution.gRecaptchaResponse;
    }
}
