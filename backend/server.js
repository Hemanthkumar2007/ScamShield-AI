const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env")
});

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

const PORT = process.env.PORT || 3000;


// =====================================================
// GEMINI SETUP
// =====================================================

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing from .env");
}

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash"
});


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(
    express.json({
        limit: "1mb"
    })
);


// =====================================================
// TEST ROUTE
// =====================================================

app.get("/", (req, res) => {

    res.json({

        success: true,

        message:
            "🛡️ ScamShield AI Backend is running!"

    });

});


// =====================================================
// ANALYZE ROUTE
// =====================================================

app.post("/analyze", async (req, res) => {

    console.log("");
    console.log("📩 Analyze request received");
    console.log("================================");


    const {
        text,
        mode = "message"
    } = req.body;


    // =================================================
    // INPUT VALIDATION
    // =================================================

    if (
        typeof text !== "string" ||
        !text.trim()
    ) {

        return res.status(400).json({

            success: false,

            error:
                "Please provide text to analyze."

        });

    }


    const cleanText = text.trim();


    if (cleanText.length > 5000) {

        return res.status(400).json({

            success: false,

            error:
                "Input must be 5000 characters or less."

        });

    }


    console.log(
        "📝 Text length:",
        cleanText.length
    );

    console.log(
        "🔍 Mode:",
        mode
    );


    // =================================================
    // GEMINI PROMPT
    // =================================================

    const prompt = `

You are ScamShield AI, an advanced scam detection assistant.

Analyze the following input carefully.

The input may be:

1. A suspicious message
2. A URL
3. A message containing one or more URLs
4. A job offer
5. A prize or reward message
6. A banking or account verification message
7. Any other suspicious communication

The analysis mode is:

${mode}

IMPORTANT:

Analyze the actual input provided.

Do not invent facts that are not present in the input.

Do not claim that a website is definitely malicious only from its visible URL structure.

If a URL is present, analyze visible characteristics such as:

- Suspicious words in the domain or path
- Prize, reward, free-money or giveaway language
- Fake banking or login terminology
- Phishing-style words
- Excessive or unusual subdomains
- IP address instead of a normal domain
- HTTP instead of HTTPS
- URL shorteners
- Suspicious-looking domain names
- Unusual characters
- Reward or claim paths
- Account verification paths
- Suspicious payment or login paths

Remember:

URL structure alone cannot prove that a website is malicious.

Explain this limitation when appropriate.

Also analyze common scam indicators such as:

- OTP requests
- Password requests
- CVV or card information requests
- Payment requests
- Registration fees
- Account threats
- Urgency
- Prize or lottery claims
- Fake job offers
- Personal information requests
- Too-good-to-be-true promises
- Phishing
- Social engineering
- Requests to click links
- Requests to transfer money
- Requests for confidential information

Give a risk score from 0 to 100.

Risk levels:

0-19 = LOW
20-44 = MEDIUM
45-69 = HIGH
70-100 = CRITICAL

Return ONLY valid JSON.

Use exactly this structure:

{
  "risk": "CRITICAL",
  "score": 95,
  "summary": "This message asks the recipient to provide sensitive information and uses urgent language.",
  "signals": [
    {
      "title": "OTP request",
      "description": "The message asks the recipient to provide an OTP, which is sensitive authentication information.",
      "severity": "CRITICAL"
    }
  ],
  "recommendedAction": "Do not share the OTP or click the link. Verify the request through the organization's official website or phone number."
}

Rules:

- score must be a number between 0 and 100
- risk must be LOW, MEDIUM, HIGH, or CRITICAL
- signals must be an array
- severity must be LOW, MEDIUM, HIGH, or CRITICAL
- summary must describe THIS specific input
- recommendedAction must give practical safety advice
- Do not use Markdown
- Do not use code fences
- Return JSON only
- Do not include extra text before or after the JSON

INPUT TO ANALYZE:

${cleanText}

`;


    // =================================================
    // CALL GEMINI
    // =================================================

    try {

        console.log(
            "🤖 Sending request to Gemini..."
        );


        let result;


        // =================================================
        // GEMINI RETRY SYSTEM
        // =================================================

        for (let attempt = 1; attempt <= 3; attempt++) {

            try {

                console.log(
                    `🔄 Gemini attempt ${attempt}/3`
                );

                result =
                    await model.generateContent(
                        prompt
                    );

                break;

            } catch (error) {

                console.error(
                    `⚠️ Gemini attempt ${attempt} failed:`,
                    error.status,
                    error.statusText
                );


                // Retry only temporary 503 errors
                if (
                    error.status === 503 &&
                    attempt < 3
                ) {

                    const waitTime =
                        attempt * 2000;

                    console.log(
                        `⏳ Retrying in ${waitTime / 1000} seconds...`
                    );

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                waitTime
                            )
                    );

                } else {

                    // Send ALL other Gemini errors
                    // to the local fallback
                    throw error;

                }

            }

        }


        // =================================================
        // GEMINI RESPONSE
        // =================================================

        const geminiResponse =
            result.response;


        const responseText =
            geminiResponse.text();


        console.log(
            "🤖 Gemini response received."
        );


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

        let analysis;


        try {

            analysis =
                JSON.parse(
                    cleanedResponse
                );

        } catch (jsonError) {

            console.error(
                "❌ Gemini returned invalid JSON:"
            );

            console.error(
                cleanedResponse
            );

            // Invalid Gemini JSON should also
            // use the local fallback
            throw new Error(
                "Gemini returned invalid JSON"
            );

        }


        // =================================================
        // NORMALIZE RISK
        // =================================================

        let risk =
            String(
                analysis.risk || "LOW"
            ).toUpperCase();


        const validRisks = [
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
        ];


        if (
            !validRisks.includes(risk)
        ) {

            risk = "LOW";

        }


        // =================================================
        // NORMALIZE SCORE
        // =================================================

        let score =
            Number(
                analysis.score
            );


        if (
            Number.isNaN(score)
        ) {

            score = 0;

        }


        score =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(score)
                )
            );


        // =================================================
        // NORMALIZE SIGNALS
        // =================================================

        let signals =
            Array.isArray(
                analysis.signals
            )
                ? analysis.signals
                : [];


        signals =
            signals.map(
                (signal) => {

                    let severity =
                        String(
                            signal?.severity ||
                            "MEDIUM"
                        ).toUpperCase();


                    if (
                        !validRisks.includes(
                            severity
                        )
                    ) {

                        severity = "MEDIUM";

                    }


                    return {

                        title:
                            String(
                                signal?.title ||
                                "Suspicious pattern"
                            ),

                        description:
                            String(
                                signal?.description ||
                                "This may indicate suspicious activity."
                            ),

                        severity:
                            severity

                    };

                }
            );


        // =================================================
        // SUMMARY
        // =================================================

        const summary =
            String(
                analysis.summary ||
                "ScamShield AI analyzed this content for suspicious patterns."
            );


        // =================================================
        // RECOMMENDED ACTION
        // =================================================

        const recommendedAction =
            String(
                analysis.recommendedAction ||
                "Do not click suspicious links or share sensitive information. Verify the request independently."
            );


        // =================================================
        // FINAL ANALYSIS
        // =================================================

        const finalAnalysis = {

            risk:
                risk,

            score:
                score,

            summary:
                summary,

            signals:
                signals,

            recommendedAction:
                recommendedAction

        };


        console.log("");
        console.log("🎯 ANALYSIS COMPLETE");
        console.log("--------------------------------");

        console.log(
            "Source: Gemini AI"
        );

        console.log(
            "Risk:",
            finalAnalysis.risk
        );

        console.log(
            "Score:",
            finalAnalysis.score
        );

        console.log(
            "Signals:",
            finalAnalysis.signals.length
        );

        console.log("--------------------------------");


        // =================================================
        // SEND GEMINI RESULT TO FRONTEND
        // =================================================

        return res.json({

            success:
                true,

            source:
                "gemini",

            text:
                cleanText,

            mode:
                mode,

            risk:
                finalAnalysis.risk,

            score:
                finalAnalysis.score,

            summary:
                finalAnalysis.summary,

            signals:
                finalAnalysis.signals,

            recommendedAction:
                finalAnalysis.recommendedAction

        });

    }


    // =================================================
    // LOCAL FALLBACK ERROR HANDLING
    // =================================================

    catch (error) {

        console.error("");
        console.error("❌ Gemini analysis failed:");
        console.error(error);

        console.log("");
        console.log(
            "⚠️ Gemini unavailable or returned invalid data."
        );

        console.log(
            "🛡️ Switching to local ScamShield fallback."
        );


        // =================================================
        // LOCAL TEXT ANALYSIS
        // =================================================

        const textLower =
            cleanText.toLowerCase();


        const signals = [];


        // =================================================
        // OTP
        // =================================================

        if (
            textLower.includes("otp") ||
            textLower.includes("one time password")
        ) {

            signals.push({

                title:
                    "OTP request",

                description:
                    "The message mentions an OTP or one-time password. Never share an OTP with another person.",

                severity:
                    "CRITICAL"

            });

        }


        // =================================================
        // URGENCY
        // =================================================

        if (
            textLower.includes("urgent") ||
            textLower.includes("immediately") ||
            textLower.includes("act now") ||
            textLower.includes("today") ||
            textLower.includes("hurry") ||
            textLower.includes("expires") ||
            textLower.includes("last chance")
        ) {

            signals.push({

                title:
                    "Urgent or threatening language",

                description:
                    "The message uses urgency or pressure to encourage immediate action.",

                severity:
                    "HIGH"

            });

        }


        // =================================================
        // PRIZE / REWARD
        // =================================================

        if (
            textLower.includes("prize") ||
            textLower.includes("reward") ||
            textLower.includes("winner") ||
            textLower.includes("lottery") ||
            textLower.includes("giveaway") ||
            textLower.includes("congratulations") ||
            textLower.includes("you won") ||
            textLower.includes("₹") ||
            textLower.includes("rs ") ||
            textLower.includes("rupees")
        ) {

            signals.push({

                title:
                    "Prize or reward claim",

                description:
                    "The message contains language about winning money, prizes, rewards, or giveaways.",

                severity:
                    "HIGH"

            });

        }


        // =================================================
        // PAYMENT / MONEY
        // =================================================

        if (
            textLower.includes("pay") ||
            textLower.includes("payment") ||
            textLower.includes("fee") ||
            textLower.includes("registration fee") ||
            textLower.includes("transfer money") ||
            textLower.includes("send money") ||
            textLower.includes("deposit") ||
            textLower.includes("upi")
        ) {

            signals.push({

                title:
                    "Payment request",

                description:
                    "The message appears to request money, payment, a fee, or a financial transaction.",

                severity:
                    "HIGH"

            });

        }


        // =================================================
        // LINK / URL
        // =================================================

        if (
            textLower.includes("http://") ||
            textLower.includes("https://") ||
            textLower.includes("www.") ||
            textLower.includes("click this link") ||
            textLower.includes("click the link") ||
            textLower.includes("open this link")
        ) {

            signals.push({

                title:
                    "Link or URL detected",

                description:
                    "The message contains a URL or asks the recipient to open or click a link. Verify the destination independently before opening it.",

                severity:
                    "HIGH"

            });

        }


        // =================================================
        // SENSITIVE INFORMATION
        // =================================================

        if (
            textLower.includes("password") ||
            textLower.includes("cvv") ||
            textLower.includes("card number") ||
            textLower.includes("bank details") ||
            textLower.includes("account number") ||
            textLower.includes("personal details") ||
            textLower.includes("aadhar") ||
            textLower.includes("aadhaar") ||
            textLower.includes("pan number")
        ) {

            signals.push({

                title:
                    "Sensitive information request",

                description:
                    "The message appears to request sensitive personal, banking, or authentication information.",

                severity:
                    "CRITICAL"

            });

        }


        // =================================================
        // FAKE JOB
        // =================================================

        if (
            textLower.includes("work-from-home") ||
            textLower.includes("work from home") ||
            textLower.includes("job offer") ||
            textLower.includes("earn ₹") ||
            textLower.includes("earn money") ||
            textLower.includes("part time job") ||
            textLower.includes("part-time job") ||
            textLower.includes("easy money")
        ) {

            signals.push({

                title:
                    "Potentially suspicious job offer",

                description:
                    "The message contains characteristics commonly associated with suspicious or unsolicited job offers.",

                severity:
                    "HIGH"

            });

        }


        // =================================================
        // ACCOUNT THREAT
        // =================================================

        if (
            textLower.includes("account will be blocked") ||
            textLower.includes("account will be closed") ||
            textLower.includes("account suspended") ||
            textLower.includes("verify your account") ||
            textLower.includes("kyc") ||
            textLower.includes("your account")
        ) {

            signals.push({

                title:
                    "Account verification or threat",

                description:
                    "The message refers to account verification, suspension, blocking, or KYC-related action.",

                severity:
                    "HIGH"

            });

        }


        // =================================================
        // CALCULATE LOCAL SCORE
        // =================================================

        let score = 0;


        signals.forEach(
            (signal) => {

                if (
                    signal.severity === "CRITICAL"
                ) {

                    score += 30;

                }
                else if (
                    signal.severity === "HIGH"
                ) {

                    score += 20;

                }
                else if (
                    signal.severity === "MEDIUM"
                ) {

                    score += 10;

                }
                else {

                    score += 5;

                }

            }
        );


        // Maximum score = 100

        if (score > 100) {

            score = 100;

        }


        // =================================================
        // DETERMINE LOCAL RISK
        // =================================================

        let risk = "LOW";


        if (score >= 70) {

            risk = "CRITICAL";

        }
        else if (score >= 45) {

            risk = "HIGH";

        }
        else if (score >= 20) {

            risk = "MEDIUM";

        }


        // =================================================
        // LOCAL SUMMARY
        // =================================================

        let summary;


        if (signals.length > 0) {

            summary =
                "ScamShield detected suspicious patterns using its local safety detector because the AI analysis service was unavailable.";

        }
        else {

            summary =
                "The local safety detector did not find obvious scam indicators in this input. This does not guarantee that the content is safe.";

        }


        // =================================================
        // LOCAL RECOMMENDED ACTION
        // =================================================

        let recommendedAction;


        if (signals.length > 0) {

            recommendedAction =
                "Do not click suspicious links, send money, or share OTPs, passwords, card details, or other sensitive information. Verify the request independently through an official source.";

        }
        else {

            recommendedAction =
                "Remain cautious and independently verify unexpected messages, links, job offers, payment requests, or account notifications.";

        }


        // =================================================
        // SEND LOCAL FALLBACK RESULT
        // =================================================

        console.log("");
        console.log("🛡️ LOCAL FALLBACK ANALYSIS COMPLETE");
        console.log("--------------------------------");

        console.log(
            "Source: Local Detector"
        );

        console.log(
            "Risk:",
            risk
        );

        console.log(
            "Score:",
            score
        );

        console.log(
            "Signals:",
            signals.length
        );

        console.log("--------------------------------");


        return res.json({

            success:
                true,

            source:
                "local-fallback",

            text:
                cleanText,

            mode:
                mode,

            risk:
                risk,

            score:
                score,

            summary:
                summary,

            signals:
                signals,

            recommendedAction:
                recommendedAction

        });

    }

});


// =====================================================
// START SERVER
// =====================================================

app.listen(
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
            "📡 POST /analyze"
        );

        console.log(
            "🛡️ Gemini + Local Fallback Enabled"
        );

        console.log(
            "================================"
        );

        console.log("");

    }
);