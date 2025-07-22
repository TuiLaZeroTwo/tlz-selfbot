import { Solver } from "2captcha";
export class TwoCaptchaSolver {
    solver;
    constructor(apiKey) {
        this.solver = new Solver(apiKey);
    }
    solveImage = async (imageData) => {
        const result = await this.solver.imageCaptcha(imageData.toString("base64"), {
            numeric: 2,
            min_len: 3,
            max_len: 6,
        });
        return result.data;
    };
    solveHcaptcha = async (sitekey, siteurl) => {
        const result = await this.solver.hcaptcha(sitekey, siteurl);
        return result.data;
    };
}
