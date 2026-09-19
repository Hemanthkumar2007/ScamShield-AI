document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // SCAMSHIELD AI
    // FRONTEND ANALYZER
    // =========================================================


    // =========================================================
    // ELEMENTS
    // =========================================================

    const input = document.getElementById("scamInput");
    const analyzeButton = document.getElementById("analyzeButton");
    const counter = document.getElementById("charCounter");

    const tabs = document.querySelectorAll(".analysis-tab");
    const exampleButtons = document.querySelectorAll(".example-chip");

    const historyList = document.getElementById("historyList");
    const historyEmpty = document.getElementById("historyEmpty");
    const clearHistoryButton =
        document.getElementById("clearHistoryButton");


    // =========================================================
    // BACKEND
    // =========================================================

    const BACKEND_URL = "https://scamshield-backend-y5rp.onrender.com";


    // =========================================================
    // HISTORY
    // =========================================================

    const HISTORY_KEY = "scamshieldHistory";
    const MAX_HISTORY = 5;

    let analysisHistory = [];

    let currentMode = "message";


    // =========================================================
    // LOAD HISTORY
    // =========================================================

    function loadHistory() {

        try {

            const saved =
                localStorage.getItem(HISTORY_KEY);

            if (!saved) {
                analysisHistory = [];
                return;
            }

            const parsed = JSON.parse(saved);

            if (Array.isArray(parsed)) {

                analysisHistory =
                    parsed.slice(0, MAX_HISTORY);

            } else {

                analysisHistory = [];

            }

        } catch (error) {

            console.warn(
                "Could not load history:",
                error
            );

            analysisHistory = [];

        }

    }


    // =========================================================
    // SAVE HISTORY
    // =========================================================

    function saveHistory() {

        try {

            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(analysisHistory)
            );

        } catch (error) {

            console.warn(
                "Could not save history:",
                error
            );

        }

    }


    // =========================================================
    // REQUIRED ELEMENT CHECK
    // =========================================================

    if (!input || !analyzeButton) {

        console.error(
            "ScamShield: Required analyzer elements not found."
        );

        return;

    }


    // =========================================================
    // CHARACTER COUNTER
    // =========================================================

    function updateCounter() {

        if (!counter) return;

        counter.textContent =
            `${input.value.length} / 5000`;

    }


    input.addEventListener(
        "input",
        updateCounter
    );

    updateCounter();


    // =========================================================
    // TAB SWITCHING
    // =========================================================

    tabs.forEach((tab) => {

        tab.addEventListener("click", () => {

            tabs.forEach((item) => {

                item.classList.remove("active");

            });

            tab.classList.add("active");

            currentMode =
                tab.dataset.mode || "message";

            input.value = "";

            updateCounter();


            if (currentMode === "url") {

                input.placeholder =
                    "Paste a suspicious URL here...\n\nExample: https://example.com/claim-reward";

            } else {

                input.placeholder =
                    "Paste the suspicious message, URL, job offer, prize notification or anything that feels wrong...";

            }

            input.focus();

        });

    });


    // =========================================================
    // EXAMPLE BUTTONS
    // =========================================================

    exampleButtons.forEach((button) => {

        button.addEventListener("click", () => {

            const example =
                button.dataset.example;


            if (example === "prize") {

                input.value =
`Congratulations! 🎉

You have been selected to receive ₹1,00,000.

Claim your reward IMMEDIATELY using the link below:

https://claim-reward.example

Send your OTP to complete verification.`;

            }


            else if (example === "otp") {

                input.value =
`URGENT!

Your bank account will be blocked today.

Verify your account immediately.

Click this link and enter the OTP sent to your phone.`;

            }


            else if (example === "job") {

                input.value =
`Congratulations!

Your profile has been selected for a work-from-home job.

Earn ₹50,000 per month.

Pay ₹999 registration fee to activate your account.

Send your personal details immediately.`;

            }


            else if (example === "url") {

                input.value =
                    "https://claim-prize-free.example.com";

            }


            updateCounter();

            input.focus();

        });

    });


    // =========================================================
    // ANALYZE
    // =========================================================

    analyzeButton.addEventListener(
        "click",
        async () => {

            const text =
                input.value.trim();


            // -------------------------------------------------
            // EMPTY INPUT
            // -------------------------------------------------

            if (!text) {

                showNotice(
                    "Please paste a suspicious message or URL first."
                );

                input.focus();

                return;

            }


            // -------------------------------------------------
            // LENGTH
            // -------------------------------------------------

            if (text.length > 5000) {

                showNotice(
                    "Please keep your input below 5000 characters."
                );

                return;

            }


            // -------------------------------------------------
            // LOADING
            // -------------------------------------------------

            setLoading(true);


            try {

                console.log(
                    "Sending analysis request..."
                );

                console.log(
                    "Mode:",
                    currentMode
                );


                // -------------------------------------------------
                // BACKEND REQUEST
                // -------------------------------------------------

                const response =
                    await fetch(
                        `${BACKEND_URL}/analyze`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                text: text,
                                mode: currentMode
                            })
                        }
                    );


                // -------------------------------------------------
                // JSON
                // -------------------------------------------------

                let data = null;

                try {

                    data =
                        await response.json();

                } catch (error) {

                    console.error(
                        "Invalid JSON from backend.",
                        error
                    );

                }


                // -------------------------------------------------
                // HTTP ERROR
                // -------------------------------------------------

                if (!response.ok) {

                    const backendMessage =
                        data?.error ||
                        data?.message ||
                        "";

                    throw new Error(
                        `Backend returned status ${response.status}` +
                        (
                            backendMessage
                                ? `: ${backendMessage}`
                                : ""
                        )
                    );

                }


                // -------------------------------------------------
                // EMPTY
                // -------------------------------------------------

                if (!data) {

                    throw new Error(
                        "Backend returned an empty response."
                    );

                }


                // -------------------------------------------------
                // SUCCESS
                // -------------------------------------------------

                if (!data.success) {

                    throw new Error(
                        data.error ||
                        "Backend analysis failed."
                    );

                }


                // -------------------------------------------------
                // NORMALIZE RISK
                // -------------------------------------------------

                let risk =
                    String(
                        data.risk || "LOW"
                    ).toUpperCase();

                const validRisks = [
                    "LOW",
                    "MEDIUM",
                    "HIGH",
                    "CRITICAL"
                ];

                if (!validRisks.includes(risk)) {

                    risk = "LOW";

                }


                // -------------------------------------------------
                // NORMALIZE SCORE
                // -------------------------------------------------

                let score =
                    Number(data.score);

                if (
                    Number.isNaN(score) ||
                    score < 0
                ) {

                    score = 0;

                }

                if (score > 100) {

                    score = 100;

                }

                score =
                    Math.round(score);


                // -------------------------------------------------
                // SIGNALS
                // -------------------------------------------------

                const signals =
                    Array.isArray(data.signals)
                        ? data.signals
                        : [];


                // -------------------------------------------------
                // FINAL RESULT
                // -------------------------------------------------

                const result = {

    source:
        data.source || "gemini",

    risk: risk,

    score: score,

    summary:
        data.summary ||
        "ScamShield AI analyzed this content for suspicious patterns.",

    signals: signals,

    recommendedAction:
        data.recommendedAction ||
        "Do not click suspicious links or share sensitive information. Verify the request independently."

};


                console.log(
                    "Analysis result:",
                    result
                );


                // -------------------------------------------------
                // DISPLAY
                // -------------------------------------------------

                displayResult(
                    result,
                    text
                );

            }


            catch (error) {

                console.error(
                    "ScamShield Error:",
                    error
                );


                const errorText =
                    String(
                        error?.message || ""
                    );


                let message =
                    "Something went wrong while analyzing.";
if (errorText.includes("429")) {
    message =
        "Gemini free quota is temporarily exhausted. Please wait and try again later.";
}

                if (
                    errorText.includes(
                        "Failed to fetch"
                    ) ||
                    errorText.includes(
                        "ERR_CONNECTION_REFUSED"
                    )
                ) {

                    message =
                        "Backend is not running. Start the ScamShield backend on port 3000.";

                }


                else if (
                    errorText.includes("503")
                ) {

                    message =
                        "AI service is temporarily busy. Please try again in a few seconds.";

                }


                else if (
    errorText.includes("500")
) {

    message =
        "Backend connected, but the AI analysis request failed. Check the backend terminal for the exact error.";

}


                else if (
                    errorText.includes("400")
                ) {

                    message =
                        "The backend rejected the request. Check the input and backend validation.";

                }


                showNotice(message);

            }


            finally {

                setLoading(false);

            }

        }
    );


    // =========================================================
    // LOADING BUTTON
    // =========================================================

    function setLoading(isLoading) {

        analyzeButton.disabled =
            isLoading;

        if (isLoading) {

            analyzeButton.innerHTML = `
                <span>ANALYZING</span>
                <strong class="loading-spinner">◌</strong>
            `;

        } else {

            analyzeButton.innerHTML = `
                <span>RUN ANALYSIS</span>
                <strong>↗</strong>
            `;

        }

    }


    // =========================================================
    // CTRL + ENTER
    // =========================================================

    input.addEventListener(
        "keydown",
        (event) => {

            if (
                event.ctrlKey &&
                event.key === "Enter"
            ) {

                event.preventDefault();

                analyzeButton.click();

            }

        }
    );


    // =========================================================
    // DISPLAY RESULT
    // =========================================================

    function displayResult(
        result,
        analyzedText
    ) {


        // =====================================================
        // SAVE HISTORY
        // =====================================================

        const historyItem = {
    text: analyzedText,
    risk: result.risk,
    score: result.score,
    source: result.source || "gemini",
    time: new Date().toLocaleTimeString(),
    mode: currentMode
};


        analysisHistory.unshift(
            historyItem
        );


        if (
            analysisHistory.length >
            MAX_HISTORY
        ) {

            analysisHistory =
                analysisHistory.slice(
                    0,
                    MAX_HISTORY
                );

        }


        saveHistory();


        // =====================================================
        // UPDATE HISTORY UI
        // =====================================================

        displayHistory();


        // =====================================================
        // RESULT PANEL
        // =====================================================

        let resultPanel =
            document.getElementById(
                "analysisResult"
            );


        if (!resultPanel) {

            resultPanel =
                document.createElement(
                    "div"
                );

            resultPanel.id =
                "analysisResult";

            resultPanel.className =
                "analysis-result";


            const analyzerShell =
                document.querySelector(
                    ".analyzer-shell"
                );


            if (analyzerShell) {

                analyzerShell.appendChild(
                    resultPanel
                );

            }

        }


        // =====================================================
        // RISK MESSAGE
        // =====================================================

        let riskMessage;


        switch (result.risk) {

            case "LOW":

                riskMessage =
                    "No major warning signs were detected.";

                break;


            case "MEDIUM":

                riskMessage =
                    "Some suspicious patterns were detected. Verify before interacting.";

                break;


            case "HIGH":

                riskMessage =
                    "Multiple warning signs were detected. Avoid interacting until verified.";

                break;


            case "CRITICAL":

                riskMessage =
                    "Several critical warning signs were detected. Do not interact with this request.";

                break;


            default:

                riskMessage =
                    "Analysis completed.";

        }


        // =====================================================
        // RESULT HTML
        // =====================================================

        let resultHTML = `

            <div class="result-header">

                <div>

                    <span class="result-label">
    SCAMSHIELD AI ANALYSIS
</span>

<span class="result-source">
    ${
        result.source === "local-fallback"
            ? "🛡️ SAFETY FALLBACK — LOCAL DETECTOR"
            : "🤖 AI ANALYSIS — GEMINI"
    }
</span>
<div class="analysis-status">
    ${
        result.source === "local-fallback"
            ? "Analysis completed using ScamShield's local safety detector."
            : "Analysis completed using Gemini AI with ScamShield safety rules."
    }
</div>

<h3>
                        ${escapeHTML(
                            getRiskTitle(result.risk)
                        )}
                    </h3>

                    <p class="result-summary">
                        ${escapeHTML(
                            riskMessage
                        )}
                    </p>

                </div>

                <div class="risk-badge ${result.risk.toLowerCase()}">

                    ${escapeHTML(
                        result.risk
                    )}

                </div>

            </div>


            <div class="ai-summary">

                <span>
                    WHY THIS IS RISKY
                </span>

                <p>
                    ${escapeHTML(
                        result.summary
                    )}
                </p>

            </div>


            <div class="risk-score-section">

                <div class="risk-score-top">

                    <span>
                        RISK SCORE
                    </span>

                    <strong>
                        ${result.score}/100
                    </strong>

                </div>


                <div class="risk-meter">

                    <div
                        class="risk-meter-fill ${result.risk.toLowerCase()}"
                        style="width:${result.score}%"
                    ></div>

                </div>


                <div class="risk-scale">

                    <span>LOW</span>

                    <span>MEDIUM</span>

                    <span>HIGH</span>

                    <span>CRITICAL</span>

                </div>

            </div>

        `;


        // =====================================================
        // SIGNALS
        // =====================================================

        if (
            result.signals.length === 0
        ) {

            resultHTML += `

                <div class="result-clean">

                    <div class="clean-icon">
                        ✓
                    </div>

                    <div>

                        <strong>
                            No obvious scam signals detected.
                        </strong>

                        <p>
                            This does not guarantee that the
                            message is legitimate. Always verify
                            unexpected requests independently.
                        </p>

                    </div>

                </div>

            `;

        }


        else {

            resultHTML += `

                <div class="signals-heading">

                    <span>
                        DETECTED WARNING SIGNALS
                    </span>

                    <strong>
                        ${result.signals.length}
                    </strong>

                </div>


                <div class="signals-list">

            `;


            result.signals.forEach(
                (signal, index) => {

                    const severity =
                        String(
                            signal?.severity ||
                            "MEDIUM"
                        ).toUpperCase();


                    const validSeverities = [
                        "LOW",
                        "MEDIUM",
                        "HIGH",
                        "CRITICAL"
                    ];


                    const safeSeverity =
                        validSeverities.includes(
                            severity
                        )
                            ? severity
                            : "MEDIUM";


                    const icon =
                        (
                            safeSeverity === "HIGH" ||
                            safeSeverity === "CRITICAL"
                        )
                            ? "!"
                            : "i";


                    resultHTML += `

                        <div class="detected-signal">

                            <div class="signal-icon">
                                ${icon}
                            </div>


                            <div class="signal-number">

                                ${String(
                                    index + 1
                                ).padStart(2, "0")}

                            </div>


                            <div class="signal-content">

                                <div class="signal-title-row">

                                    <strong>
                                        ${escapeHTML(
                                            signal?.title ||
                                            "Suspicious pattern"
                                        )}
                                    </strong>


                                    <span
                                        class="signal-severity ${safeSeverity.toLowerCase()}"
                                    >
                                        ${safeSeverity}
                                    </span>

                                </div>


                                <p>

                                    ${escapeHTML(
                                        signal?.description ||
                                        "This may indicate suspicious activity."
                                    )}

                                </p>

                            </div>

                        </div>

                    `;

                }
            );


            resultHTML += `

                </div>

            `;

        }


        // =====================================================
        // RECOMMENDED ACTION
        // =====================================================

        resultHTML += `

            <div class="recommended-action">

                <span>
                    RECOMMENDED ACTION
                </span>

                <strong>
                    ${escapeHTML(
                        result.recommendedAction
                    )}
                </strong>

            </div>


            <div class="result-footer">

                <span>
                    SCAMSHIELD AI
                </span>

                <span>
                    ANALYSIS COMPLETE
                </span>

            </div>

        `;


        // =====================================================
        // INSERT
        // =====================================================

        resultPanel.innerHTML =
            resultHTML;


        // =====================================================
        // ANIMATION
        // =====================================================

        resultPanel.classList.remove(
            "result-visible"
        );


        void resultPanel.offsetWidth;


        resultPanel.classList.add(
            "result-visible"
        );


        // =====================================================
        // SCROLL
        // =====================================================

        setTimeout(() => {

            resultPanel.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        }, 100);

    }


    // =========================================================
    // DISPLAY HISTORY
    // =========================================================

    function displayHistory() {

        if (!historyList) {

            console.warn(
                "History list element not found."
            );

            return;

        }


        // =====================================================
        // EMPTY
        // =====================================================

        if (
            analysisHistory.length === 0
        ) {

            historyList.innerHTML = "";


            if (historyEmpty) {

                historyEmpty.style.display =
                    "flex";

            }

            return;

        }


        // Hide empty state

        if (historyEmpty) {

            historyEmpty.style.display =
                "none";

        }


        // =====================================================
        // CLEAR OLD ITEMS
        // =====================================================

        historyList.innerHTML = "";


        // =====================================================
        // CREATE ITEMS
        // =====================================================

        analysisHistory.forEach(
            (item, index) => {


                const safeRisk =
                    validRisk(item.risk)
                        ? String(
                            item.risk
                        ).toUpperCase()
                        : "LOW";


                const safeMode =
                    item.mode === "url"
                        ? "URL"
                        : "MESSAGE";


                const score =
                    normalizeScore(
                        item.score
                    );


                const text =
                    shortenText(
                        item.text,
                        110
                    );


                const historyItem =
                    document.createElement(
                        "article"
                    );


                historyItem.className =
                    "history-item";


                // =================================================
                // HISTORY UI
                // =================================================

                historyItem.innerHTML = `

                    <div class="history-index">

                        ${String(
                            index + 1
                        ).padStart(2, "0")}

                    </div>


                    <div class="history-main">


                        <div class="history-top">

                            <div class="history-type">

                                <span class="history-mode-icon">
                                    ${safeMode === "URL" ? "↗" : "✉"}
                                </span>

                                <span>
                                    ${safeMode}
                                </span>

                            </div>


                            <span
                                class="history-risk ${safeRisk.toLowerCase()}"
                            >

                                ${safeRisk}

                            </span>

                        </div>


                        <p class="history-text">

                            ${escapeHTML(text)}

                        </p>


                        <div class="history-bottom">

                            <span>

                                SCORE

                                <strong>
                                    ${score}/100
                                </strong>

                            </span>


                            <span>

                                ${escapeHTML(
                                    item.time || ""
                                )}

                            </span>

                        </div>

                    </div>

                `;


                // =================================================
                // CLICK HISTORY ITEM
                // =================================================

                historyItem.addEventListener(
                    "click",
                    () => {

                        input.value =
                            item.text || "";

                        currentMode =
                            item.mode || "message";


                        tabs.forEach((tab) => {

                            tab.classList.toggle(
                                "active",
                                tab.dataset.mode ===
                                currentMode
                            );

                        });


                        updateCounter();

                        input.focus();

                        document
                            .getElementById("analyzer")
                            ?.scrollIntoView({
                                behavior: "smooth"
                            });

                    }
                );


                historyList.appendChild(
                    historyItem
                );

            }
        );

    }


    // =========================================================
    // CLEAR HISTORY
    // =========================================================

    if (clearHistoryButton) {

        clearHistoryButton.addEventListener(
            "click",
            () => {

                if (
                    analysisHistory.length === 0
                ) {

                    showNotice(
                        "There is no analysis history to clear."
                    );

                    return;

                }


                analysisHistory = [];


                try {

                    localStorage.removeItem(
                        HISTORY_KEY
                    );

                } catch (error) {

                    console.warn(
                        "Could not clear history.",
                        error
                    );

                }


                displayHistory();


                showNotice(
                    "Analysis history cleared."
                );

            }
        );

    }


    // =========================================================
    // RISK TITLE
    // =========================================================

    function getRiskTitle(risk) {

        switch (risk) {

            case "CRITICAL":
                return "CRITICAL RISK DETECTED";

            case "HIGH":
                return "HIGH RISK DETECTED";

            case "MEDIUM":
                return "MEDIUM RISK DETECTED";

            case "LOW":
            default:
                return "LOW RISK DETECTED";

        }

    }


    // =========================================================
    // VALID RISK
    // =========================================================

    function validRisk(risk) {

        return [
            "LOW",
            "MEDIUM",
            "HIGH",
            "CRITICAL"
        ].includes(
            String(
                risk || ""
            ).toUpperCase()
        );

    }


    // =========================================================
    // NORMALIZE SCORE
    // =========================================================

    function normalizeScore(score) {

        let value =
            Number(score);


        if (
            Number.isNaN(value) ||
            value < 0
        ) {

            value = 0;

        }


        if (value > 100) {

            value = 100;

        }


        return Math.round(value);

    }


    // =========================================================
    // SHORTEN TEXT
    // =========================================================

    function shortenText(
        text,
        maxLength
    ) {

        const value =
            String(
                text || ""
            );


        if (
            value.length <= maxLength
        ) {

            return value;

        }


        return (
            value.substring(
                0,
                maxLength
            ) + "..."
        );

    }


    // =========================================================
    // HTML ESCAPE
    // =========================================================

    function escapeHTML(value) {

        return String(
            value ?? ""
        )

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    // =========================================================
    // NOTICE
    // =========================================================

    function showNotice(message) {

        let notice =
            document.getElementById(
                "analyzerNotice"
            );


        if (!notice) {

            notice =
                document.createElement(
                    "div"
                );


            notice.id =
                "analyzerNotice";


            notice.className =
                "analyzer-notice";


            const shell =
                document.querySelector(
                    ".analyzer-shell"
                );


            if (shell) {

                shell.appendChild(
                    notice
                );

            } else {

                document.body.appendChild(
                    notice
                );

            }

        }


        notice.textContent =
            message;


        clearTimeout(
            notice._timeout
        );


        notice._timeout =
            setTimeout(
                () => {

                    if (
                        notice &&
                        notice.parentNode
                    ) {

                        notice.remove();

                    }

                },
                4000
            );

    }


    // =========================================================
    // INITIALIZE
    // =========================================================

    loadHistory();

    displayHistory();

    updateCounter();


    console.log(
        "🛡️ ScamShield AI Analyzer loaded successfully."
    );

    console.log(
        "🔗 Backend:",
        BACKEND_URL
    );

    console.log(
        "📚 Saved history:",
        analysisHistory.length
    );

});