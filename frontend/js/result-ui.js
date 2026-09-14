document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // SCAMSHIELD AI
    // RESULT UI
    // =========================================================

    const resultPanel =
        document.getElementById("analysisResult");


    // =========================================================
    // RISK CONFIGURATION
    // =========================================================

    const riskConfig = {

        LOW: {
            title: "LOW RISK",
            message:
                "No major warning signs were detected.",
            icon: "✓"
        },

        MEDIUM: {
            title: "MEDIUM RISK",
            message:
                "Some suspicious patterns were detected. Verify before interacting.",
            icon: "!"
        },

        HIGH: {
            title: "HIGH RISK",
            message:
                "Multiple warning signs were detected. Avoid interacting until verified.",
            icon: "!"
        },

        CRITICAL: {
            title: "CRITICAL RISK",
            message:
                "Several critical warning signs were detected. Do not interact with this request.",
            icon: "!"
        }

    };


    // =========================================================
    // ESCAPE HTML
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
    // NORMALIZE RISK
    // =========================================================

    function normalizeRisk(risk) {

        const value =
            String(
                risk || "LOW"
            ).toUpperCase();


        if (
            riskConfig[value]
        ) {

            return value;

        }


        return "LOW";

    }


    // =========================================================
    // NORMALIZE SCORE
    // =========================================================

    function normalizeScore(score) {

        let value =
            Number(score);


        if (
            Number.isNaN(value)
        ) {

            value = 0;

        }


        value =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(value)
                )
            );


        return value;

    }


    // =========================================================
    // GET SCORE DESCRIPTION
    // =========================================================

    function getScoreDescription(
        score
    ) {

        if (
            score >= 70
        ) {

            return "Very high likelihood of scam indicators.";

        }


        if (
            score >= 45
        ) {

            return "Several suspicious indicators were detected.";

        }


        if (
            score >= 20
        ) {

            return "Some warning signs require verification.";

        }


        return "Few obvious warning signs were detected.";

    }


    // =========================================================
    // CREATE RESULT PANEL
    // =========================================================

    function createResultPanel() {

        let panel =
            document.getElementById(
                "analysisResult"
            );


        if (panel) {

            return panel;

        }


        const shell =
            document.querySelector(
                ".analyzer-shell"
            );


        if (!shell) {

            return null;

        }


        panel =
            document.createElement(
                "section"
            );


        panel.id =
            "analysisResult";


        panel.className =
            "analysis-result";


        shell.appendChild(
            panel
        );


        return panel;

    }


    // =========================================================
    // DISPLAY RESULT
    // =========================================================

    function renderResult(
        result
    ) {

        const panel =
            createResultPanel();


        if (!panel) {

            console.warn(
                "ScamShield: Result panel not found."
            );

            return;

        }


        const risk =
            normalizeRisk(
                result?.risk
            );


        const score =
            normalizeScore(
                result?.score
            );


        const config =
            riskConfig[risk];


        const summary =
            String(
                result?.summary ||
                "ScamShield AI analyzed this content for suspicious patterns."
            );


        const recommendedAction =
            String(
                result?.recommendedAction ||
                "Do not click suspicious links or share sensitive information. Verify the request independently."
            );


        const signals =
            Array.isArray(
                result?.signals
            )
                ? result.signals
                : [];


        // =====================================================
        // RESULT HEADER
        // =====================================================

        let html = `

            <div class="result-header">

                <div class="result-heading">

                    <span class="result-label">
                        SCAMSHIELD AI ANALYSIS
                    </span>

                    <h3>
                        ${escapeHTML(
                            config.title
                        )}
                    </h3>

                    <p class="result-summary">
                        ${escapeHTML(
                            config.message
                        )}
                    </p>

                </div>


                <div
                    class="risk-badge ${risk.toLowerCase()}"
                >

                    ${escapeHTML(
                        risk
                    )}

                </div>

            </div>


            <div class="ai-summary">

                <span>
                    WHY THIS IS RISKY
                </span>

                <p>
                    ${escapeHTML(
                        summary
                    )}
                </p>

            </div>


            <div class="risk-score-section">

                <div class="risk-score-top">

                    <span>
                        RISK SCORE
                    </span>

                    <strong>
                        ${score}/100
                    </strong>

                </div>


                <div
                    class="risk-meter"
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow="${score}"
                >

                    <div
                        class="risk-meter-fill ${risk.toLowerCase()}"
                        style="width: ${score}%"
                    ></div>

                </div>


                <div class="risk-scale">

                    <span>LOW</span>
                    <span>MEDIUM</span>
                    <span>HIGH</span>
                    <span>CRITICAL</span>

                </div>


                <p class="score-description">

                    ${escapeHTML(
                        getScoreDescription(
                            score
                        )
                    )}

                </p>

            </div>

        `;


        // =====================================================
        // SIGNALS
        // =====================================================

        if (
            signals.length === 0
        ) {

            html += `

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

            html += `

                <div class="signals-heading">

                    <span>
                        DETECTED WARNING SIGNALS
                    </span>

                    <strong>
                        ${signals.length}
                    </strong>

                </div>


                <div class="signals-list">

            `;


            signals.forEach(
                (signal, index) => {

                    const severity =
                        normalizeRisk(
                            signal?.severity
                        );


                    const icon =
                        (
                            severity === "HIGH" ||
                            severity === "CRITICAL"
                        )
                            ? "!"
                            : "i";


                    html += `

                        <article
                            class="detected-signal"
                        >

                            <div
                                class="signal-icon"
                            >

                                ${icon}

                            </div>


                            <div
                                class="signal-number"
                            >

                                ${String(
                                    index + 1
                                ).padStart(
                                    2,
                                    "0"
                                )}

                            </div>


                            <div
                                class="signal-content"
                            >

                                <div
                                    class="signal-title-row"
                                >

                                    <strong>

                                        ${escapeHTML(
                                            signal?.title ||
                                            "Suspicious pattern"
                                        )}

                                    </strong>


                                    <span
                                        class="signal-severity ${severity.toLowerCase()}"
                                    >

                                        ${escapeHTML(
                                            severity
                                        )}

                                    </span>

                                </div>


                                <p>

                                    ${escapeHTML(
                                        signal?.description ||
                                        "This may indicate suspicious activity."
                                    )}

                                </p>

                            </div>

                        </article>

                    `;

                }
            );


            html += `

                </div>

            `;

        }


        // =====================================================
        // RECOMMENDED ACTION
        // =====================================================

        html += `

            <div class="recommended-action">

                <span>
                    RECOMMENDED ACTION
                </span>

                <strong>
                    ${escapeHTML(
                        recommendedAction
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

        panel.innerHTML =
            html;


        // =====================================================
        // ANIMATION
        // =====================================================

        panel.classList.remove(
            "result-visible"
        );


        void panel.offsetWidth;


        panel.classList.add(
            "result-visible"
        );


        // =====================================================
        // SCROLL
        // =====================================================

        setTimeout(
            () => {

                panel.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            },
            100
        );

    }


    // =========================================================
    // LISTEN FOR RESULT EVENTS
    // =========================================================

    document.addEventListener(
        "scamshield:result",
        (event) => {

            if (
                event.detail
            ) {

                renderResult(
                    event.detail
                );

            }

        }
    );


    // =========================================================
    // GLOBAL ACCESS
    // =========================================================

    window.ScamShieldResultUI = {

        render:
            renderResult,

        normalizeRisk:
            normalizeRisk,

        normalizeScore:
            normalizeScore

    };


    // =========================================================
    // COMPLETE
    // =========================================================

    console.log(
        "📊 ScamShield result UI loaded."
    );

});