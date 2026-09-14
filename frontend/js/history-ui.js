document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // SCAMSHIELD AI
    // HISTORY UI
    // =========================================================

    const historyList =
        document.getElementById("historyList");

    const historyEmpty =
        document.getElementById("historyEmpty");

    const clearHistoryButton =
        document.getElementById("clearHistoryButton");


    // =========================================================
    // SETTINGS
    // =========================================================

    const HISTORY_KEY =
        "scamshieldHistory";

    const MAX_HISTORY = 5;


    // =========================================================
    // LOAD HISTORY
    // =========================================================

    function getHistory() {

        try {

            const saved =
                localStorage.getItem(
                    HISTORY_KEY
                );

            if (!saved) {

                return [];

            }

            const parsed =
                JSON.parse(saved);

            if (!Array.isArray(parsed)) {

                return [];

            }

            return parsed.slice(
                0,
                MAX_HISTORY
            );

        }

        catch (error) {

            console.warn(
                "Could not load ScamShield history.",
                error
            );

            return [];

        }

    }


    // =========================================================
    // SAVE HISTORY
    // =========================================================

    function saveHistory(history) {

        try {

            localStorage.setItem(
                HISTORY_KEY,
                JSON.stringify(
                    history.slice(
                        0,
                        MAX_HISTORY
                    )
                )
            );

        }

        catch (error) {

            console.warn(
                "Could not save ScamShield history.",
                error
            );

        }

    }


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


        const valid =
            [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ];


        return valid.includes(value)
            ? value
            : "LOW";

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
    // SHORT TEXT
    // =========================================================

    function shortenText(
        text,
        maxLength = 100
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
    // EMPTY STATE
    // =========================================================

    function showEmptyState() {

        if (!historyList) {

            return;

        }


        historyList.innerHTML =
            "";


        if (historyEmpty) {

            historyEmpty.style.display =
                "flex";

        }

    }


    // =========================================================
    // HIDE EMPTY STATE
    // =========================================================

    function hideEmptyState() {

        if (historyEmpty) {

            historyEmpty.style.display =
                "none";

        }

    }


    // =========================================================
    // DISPLAY HISTORY
    // =========================================================

    function displayHistory() {

        if (!historyList) {

            console.warn(
                "ScamShield: historyList not found."
            );

            return;

        }


        const history =
            getHistory();


        if (
            history.length === 0
        ) {

            showEmptyState();

            return;

        }


        hideEmptyState();


        historyList.innerHTML =
            "";


        history.forEach(
            (item, index) => {

                const risk =
                    normalizeRisk(
                        item.risk
                    );


                const score =
                    normalizeScore(
                        item.score
                    );


                const mode =
                    item.mode === "url"
                        ? "URL"
                        : "MESSAGE";


                const text =
                    shortenText(
                        item.text
                    );


                const article =
                    document.createElement(
                        "article"
                    );


                article.className =
                    "history-item";


                article.tabIndex =
                    0;


                article.dataset.index =
                    index;


                article.innerHTML = `

                    <div class="history-index">
                        ${String(
                            index + 1
                        ).padStart(
                            2,
                            "0"
                        )}
                    </div>


                    <div class="history-main">

                        <div class="history-top">

                            <div class="history-type">

                                <span class="history-mode-icon">

                                    ${
                                        mode === "URL"
                                            ? "↗"
                                            : "✉"
                                    }

                                </span>

                                <span>
                                    ${mode}
                                </span>

                            </div>


                            <span
                                class="history-risk ${risk.toLowerCase()}"
                            >

                                ${risk}

                            </span>

                        </div>


                        <p class="history-text">

                            ${escapeHTML(
                                text
                            )}

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
                // CLICK ITEM
                // =================================================

                article.addEventListener(
                    "click",
                    () => {

                        restoreHistoryItem(
                            item
                        );

                    }
                );


                // =================================================
                // KEYBOARD
                // =================================================

                article.addEventListener(
                    "keydown",
                    (event) => {

                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {

                            event.preventDefault();

                            restoreHistoryItem(
                                item
                            );

                        }

                    }
                );


                historyList.appendChild(
                    article
                );

            }
        );

    }


    // =========================================================
    // RESTORE HISTORY ITEM
    // =========================================================

    function restoreHistoryItem(
        item
    ) {

        const input =
            document.getElementById(
                "scamInput"
            );


        if (!input) {

            return;

        }


        input.value =
            item.text || "";


        // Restore mode

        const mode =
            item.mode || "message";


        const tabs =
            document.querySelectorAll(
                ".analysis-tab"
            );


        tabs.forEach(
            (tab) => {

                tab.classList.toggle(
                    "active",
                    tab.dataset.mode === mode
                );

            }
        );


        // =====================================================
        // COUNTER
        // =====================================================

        const counter =
            document.getElementById(
                "charCounter"
            );


        if (counter) {

            counter.textContent =
                `${input.value.length} / 5000`;

        }


        // =====================================================
        // FOCUS
        // =====================================================

        input.focus();


        // =====================================================
        // SCROLL
        // =====================================================

        const analyzer =
            document.getElementById(
                "analyzer"
            );


        if (analyzer) {

            analyzer.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }

    }


    // =========================================================
    // CLEAR HISTORY
    // =========================================================

    if (clearHistoryButton) {

        clearHistoryButton.addEventListener(
            "click",
            () => {

                const history =
                    getHistory();


                if (
                    history.length === 0
                ) {

                    showHistoryNotice(
                        "There is no analysis history to clear."
                    );

                    return;

                }


                const confirmed =
                    window.confirm(
                        "Clear all ScamShield analysis history?"
                    );


                if (!confirmed) {

                    return;

                }


                try {

                    localStorage.removeItem(
                        HISTORY_KEY
                    );

                }

                catch (error) {

                    console.warn(
                        "Could not clear history.",
                        error
                    );

                }


                displayHistory();


                showHistoryNotice(
                    "Analysis history cleared."
                );

            }
        );

    }


    // =========================================================
    // NOTICE
    // =========================================================

    function showHistoryNotice(
        message
    ) {

        let notice =
            document.getElementById(
                "historyNotice"
            );


        if (!notice) {

            notice =
                document.createElement(
                    "div"
                );


            notice.id =
                "historyNotice";


            notice.className =
                "history-notice";


            const container =
                document.querySelector(
                    ".history-section"
                );


            if (container) {

                container.appendChild(
                    notice
                );

            }

            else {

                document.body.appendChild(
                    notice
                );

            }

        }


        notice.textContent =
            message;


        clearTimeout(
            notice._timer
        );


        notice._timer =
            setTimeout(
                () => {

                    if (
                        notice.parentNode
                    ) {

                        notice.remove();

                    }

                },
                3000
            );

    }


    // =========================================================
    // SYNC WHEN ANOTHER SCRIPT CHANGES STORAGE
    // =========================================================

    window.addEventListener(
        "storage",
        (event) => {

            if (
                event.key === HISTORY_KEY
            ) {

                displayHistory();

            }

        }
    );


    // =========================================================
    // INITIALIZE
    // =========================================================

    displayHistory();


    console.log(
        "📚 ScamShield history UI loaded."
    );

});