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
// HELPER FUNCTIONS
// =====================================================

function containsAny(text, keywords) {

    return keywords.some(
        keyword =>
            text.includes(keyword)
    );

}


function addSignal(
    signals,
    title,
    description,
    severity
) {

    const exists =
        signals.some(
            signal =>
                signal.title === title
        );

    if (!exists) {

        signals.push({

            title:
                title,

            description:
                description,

            severity:
                severity

        });

    }

}


function extractUrls(text) {

    const matches =
        text.match(
            /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi
        ) || [];

    return matches.map(
        url =>
            url.replace(
                /[),.!?;:]+$/,
                ""
            )
    );

}


function isIpAddress(hostname) {

    return /^(\d{1,3}\.){3}\d{1,3}$/
        .test(hostname);

}


function analyzeUrlPatterns(
    text,
    signals
) {

    const urls =
        extractUrls(text);

    if (urls.length === 0) {
        return;
    }

    urls.forEach(
        rawUrl => {

            let normalized =
                rawUrl;

            if (
                normalized
                    .toLowerCase()
                    .startsWith("www.")
            ) {

                normalized =
                    "https://" +
                    normalized;

            }

            try {

                const parsed =
                    new URL(normalized);

                const hostname =
                    parsed.hostname.toLowerCase();

                const fullUrl =
                    normalized.toLowerCase();


                // -------------------------------------------------
                // HTTP WITHOUT HTTPS
                // -------------------------------------------------

                if (
                    parsed.protocol === "http:"
                ) {

                    addSignal(
                        signals,

                        "Unencrypted HTTP link",

                        "The detected link uses HTTP instead of HTTPS. This does not prove that the website is malicious, but sensitive information should not be entered until the destination is independently verified.",

                        "MEDIUM"
                    );

                }


                // -------------------------------------------------
                // IP ADDRESS URL
                // -------------------------------------------------

                if (
                    isIpAddress(hostname)
                ) {

                    addSignal(
                        signals,

                        "IP address used as website",

                        "The link points directly to an IP address instead of a normal domain name. This can occur in legitimate systems, but it is also a pattern worth verifying before opening.",

                        "HIGH"
                    );

                }


                // -------------------------------------------------
                // URL USERNAME / @ SYMBOL
                // -------------------------------------------------

                if (
                    normalized.includes("@")
                ) {

                    addSignal(
                        signals,

                        "Unusual URL structure",

                        "The URL contains an @ symbol, which can make a link's true destination harder to recognize. Verify the actual domain before opening it.",

                        "HIGH"
                    );

                }


                // -------------------------------------------------
                // PUNYCODE
                // -------------------------------------------------

                if (
                    hostname.includes("xn--")
                ) {

                    addSignal(
                        signals,

                        "Encoded internationalized domain",

                        "The domain contains punycode. Some legitimate websites use internationalized domains, but encoded domains can also be used in look-alike phishing links.",

                        "MEDIUM"
                    );

                }


                // -------------------------------------------------
                // EXCESSIVE SUBDOMAINS
                // -------------------------------------------------

                const parts =
                    hostname.split(".")
                        .filter(Boolean);

                if (
                    parts.length >= 4
                ) {

                    addSignal(
                        signals,

                        "Unusually complex domain",

                        "The domain contains several subdomain levels. This is not proof of fraud, but complex domains should be checked carefully before entering credentials or payment information.",

                        "MEDIUM"
                    );

                }


                // -------------------------------------------------
                // SHORTENED URL
                // -------------------------------------------------

                const shorteners = [
                    "bit.ly",
                    "tinyurl.com",
                    "t.co",
                    "is.gd",
                    "cutt.ly",
                    "shorturl.at",
                    "rebrand.ly",
                    "rb.gy"
                ];

                if (
                    shorteners.includes(
                        hostname
                    )
                ) {

                    addSignal(
                        signals,

                        "URL shortener detected",

                        "The link uses a URL-shortening service, which hides the final destination. Verify the destination independently before opening it.",

                        "MEDIUM"
                    );

                }


                // -------------------------------------------------
                // SUSPICIOUS PATH WORDS
                // -------------------------------------------------

                const suspiciousPathWords = [

                    "verify",
                    "verification",
                    "login",
                    "signin",
                    "secure",
                    "account",
                    "update",
                    "claim",
                    "reward",
                    "prize",
                    "bonus",
                    "refund",
                    "kyc",
                    "wallet",
                    "payment",
                    "password",
                    "otp",
                    "confirm"

                ];

                const pathMatches =
                    suspiciousPathWords.filter(
                        word =>
                            fullUrl.includes(
                                "/" + word
                            ) ||
                            fullUrl.includes(
                                "-" + word
                            ) ||
                            fullUrl.includes(
                                "_" + word
                            )
                    );

                if (
                    pathMatches.length >= 2
                ) {

                    addSignal(
                        signals,

                        "Sensitive-action URL",

                        "The link contains multiple terms associated with account access, verification, payment, rewards, or other sensitive actions. Verify the destination through an official source.",

                        "HIGH"
                    );

                }

            }
            catch {

                addSignal(
                    signals,

                    "Unusual link detected",

                    "A link was found but its structure could not be fully inspected. Treat unexpected links cautiously and verify the destination independently.",

                    "MEDIUM"
                );

            }

        }
    );

}


