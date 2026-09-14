const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3000;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());


// =====================================================
// GEMINI API KEY CHECK
// =====================================================

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing from .env");
} else {
    console.log("✅ GEMINI_API_KEY FOUND");
}


// =====================================================
// GEMINI SETUP
// =====================================================

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: "gemini-3.8-flash"
});


// =====================================================
// URL SECURITY CHECK
// =====================================================

function checkURLSecurity(text) {

    const result = {
        isURL: false,
        signals: [],
        score: 0
    };

    const urlPattern = /https?:\/\/[^\s]+/i;
    const match = text.match(urlPattern);

    if (!match) {
        return result;
    }

    result.isURL = true;

    const urlText = match[0].replace(/[.,!?;:]+$/, "");

    let parsedURL;

    try {

        parsedURL = new URL(urlText);

    } catch {

        result.score += 30;

        result.signals.push({
            title: "Invalid URL format",
            description:
                "The provided URL could not be parsed correctly.",
            severity: "HIGH"
        });

        return result;
    }


    // =================================================
    // HTTPS CHECK
    // =================================================

    if (parsedURL.protocol !== "https:") {

        result.score += 20;

        result.signals.push({
            title: "No secure HTTPS connection",
            description:
                "The URL does not use HTTPS.",
            severity: "HIGH"
        });
    }


    // =================================================
    // SUSPICIOUS KEYWORDS
    // =================================================

    const suspiciousWords = [
        "claim",
        "prize",
        "reward",
        "winner",
        "free",
        "bonus",
        "urgent",
        "verify",
        "login",
        "otp",
        "gift",
        "cash"
    ];

    const lowerURL = urlText.toLowerCase();

    const foundWords = suspiciousWords.filter(word =>
        lowerURL.includes(word)
    );

    if (foundWords.length > 0) {

        result.score += Math.min(
            foundWords.length * 10,
            30
        );

        result.signals.push({
            title: "Suspicious URL keywords",
            description:
                `The URL contains suspicious terms: ${foundWords.join(", ")}.`,
            severity: "MEDIUM"
        });
    }


    // =================================================
    // IP ADDRESS CHECK
    // =================================================

    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;

    if (ipPattern.test(parsedURL.hostname)) {

        result.score += 25;

        result.signals.push({
            title: "IP address used instead of domain",
            description:
                "The link uses an IP address instead of a normal domain name.",
            severity: "HIGH"
        });
    }


    // =================================================
    // @ SYMBOL CHECK
    // =================================================

    if (urlText.includes("@")) {

        result.score += 25;

        result.signals.push({
            title: "Suspicious @ symbol",
            description:
                "The URL contains an @ symbol that can hide the real destination.",
            severity: "HIGH"
        });
    }


    // =================================================
    // VERY LONG URL
    // =================================================

    if (urlText.length > 120) {

        result.score += 10;

        result.signals.push({
            title: "Unusually long URL",
            description:
                "The URL is unusually long and may contain hidden parameters.",
            severity: "MEDIUM"
        });
    }


    result.score = Math.min(result.score, 100);

    return result;
}


// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "ScamShield AI Backend is running!"
    });

});


// =====================================================
// HEALTH CHECK ROUTE
// =====================================================

app.get("/health", (req, res) => {

    res.json({
        success: true,
        backend: "online",
        geminiConfigured:
            Boolean(process.env.GEMINI_API_KEY)
    });

});


// =====================================================
// ANALYZE ROUTE
// =====================================================

