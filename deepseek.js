import fs from "node:fs/promises";
import mime from "mime-types";
import dotenv from "dotenv";
import { PROMPT } from "./prompt.js";

dotenv.config();

export async function detectPlantDisease(imagePath) {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) throw new Error("Chưa cấu hình DEEPSEEK_API_KEY trong .env");

    const mimeType = mime.lookup(imagePath);
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mimeType)) {
        throw new Error("DeepSeek chỉ hỗ trợ ảnh JPEG, PNG, GIF và WebP");
    }
    const image = await fs.readFile(imagePath);
    const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-flash",
            thinking: { type: "disabled" },
            max_tokens: 4096,
            response_format: { type: "json_object" },
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: PROMPT },
                    { type: "image_url", image_url: { url: `data:${mimeType};base64,${image.toString("base64")}` } }
                ]
            }]
        })
    });
    if (!response.ok) throw new Error(`DeepSeek API trả về lỗi HTTP ${response.status}`);
    const data = await response.json();
    const choice = data.choices?.[0];
    const result = choice?.message?.content;
    if (choice?.finish_reason !== "stop" || typeof result !== "string" || !result.trim()) {
        throw new Error("DeepSeek không trả về kết quả hoàn chỉnh. Vui lòng thử lại.");
    }
    return result;
}