// =====================================================
// LOCAL FALLBACK DETECTOR
// =====================================================

function localScamDetector(
    cleanText,
    mode
) {

    const textLower =
        cleanText.toLowerCase();

    const signals = [];


    // =================================================
    // OTP
    // =================================================

    if (
        textLower.includes("otp") ||
        textLower.includes("one time password") ||
        textLower.includes("one-time password") ||
        textLower.includes("verification code") ||
        textLower.includes("verification otp") ||
        textLower.includes("security code")
    ) {

        addSignal(
            signals,

            "OTP or verification-code request",

            "The message mentions an OTP, verification code, or security code. These codes are intended to authenticate you and should never be shared with another person.",

            "CRITICAL"
        );

    }


    // =================================================
    // PASSWORD
    // =================================================

    if (
        textLower.includes("password") ||
        textLower.includes("passcode") ||
        textLower.includes("login credentials") ||
        textLower.includes("sign in details")
    ) {

        addSignal(
            signals,

            "Password or credential request",

            "The message appears to request a password, passcode, or login credentials. Do not provide authentication credentials through an unexpected message or link.",

            "CRITICAL"
        );

    }


    // =================================================
    // URGENCY
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "urgent",
                "immediately",
                "act now",
                "act immediately",
                "today only",
                "hurry",
                "last chance",
                "expires today",
                "expires soon",
                "within 24 hours",
                "within 1 hour",
                "limited time",
                "do it now",
                "respond now",
                "quickly",
                "as soon as possible"
            ]
        )
    ) {

        addSignal(
            signals,

            "Urgent or pressure-based language",

            "The message creates pressure to act quickly. Scammers commonly use urgency to reduce the time available for independent verification.",

            "HIGH"
        );

    }


    // =================================================
    // ACCOUNT THREAT
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "account will be blocked",
                "account will be closed",
                "account suspended",
                "account has been suspended",
                "account blocked",
                "your account",
                "verify your account",
                "verify account",
                "kyc",
                "kyc update",
                "kyc verification",
                "account verification",
                "bank account",
                "wallet suspended"
            ]
        )
    ) {

        addSignal(
            signals,

            "Account verification or threat",

            "The message refers to account verification, suspension, blocking, KYC, or another account-related consequence. Verify such requests through the organization's official app or website rather than the message link.",

            "HIGH"
        );

    }


    // =================================================
    // PRIZE / REWARD
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "prize",
                "reward",
                "winner",
                "lottery",
                "giveaway",
                "congratulations",
                "you won",
                "you have won",
                "won ₹",
                "cash prize",
                "cash reward",
                "lucky winner",
                "selected winner",
                "claim your prize",
                "claim reward",
                "free money",
                "bonus amount"
            ]
        )
    ) {

        addSignal(
            signals,

            "Prize or reward claim",

            "The message contains a prize, reward, lottery, giveaway, or unexpected-money claim. Unexpected financial rewards should be independently verified before any information or payment is provided.",

            "HIGH"
        );

    }


    // =================================================
    // PAYMENT / MONEY
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "payment",
                "pay now",
                "make payment",
                "send money",
                "transfer money",
                "transfer the money",
                "deposit",
                "registration fee",
                "registration fees",
                "processing fee",
                "verification fee",
                "security deposit",
                "pay a fee",
                "send ₹",
                "pay ₹",
                "upi",
                "upi id",
                "bank transfer",
                "wire transfer"
            ]
        )
    ) {

        addSignal(
            signals,

            "Payment or money request",

            "The message appears to request money, a payment, a fee, a deposit, or a financial transfer. Do not send money until the recipient and purpose have been independently verified.",

            "HIGH"
        );

    }


    // =================================================
    // CARD / BANK DETAILS
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "cvv",
                "card number",
                "debit card",
                "credit card",
                "expiry date",
                "expiration date",
                "bank details",
                "bank account number",
                "account number",
                "ifsc",
                "atm pin",
                "card pin",
                "pin number"
            ]
        )
    ) {

        addSignal(
            signals,

            "Bank or card information request",

            "The message refers to card, banking, PIN, CVV, or account information. Sensitive financial details should never be shared in response to an unexpected request.",

            "CRITICAL"
        );

    }


    // =================================================
    // PERSONAL INFORMATION
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "personal details",
                "personal information",
                "date of birth",
                "dob",
                "aadhaar",
                "aadhar",
                "pan number",
                "pan card",
                "passport number",
                "identity proof",
                "id proof"
            ]
        )
    ) {

        addSignal(
            signals,

            "Sensitive personal information request",

            "The message appears to request personal or identity information. Verify why the information is required and use only an official, trusted channel.",

            "CRITICAL"
        );

    }


    // =================================================
    // LINK / URL
    // =================================================

    if (
        extractUrls(cleanText).length > 0 ||
        containsAny(
            textLower,
            [
                "click this link",
                "click the link",
                "open this link",
                "tap this link",
                "visit this link",
                "click here",
                "tap here"
            ]
        )
    ) {

        addSignal(
            signals,

            "Link or URL detected",

            "The message contains a link or asks you to open one. Do not rely only on the message to decide whether a destination is trustworthy; verify the website independently.",

            "HIGH"
        );

    }


    // =================================================
    // URL STRUCTURE ANALYSIS
    // =================================================

    analyzeUrlPatterns(
        cleanText,
        signals
    );


    // =================================================
    // FAKE JOB / EASY MONEY
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "work-from-home",
                "work from home",
                "job offer",
                "job opportunity",
                "part time job",
                "part-time job",
                "earn money",
                "earn ₹",
                "easy money",
                "earn from home",
                "daily income",
                "weekly income",
                "guaranteed income",
                "no experience required",
                "registration fee for job",
                "pay to get job",
                "pay for interview"
            ]
        )
    ) {

        addSignal(
            signals,

            "Potentially suspicious job offer",

            "The message contains characteristics associated with unsolicited or unusually easy job offers. Verify the employer, role, contact details, and any requested fees through an independent source.",

            "HIGH"
        );

    }


    // =================================================
    // REFUND / TAX / GOVERNMENT IMPERSONATION
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "income tax refund",
                "tax refund",
                "refund pending",
                "government refund",
                "government payment",
                "customs",
                "custom duty",
                "parcel held",
                "police case",
                "legal action",
                "court notice",
                "fine payment"
            ]
        )
    ) {

        addSignal(
            signals,

            "Official-service or authority claim",

            "The message claims to involve a government service, tax refund, customs matter, legal action, or authority. Verify the claim directly through the organization's official website or known contact channel.",

            "HIGH"
        );

    }


    // =================================================
    // IMPERSONATION
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "customer care",
                "customer support",
                "support team",
                "bank manager",
                "bank officer",
                "official representative",
                "company representative",
                "hr manager",
                "police officer",
                "government officer"
            ]
        )
    ) {

        addSignal(
            signals,

            "Possible impersonation or authority claim",

            "The message presents itself as coming from an organization, employee, authority, or support representative. Verify the sender independently instead of trusting the identity claimed in the message.",

            "MEDIUM"
        );

    }


    // =================================================
    // CONTACT PRESSURE
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "call this number",
                "call me",
                "contact me immediately",
                "whatsapp me",
                "message me on whatsapp",
                "send screenshot",
                "share screenshot",
                "reply with"
            ]
        )
    ) {

        addSignal(
            signals,

            "Direct-contact or response pressure",

            "The message asks the recipient to move the conversation, call a number, send a screenshot, or reply directly. Verify the sender through an independent channel before responding.",

            "MEDIUM"
        );

    }


    // =================================================
    // TOO-GOOD-TO-BE-TRUE LANGUAGE
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "guaranteed",
                "risk free",
                "risk-free",
                "100% guaranteed",
                "instant money",
                "instant cash",
                "double your money",
                "double money",
                "no investment",
                "huge profit",
                "guaranteed profit",
                "free cash"
            ]
        )
    ) {

        addSignal(
            signals,

            "Unusually attractive promise",

            "The message makes unusually strong promises about money, rewards, profits, or guaranteed results. Verify the claim independently before taking action.",

            "HIGH"
        );

    }


    // =================================================
    // SCAM LANGUAGE
    // =================================================

    if (
        containsAny(
            textLower,
            [
                "secret code",
                "keep this confidential",
                "do not tell anyone",
                "don't tell anyone",
                "share the code",
                "send the code",
                "send otp",
                "tell me the otp"
            ]
        )
    ) {

        addSignal(
            signals,

            "Confidentiality or code-sharing request",

            "The message asks the recipient to keep information secret or share a security code. Requests to conceal a transaction or reveal authentication codes are strong warning signs.",

            "CRITICAL"
        );

    }


    // =================================================
    // CALCULATE LOCAL SCORE
    // =================================================

    let score = 0;

    signals.forEach(
        signal => {

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


    // =================================================
    // BONUS FOR MULTIPLE INDEPENDENT WARNING SIGNS
    // =================================================

    const criticalSignals =
        signals.filter(
            signal =>
                signal.severity === "CRITICAL"
        ).length;

    const highSignals =
        signals.filter(
            signal =>
                signal.severity === "HIGH"
        ).length;


    if (
        criticalSignals >= 1 &&
        highSignals >= 2
    ) {

        score += 10;

    }


    if (
        signals.length >= 4
    ) {

        score += 5;

    }


    // =================================================
    // MAXIMUM SCORE
    // =================================================

    score =
        Math.min(
            100,
            Math.max(
                0,
                Math.round(score)
            )
        );


    // =================================================
    // DETERMINE LOCAL RISK
    // =================================================

    let risk = "LOW";


    if (
        score >= 70
    ) {

        risk = "CRITICAL";

    }

    else if (
        score >= 45
    ) {

        risk = "HIGH";

    }

    else if (
        score >= 20
    ) {

        risk = "MEDIUM";

    }


    // =================================================
    // LOCAL SUMMARY
    // =================================================

    let summary;


    if (
        signals.length === 0
    ) {

        summary =
            "The local safety detector did not find obvious scam indicators in this input. This does not guarantee that the content is safe, so unexpected requests should still be independently verified.";

    }

    else {

        const signalNames =
            signals
                .slice(0, 3)
                .map(
                    signal =>
                        signal.title
                );

        summary =
            `The local safety detector identified ${signals.length} warning sign${signals.length === 1 ? "" : "s"}${signalNames.length > 0 ? `, including ${signalNames.join(", ")}` : ""}. These patterns can occur in scams, but the detector cannot prove the identity or intent of the sender.`;

    }


    // =================================================
    // LOCAL RECOMMENDED ACTION
    // =================================================

    let recommendedAction;


    const hasCritical =
        signals.some(
            signal =>
                signal.severity === "CRITICAL"
        );


    const hasPayment =
        signals.some(
            signal =>
                signal.title
                    .toLowerCase()
                    .includes("payment") ||
                signal.title
                    .toLowerCase()
                    .includes("money")
        );


    const hasLink =
        signals.some(
            signal =>
                signal.title
                    .toLowerCase()
                    .includes("link") ||
                signal.title
                    .toLowerCase()
                    .includes("url")
        );


    if (
        hasCritical &&
        hasPayment &&
        hasLink
    ) {

        recommendedAction =
            "Do not open the link or send money. Do not share OTPs, passwords, PINs, CVV, or other sensitive information. Verify the request through the organization's official website or a trusted contact method.";

    }

    else if (
        hasCritical
    ) {

        recommendedAction =
            "Do not share sensitive information or authentication codes. Stop the interaction and independently verify the request through an official source.";

    }

    else if (
        hasPayment
    ) {

        recommendedAction =
            "Do not send money or pay a fee yet. Verify the recipient, organization, and reason for payment through an independent official source.";

    }

    else if (
        hasLink
    ) {

        recommendedAction =
            "Do not open the link until you verify the destination independently. If you need the service, navigate to the organization's official website or app yourself.";

    }

    else if (
        signals.length > 0
    ) {

        recommendedAction =
            "Pause before responding. Do not share sensitive information or send money. Verify the sender and request independently using an official source.";

    }

    else {

        recommendedAction =
            "No obvious warning signs were detected by the local detector. Still remain cautious with unexpected messages, links, job offers, payment requests, and account notifications.";

    }


    // =================================================
    // FALLBACK LOGGING
    // =================================================

    console.log("");

    console.log(
        "🛡️ LOCAL FALLBACK ANALYSIS COMPLETE"
    );

    console.log(
        "--------------------------------"
    );

    console.log(
        "Source: Local Detector"
    );

    console.log(
        "Mode:",
        mode
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

    console.log(
        "--------------------------------"
    );


    // =================================================
    // RETURN FALLBACK RESULT
    // =================================================

    return {

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

    };

}


// =====================================================
// ANALYZE ROUTE
// =====================================================

app.post(
    "/analyze",
    async (req, res) => {

        console.log("");

        console.log(
            "📩 Analyze request received"
        );

        console.log(
            "================================"
        );


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

                success:
                    false,

                error:
                    "Please provide text to analyze."

            });

        }


        const cleanText =
            text.trim();


        if (
            cleanText.length > 5000
        ) {

            return res.status(400).json({

                success:
                    false,

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
- Password or credential requests
- CVV or card information requests
- Payment requests
- Registration fees
- Account threats
- Urgency or pressure
- Prize, lottery, reward, or giveaway claims
- Fake job offers
- Personal information requests
- Too-good-to-be-true promises
- Phishing
- Social engineering
- Requests to click links
- Requests to transfer money
- Requests for confidential information
- Suspicious domain names
- Suspicious URL paths
- HTTP instead of HTTPS
- IP-address-based URLs
- URL shorteners
- Excessive or unusual subdomains
- Suspicious URL keywords
- Account verification or KYC requests
- Impersonation of banks, companies, government agencies, or trusted organizations

IMPORTANT SIGNAL RULE:

Identify every distinct warning sign that is actually present in the input.

Do not stop after finding only one or two signals.

Each independent warning sign supported by the input should be represented as a separate signal.

For URLs, separately analyze applicable characteristics such as:
- suspicious domain wording
- suspicious path wording
- prize or reward terminology
- phishing or login terminology
- excessive subdomains
- IP address usage
- HTTP instead of HTTPS
- URL shortener usage
- unusual URL characters
- account verification wording
- payment-related wording
- claim or reward paths

For messages, separately analyze applicable characteristics such as:
- OTP or verification-code requests
- password or credential requests
- CVV or card information requests
- payment requests
- urgency
- threats
- prize or reward claims
- suspicious links
- sensitive-information requests
- fake job characteristics
- impersonation
- confidentiality requests

Only report signals that are supported by the actual input.

Do not invent warning signs just to increase the number of signals.

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

            for (
                let attempt = 1;
                attempt <= 3;
                attempt++
            ) {

                try {

                    console.log(
                        `🔄 Gemini attempt ${attempt}/3`
                    );


                    result =
                        await model.generateContent(
                            prompt
                        );


                    break;

                }

                catch (error) {

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

                    }

                    else {

                        // All other Gemini errors
                        // use local fallback

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
                    .replace(
                        /```json/gi,
                        ""
                    )
                    .replace(
                        /```/g,
                        ""
                    )
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

            }

            catch (jsonError) {

                console.error(
                    "❌ Gemini returned invalid JSON:"
                );

                console.error(
                    cleanedResponse
                );


                throw new Error(
                    "Gemini returned invalid JSON"
                );

            }


            // =================================================
            // NORMALIZE RISK
            // =================================================

            let risk =
                String(
                    analysis.risk ||
                    "LOW"
                ).toUpperCase();


            const validRisks = [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ];


            if (
                !validRisks.includes(
                    risk
                )
            ) {

                risk =
                    "LOW";

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

                score =
                    0;

            }


            score =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Math.round(
                            score
                        )
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
                    signal => {

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

                            severity =
                                "MEDIUM";

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

            console.log(
                "🎯 ANALYSIS COMPLETE"
            );

            console.log(
                "--------------------------------"
            );

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

            console.log(
                "--------------------------------"
            );


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


        // =====================================================
        // LOCAL FALLBACK ERROR HANDLING
        // =====================================================

        catch (error) {

            console.error("");

            console.error(
                "❌ Gemini analysis failed:"
            );

            console.error(
                error
            );


            console.log("");

            console.log(
                "⚠️ Gemini unavailable or returned invalid data."
            );

            console.log(
                "🛡️ Switching to local ScamShield fallback."
            );


            const fallbackResult =
                localScamDetector(
                    cleanText,
                    mode
                );


            return res.json(
                fallbackResult
            );

        }

    }
);


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