document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // SCAMSHIELD AI
    // ANALYSER UI
    // =========================================================


    // =========================================================
    // ELEMENTS
    // =========================================================

    const input =
        document.getElementById("scamInput");

    const analyzeButton =
        document.getElementById("analyzeButton");

    const tabs =
        document.querySelectorAll(".analysis-tab");

    const exampleButtons =
        document.querySelectorAll(".example-chip");

    const analyzer =
        document.getElementById("analyzer");

    const resultPanel =
        document.getElementById("analysisResult");


    // =========================================================
    // CHECK
    // =========================================================

    if (!input) {

        console.warn(
            "ScamShield UI: scamInput not found."
        );

        return;

    }


    // =========================================================
    // INPUT FOCUS
    // =========================================================

    input.addEventListener("focus", () => {

        const wrapper =
            input.closest(
                ".input-wrapper, .analyzer-input, .input-area"
            );

        if (wrapper) {

            wrapper.classList.add(
                "input-focused"
            );

        }

    });


    input.addEventListener("blur", () => {

        const wrapper =
            input.closest(
                ".input-wrapper, .analyzer-input, .input-area"
            );

        if (wrapper) {

            wrapper.classList.remove(
                "input-focused"
            );

        }

    });


    // =========================================================
    // AUTO RESIZE TEXTAREA
    // =========================================================

    function resizeInput() {

        if (
            input.tagName !== "TEXTAREA"
        ) {

            return;

        }

        input.style.height =
            "auto";

        input.style.height =
            Math.min(
                input.scrollHeight,
                320
            ) + "px";

    }


    input.addEventListener(
        "input",
        resizeInput
    );


    resizeInput();


    // =========================================================
    // TAB UI
    // =========================================================

    tabs.forEach((tab) => {

        tab.addEventListener(
            "click",
            () => {

                tabs.forEach(
                    (item) => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                tab.classList.add(
                    "active"
                );


                const mode =
                    tab.dataset.mode ||
                    "message";


                updateInputForMode(
                    mode
                );

            }
        );

    });


    // =========================================================
    // UPDATE INPUT FOR MODE
    // =========================================================

    function updateInputForMode(
        mode
    ) {

        if (mode === "url") {

            input.placeholder =
                "Paste a suspicious URL here...";

        }

        else {

            input.placeholder =
                "Paste the suspicious message, URL, job offer, prize notification or anything that feels wrong...";

        }


        resizeInput();

    }


    // =========================================================
    // EXAMPLE BUTTONS
    // =========================================================

    exampleButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const example =
                        button.dataset.example;


                    let text = "";


                    switch (example) {

                        case "prize":

                            text =
`Congratulations! 🎉

You have been selected to receive ₹1,00,000.

Claim your reward immediately using this link:

https://claim-reward.example

Send your OTP to complete verification.`;

                            break;


                        case "otp":

                            text =
`URGENT!

Your bank account will be blocked today.

Verify your account immediately.

Click this link and enter the OTP sent to your phone.`;

                            break;


                        case "job":

                            text =
`Congratulations!

Your profile has been selected for a work-from-home job.

Earn ₹50,000 per month.

Pay ₹999 registration fee to activate your account.

Send your personal details immediately.`;

                            break;


                        case "url":

                            text =
                                "https://claim-prize-free.example.com";

                            break;


                        default:

                            text = "";

                    }


                    if (!text) {

                        return;

                    }


                    input.value =
                        text;


                    resizeInput();


                    input.focus();


                    // Small visual feedback

                    button.classList.add(
                        "selected"
                    );


                    setTimeout(
                        () => {

                            button.classList.remove(
                                "selected"
                            );

                        },
                        250
                    );

                }
            );

        }
    );


    // =========================================================
    // ANALYZE BUTTON VISUAL STATE
    // =========================================================

    if (analyzeButton) {

        analyzeButton.addEventListener(
            "mouseenter",
            () => {

                if (
                    !analyzeButton.disabled
                ) {

                    analyzeButton.classList.add(
                        "ready"
                    );

                }

            }
        );


        analyzeButton.addEventListener(
            "mouseleave",
            () => {

                analyzeButton.classList.remove(
                    "ready"
                );

            }
        );

    }


    // =========================================================
    // KEYBOARD SHORTCUT
    // =========================================================

    input.addEventListener(
        "keydown",
        (event) => {

            if (
                event.ctrlKey &&
                event.key === "Enter"
            ) {

                event.preventDefault();

                if (
                    analyzeButton &&
                    !analyzeButton.disabled
                ) {

                    analyzeButton.click();

                }

            }

        }
    );


    // =========================================================
    // RESULT OBSERVER
    // =========================================================

    function observeResult() {

        const panel =
            document.getElementById(
                "analysisResult"
            );

        if (!panel) {

            return;

        }


        panel.classList.add(
            "analyser-result-ready"
        );


        setTimeout(
            () => {

                panel.classList.add(
                    "analyser-result-visible"
                );

            },
            50
        );

    }


    // =========================================================
    // WATCH FOR RESULT CREATION
    // =========================================================

    const analyzerShell =
        document.querySelector(
            ".analyzer-shell"
        );


    if (analyzerShell) {

        const observer =
            new MutationObserver(
                () => {

                    observeResult();

                }
            );


        observer.observe(
            analyzerShell,
            {
                childList: true,
                subtree: true
            }
        );

    }


    // =========================================================
    // SCROLL TO RESULT
    // =========================================================

    document.addEventListener(
        "click",
        (event) => {

            const target =
                event.target.closest(
                    "[data-scroll-result]"
                );


            if (!target) {

                return;

            }


            const result =
                document.getElementById(
                    "analysisResult"
                );


            if (result) {

                result.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }

        }
    );


    // =========================================================
    // INITIAL STATE
    // =========================================================

    const activeTab =
        document.querySelector(
            ".analysis-tab.active"
        );


    if (activeTab) {

        updateInputForMode(
            activeTab.dataset.mode ||
            "message"
        );

    }


    // =========================================================
    // DONE
    // =========================================================

    console.log(
        "🎨 ScamShield analyser UI loaded."
    );

});