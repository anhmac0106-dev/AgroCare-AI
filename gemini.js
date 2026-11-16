import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import mime from "mime-types";
import dotenv from "dotenv";
import { PROMPT } from "./prompt.js";

dotenv.config();

const ai = new GoogleGenAI({

    apiKey: process.env.GEMINI_API_KEY

});

/* ============================================
# PHÂN TÍCH ẢNH
============================================ */

export async function detectPlantDisease(imagePath){

    const image = fs.readFileSync(imagePath);

    const mimeType = mime.lookup(imagePath);

    const response = await ai.models.generateContent({

        model:"gemini-2.5-flash",

        contents:[

            {

                inlineData:{

                    mimeType,

                    data:image.toString("base64")

                }

            },

            {

                text:PROMPT

            }

        ]

    });

    return response.text;

}