app.post("/analyze", async (req, res) => {

    console.log("");
    console.log("📩 Analyze request received");


    // =================================================
    // CHECK INPUT
    // =================================================

    const { text } = req.body;

    if (!text || !text.trim()) {

        console.log("❌ No text received");

        return res.status(400).json({

            success: false,

            error:
                "Please provide text to analyze."

        });

    }

    console.log("📝 Text received:");
    console.log(text);


    // =================================================
    // URL SECURITY
    // =================================================

    const urlSecurity =
        checkURLSecurity(text);

    console.log("🔎 URL Security:");
    console.log(urlSecurity);


    // =================================================
    // CHECK API KEY
    // =================================================

    if (!process.env.GEMINI_API_KEY) {

        console.error(
            "❌ Gemini API key is missing."
        );

        return res.status(500).json({

            success: false,

            error:
                "Gemini API key is missing from .env"

        });

    }


    // =================================================
    // GEMINI PROMPT
    // =================================================

    const prompt = `

You are ScamShield AI, a digital scam detection assistant.

Analyze the following message or URL for possible scam indicators.

Look carefully for:

- Prize or lottery scams
- Unexpected money or rewards
- OTP or verification code requests
- Fake bank messages
- Account threats
- Suspicious links
- Payment requests
- Fake job offers
- Personal information requests
- Urgency or pressure
- Too-good-to-be-true promises
- Phishing
- Social engineering

Risk score rules:

0-19 = LOW
20-44 = MEDIUM
45-69 = HIGH
70-100 = CRITICAL

Return ONLY valid JSON.

Use exactly this structure:

{
  "risk": "CRITICAL",
  "score": 95,
  "summary": "Short explanation of why the message is risky.",
  "signals": [
    {
      "title": "Requests an OTP",
      "description": "The message asks the user to provide an OTP.",
      "severity": "CRITICAL"
    }
  ],
  "recommendedAction": "Do not click links, make payments, or share sensitive information. Verify the sender independently."
}

Important rules:

- score must be a number from 0 to 100
- risk must be LOW, MEDIUM, HIGH, or CRITICAL
- signals must be an array
- severity must be LOW, MEDIUM, HIGH, or CRITICAL
- summary must be short and clear
- recommendedAction must give practical safety advice
- Do not use Markdown
- Do not use code fences
- Return JSON only

MESSAGE OR URL:

${text}

`;


    try {

        // =================================================
        // CALL GEMINI
        // =================================================

        console.log("🤖 Sending request to Gemini...");

        const result =
            await model.generateContent(prompt);

        const response =
            result.response;

        const responseText =
            response.text();

        console.log("🤖 Gemini response:");
        console.log(responseText);


        // =================================================
        // CLEAN GEMINI RESPONSE
        // =================================================

        const cleanedResponse =
            responseText
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();


        // =================================================
        // PARSE JSON
        // =================================================

        const analysis =
            JSON.parse(cleanedResponse);


        // =================================================
        // NORMALIZE SCORE
        // =================================================

        let finalScore =
            Number(analysis.score) || 0;

        finalScore =
            Math.max(
                0,
                Math.min(finalScore, 100)
            );


        // =================================================
        // NORMALIZE RISK
        // =================================================

        let finalRisk =
            String(
                analysis.risk || "LOW"
            ).toUpperCase();

        if (
            ![
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ].includes(finalRisk)
        ) {

            finalRisk = "LOW";

        }


        // =================================================
        // COMBINE SIGNALS
        // =================================================

        let finalSignals =
            Array.isArray(analysis.signals)
                ? analysis.signals
                : [];


        if (urlSecurity.signals.length > 0) {

            finalSignals = [
                ...finalSignals,
                ...urlSecurity.signals
            ];

        }


        // =================================================
        // REMOVE DUPLICATE SIGNALS
        // =================================================

        const uniqueSignals = [];

        const seenTitles = new Set();

        for (const signal of finalSignals) {

            const title =
                String(
                    signal.title ||
                    "Suspicious pattern"
                );

            if (!seenTitles.has(title)) {

                seenTitles.add(title);

                let severity =
                    String(
                        signal.severity ||
                        "MEDIUM"
                    ).toUpperCase();

                if (
                    ![
                        "LOW",
                        "MEDIUM",
                        "HIGH",
                        "CRITICAL"
                    ].includes(severity)
                ) {

                    severity = "MEDIUM";

                }


                uniqueSignals.push({

                    title: title,

                    description:
                        signal.description ||
                        "This may indicate suspicious activity.",

                    severity: severity

                });

            }

        }

        finalSignals =
            uniqueSignals;


        // =================================================
        // URL SCORE
        // =================================================

        if (
            urlSecurity.score >
            finalScore
        ) {

            finalScore =
                urlSecurity.score;

        }


        // =================================================
        // FINAL RISK
        // =================================================

        if (finalScore >= 70) {

            finalRisk = "CRITICAL";

        } else if (finalScore >= 45) {

            finalRisk = "HIGH";

        } else if (finalScore >= 20) {

            finalRisk = "MEDIUM";

        } else {

            finalRisk = "LOW";

        }


        // =================================================
        // FINAL LOGS
        // =================================================

        console.log("");
        console.log("🎯 Final Risk:", finalRisk);
        console.log("📊 Final Score:", finalScore);
        console.log(
            "⚠️ Warning Signals:",
            finalSignals.length
        );


        // =================================================
        // SEND RESULT TO FRONTEND
        // =================================================

        return res.json({

            success: true,

            text: text,

            risk: finalRisk,

            score: finalScore,

            summary:
                analysis.summary ||
                "ScamShield AI analyzed this message for suspicious patterns.",

            signals:
                finalSignals,

            recommendedAction:
                analysis.recommendedAction ||
                "Do not click suspicious links or share sensitive information. Verify the request independently."

        });

    }


    // =================================================
    // ERROR HANDLING
    // =================================================

    catch (error) {

        console.error("");
        console.error(
            "❌ GEMINI ANALYSIS ERROR"
        );

        console.error(
            error.message || error
        );

        return res.status(500).json({

            success: false,

            error:
                "Gemini analysis failed. Check the API key and Gemini configuration."

        });

    }

});


// =====================================================
// START SERVER
// =====================================================

const server = app.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "🛡️ ScamShield AI Backend"
        );
        console.log(
            "================================"
        );
        console.log(
            `🚀 Running on http://localhost:${PORT}`
        );
        console.log(
            `❤️ Health check: http://localhost:${PORT}/health`
        );
        console.log(
            "================================"
        );
        console.log("");
        console.log(
            "⏳ Backend is now waiting for requests..."
        );
        console.log("");

    }
);


// =====================================================
// SERVER ERROR
// =====================================================

server.on("error", (error) => {

    console.error("");
    console.error(
        "❌ SERVER ERROR:"
    );

    console.error(error);

});


// =====================================================
// KEEP PROCESS ALIVE / ERROR LOGGING
// =====================================================

process.on("uncaughtException", (error) => {

    console.error(
        "❌ Uncaught Exception:"
    );

    console.error(error);

});


process.on("unhandledRejection", (error) => {

    console.error(
        "❌ Unhandled Promise Rejection:"
    );

    console.error(error);

});