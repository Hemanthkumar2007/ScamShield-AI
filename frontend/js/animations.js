document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // SCAMSHIELD AI
    // ANIMATIONS
    // =========================================================


    // =========================================================
    // PAGE REVEAL
    // =========================================================

    const revealElements =
        document.querySelectorAll(
            ".hero, .analyzer-shell, .history-section, .feature-card, .example-chip"
        );


    revealElements.forEach((element, index) => {

        element.classList.add(
            "scroll-reveal"
        );

        element.style.transitionDelay =
            `${Math.min(index * 60, 400)}ms`;

    });


    // =========================================================
    // INTERSECTION OBSERVER
    // =========================================================

    const observer =
        new IntersectionObserver(
            (entries) => {

                entries.forEach(
                    (entry) => {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target.classList.add(
                                "visible"
                            );

                            observer.unobserve(
                                entry.target
                            );

                        }

                    }
                );

            },
            {
                threshold: 0.12
            }
        );


    revealElements.forEach(
        (element) => {

            observer.observe(
                element
            );

        }
    );


    // =========================================================
    // BUTTON PRESS EFFECT
    // =========================================================

    const buttons =
        document.querySelectorAll(
            "button"
        );


    buttons.forEach(
        (button) => {

            button.addEventListener(
                "mousedown",
                () => {

                    button.classList.add(
                        "button-pressed"
                    );

                }
            );


            button.addEventListener(
                "mouseup",
                () => {

                    button.classList.remove(
                        "button-pressed"
                    );

                }
            );


            button.addEventListener(
                "mouseleave",
                () => {

                    button.classList.remove(
                        "button-pressed"
                    );

                }
            );

        }
    );


    // =========================================================
    // SMOOTH INTERNAL LINKS
    // =========================================================

    const links =
        document.querySelectorAll(
            'a[href^="#"]'
        );


    links.forEach(
        (link) => {

            link.addEventListener(
                "click",
                (event) => {

                    const targetId =
                        link.getAttribute(
                            "href"
                        );


                    if (
                        !targetId ||
                        targetId === "#"
                    ) {

                        return;

                    }


                    const target =
                        document.querySelector(
                            targetId
                        );


                    if (!target) {

                        return;

                    }


                    event.preventDefault();


                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }
            );

        }
    );


    // =========================================================
    // HEADER SCROLL STATE
    // =========================================================

    const header =
        document.querySelector(
            "header"
        );


    function updateHeader() {

        if (!header) {

            return;

        }


        if (
            window.scrollY > 30
        ) {

            header.classList.add(
                "header-scrolled"
            );

        }

        else {

            header.classList.remove(
                "header-scrolled"
            );

        }

    }


    window.addEventListener(
        "scroll",
        updateHeader,
        {
            passive: true
        }
    );


    updateHeader();


    // =========================================================
    // HOVER TILT FOR CARDS
    // =========================================================

    const cards =
        document.querySelectorAll(
            ".feature-card"
        );


    cards.forEach(
        (card) => {

            card.addEventListener(
                "mousemove",
                (event) => {

                    const rect =
                        card.getBoundingClientRect();


                    const x =
                        event.clientX -
                        rect.left;


                    const y =
                        event.clientY -
                        rect.top;


                    const centerX =
                        rect.width / 2;


                    const centerY =
                        rect.height / 2;


                    const rotateX =
                        ((y - centerY) /
                            centerY) *
                        -2;


                    const rotateY =
                        ((x - centerX) /
                            centerX) *
                        2;


                    card.style.transform =
                        `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

                }
            );


            card.addEventListener(
                "mouseleave",
                () => {

                    card.style.transform =
                        "";

                }
            );

        }
    );


    // =========================================================
    // RESULT APPEAR ANIMATION
    // =========================================================

    const resultObserver =
        new MutationObserver(
            () => {

                const result =
                    document.getElementById(
                        "analysisResult"
                    );


                if (!result) {

                    return;

                }


                result.classList.add(
                    "result-animation-ready"
                );


                requestAnimationFrame(
                    () => {

                        result.classList.add(
                            "result-animation-visible"
                        );

                    }
                );

            }
        );


    const analyzerShell =
        document.querySelector(
            ".analyzer-shell"
        );


    if (analyzerShell) {

        resultObserver.observe(
            analyzerShell,
            {
                childList: true,
                subtree: true
            }
        );

    }


    // =========================================================
    // SCROLL PROGRESS
    // =========================================================

    function updateScrollProgress() {

        const scrollTop =
            window.scrollY;


        const documentHeight =
            document.documentElement
                .scrollHeight -
            window.innerHeight;


        if (
            documentHeight <= 0
        ) {

            return;

        }


        const progress =
            (scrollTop /
                documentHeight) *
            100;


        document.documentElement.style
            .setProperty(
                "--scroll-progress",
                `${progress}%`
            );

    }


    window.addEventListener(
        "scroll",
        updateScrollProgress,
        {
            passive: true
        }
    );


    updateScrollProgress();


    // =========================================================
    // ACCESSIBILITY
    // =========================================================

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape"
            ) {

                document
                    .activeElement
                    ?.blur();

            }

        }
    );


    // =========================================================
    // COMPLETE
    // =========================================================

    console.log(
        "✨ ScamShield animations loaded."
    );

});