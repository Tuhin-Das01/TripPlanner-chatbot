// ============================================================
// VOYAGE AI
// Budget Travel Intelligence
// Frontend Controller
// ============================================================

// ============================================================
// 1. GET HTML ELEMENTS
// ============================================================

const questionInput = document.getElementById("question");
const planButton = document.getElementById("planBtn");

const pipelineStatus = document.getElementById("pipelineStatus");

const guardrailAgent = document.getElementById("guardrail");
const travelWebAgent = document.getElementById("travelweb");
const plannerAgent = document.getElementById("planner");
const reviewAgent = document.getElementById("review");
const reviserAgent = document.getElementById("reviser");

const traceBox = document.getElementById("traceBox");

const answerBadge = document.getElementById("answerBadge");
const decisionBox = document.getElementById("decision");
const revisionCount = document.getElementById("revisionCount");

const systemStatus = document.getElementById("systemStatus");
const feedbackBox = document.getElementById("feedbackBox");
const answerBox = document.getElementById("answerBox");

let isRunning = false;


// ============================================================
// 2. MARKDOWN CONFIGURATION
// ============================================================

if (typeof marked !== "undefined") {

    marked.setOptions({
        gfm: true,
        breaks: true
    });

    console.log("Markdown renderer: ACTIVE");

} else {

    console.error("Marked.js is not loaded.");

}


// ============================================================
// 3. INITIALIZE UI
// ============================================================

function initializeUI() {

    if (pipelineStatus) {
        pipelineStatus.textContent = "READY";
    }

    if (decisionBox) {
        decisionBox.textContent = "—";
    }

    if (revisionCount) {
        revisionCount.textContent = "0";
    }

    if (systemStatus) {
        systemStatus.textContent = "READY";
    }

    if (answerBadge) {

        answerBadge.textContent = "WAITING";

        answerBadge.className = "review-badge";
    }

    if (feedbackBox) {

        feedbackBox.textContent =
            "No review has been performed yet.";

    }

    if (answerBox) {

        answerBox.classList.add("empty-answer");

        answerBox.innerHTML = `
            <div class="answer-empty">

                <div class="answer-plane">
                    ✈
                </div>

                <h4>
                    Your itinerary will appear here
                </h4>

                <p>
                    Submit a destination to start
                    the travel planning agents.
                </p>

            </div>
        `;
    }

    resetAgents();
}


// ============================================================
// 4. RESET AGENTS
// ============================================================

function resetAgents() {

    const agents = [
        guardrailAgent,
        travelWebAgent,
        plannerAgent,
        reviewAgent,
        reviserAgent
    ];

    agents.forEach(agent => {

        if (!agent) {
            return;
        }

        agent.classList.remove(
            "active",
            "completed",
            "done",
            "error",
            "blocked",
            "revising"
        );

        const status =
            agent.querySelector(".agent-status");

        if (status) {
            status.textContent = "READY";
        }
    });
}


// ============================================================
// 5. UPDATE AGENT
// ============================================================

function updateAgent(agent, status, className = "") {

    if (!agent) {
        return;
    }

    agent.classList.remove(
        "active",
        "completed",
        "done",
        "error",
        "blocked",
        "revising"
    );

    if (className) {
        agent.classList.add(className);
    }

    const statusElement =
        agent.querySelector(".agent-status");

    if (statusElement) {
        statusElement.textContent = status;
    }
}


// ============================================================
// 6. BUILD TRIP
// ============================================================

async function buildTrip() {

    if (isRunning) {
        return;
    }

    if (!questionInput) {

        console.error(
            "Question input not found."
        );

        return;
    }

    const question =
        questionInput.value.trim();


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!question) {

        showError(
            "Please enter your travel request."
        );

        questionInput.focus();

        return;
    }


    if (question.length < 2) {

        showError(
            "Travel request must contain at least 2 characters."
        );

        questionInput.focus();

        return;
    }


    if (question.length > 300) {

        showError(
            "Travel request cannot exceed 300 characters."
        );

        return;
    }


    startLoading();


    try {

        console.log("====================================");
        console.log("✈ VOYAGE AI");
        console.log("Question:", question);


        // ----------------------------------------------------
        // REQUEST PAYLOAD
        // ----------------------------------------------------

        const payload = {
            query: question
        };


        console.log("Payload:", payload);


        // ----------------------------------------------------
        // API REQUEST
        // ----------------------------------------------------

        const response = await fetch(
            "/run",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body:
                    JSON.stringify(payload)
            }
        );


        console.log(
            "HTTP STATUS:",
            response.status
        );


        // ----------------------------------------------------
        // RESPONSE
        // ----------------------------------------------------

        let data;

        try {

            data =
                await response.json();

        } catch (error) {

            throw new Error(
                "Server returned invalid JSON."
            );
        }


        console.log(
            "API RESPONSE:",
            data
        );


        // ----------------------------------------------------
        // ERROR
        // ----------------------------------------------------

        if (!response.ok) {

            let message =
                "Request failed.";


            if (data && data.detail) {

                if (
                    typeof data.detail ===
                    "string"
                ) {

                    message =
                        data.detail;

                } else {

                    message =
                        JSON.stringify(
                            data.detail,
                            null,
                            2
                        );
                }
            }


            throw new Error(
                `${message} | HTTP ${response.status}`
            );
        }


        // ----------------------------------------------------
        // RENDER RESULT
        // ----------------------------------------------------

        renderResult(data);

    }

    catch (error) {

        console.error(
            "VOYAGE AI ERROR:",
            error
        );

        showError(
            error.message ||
            "Unable to connect to the server."
        );

    }

    finally {

        stopLoading();

    }
}


// ============================================================
// 7. START LOADING
// ============================================================

function startLoading() {

    isRunning = true;


    if (planButton) {

        planButton.disabled = true;

        planButton.innerHTML = `
            <span class="button-text">
                Planning...
            </span>

            <span class="button-icon">
                ✈
            </span>
        `;
    }


    if (pipelineStatus) {
        pipelineStatus.textContent = "RUNNING";
    }


    if (systemStatus) {
        systemStatus.textContent = "PROCESSING";
    }


    if (decisionBox) {

        decisionBox.textContent = "RUNNING";

        decisionBox.classList.remove(
            "approved",
            "approve",
            "revise",
            "blocked",
            "error"
        );
    }


    if (revisionCount) {
        revisionCount.textContent = "0";
    }


    if (feedbackBox) {

        feedbackBox.textContent =
            "Agents are processing your travel request...";
    }


    if (answerBox) {

        answerBox.classList.remove(
            "empty-answer"
        );

        answerBox.innerHTML = `
            <div class="answer-empty">

                <div class="answer-plane">
                    ✈
                </div>

                <h4>
                    Generating your itinerary...
                </h4>

                <p>
                    Researching hotels,
                    transport, food and activities.
                </p>

            </div>
        `;
    }


    if (traceBox) {

        traceBox.innerHTML = `
            <div class="trace-item active">

                <span class="trace-number">
                    01
                </span>

                <div class="trace-content">

                    <strong>
                        GUARDRAIL
                    </strong>

                    <small>
                        Validating travel request...
                    </small>

                </div>

                <span class="trace-status">
                    RUNNING
                </span>

            </div>
        `;
    }


    resetAgents();

    updateAgent(
        guardrailAgent,
        "RUNNING",
        "active"
    );
}


// ============================================================
// 8. STOP LOADING
// ============================================================

function stopLoading() {

    isRunning = false;


    if (planButton) {

        planButton.disabled = false;

        planButton.innerHTML = `
            <span class="button-text">
                Build itinerary
            </span>

            <span class="button-icon">
                ✈
            </span>
        `;
    }
}


// ============================================================
// 9. MARKDOWN RENDERER
// ============================================================

function renderMarkdown(markdown) {

    if (
        typeof markdown !== "string" ||
        markdown.trim() === ""
    ) {

        return `
            <p>
                No itinerary was generated.
            </p>
        `;
    }


    if (
        typeof marked !== "undefined" &&
        typeof marked.parse === "function"
    ) {

        return marked.parse(markdown);
    }


    // Fallback

    const safeText =
        markdown
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>");

    return `
        <p>
            ${safeText}
        </p>
    `;
}


// ============================================================
// 10. RENDER COMPLETE RESULT
// ============================================================

function renderResult(data) {

    console.log(
        "Rendering result:",
        data
    );


    // --------------------------------------------------------
    // BLOCKED
    // --------------------------------------------------------

    if (
        data.block === true ||
        data.blocked === true
    ) {

        renderBlocked(data);

        return;
    }


    // --------------------------------------------------------
    // FINAL ANSWER
    // --------------------------------------------------------

    const answer =
        data.final_answer || "";


    if (answerBox) {

        answerBox.classList.remove(
            "empty-answer"
        );


        // Markdown → HTML

        answerBox.innerHTML =
            renderMarkdown(answer);
    }


    // --------------------------------------------------------
    // DECISION
    // --------------------------------------------------------

    const finalDecision =
        data.final_decision || "—";


    if (decisionBox) {

        decisionBox.textContent =
            finalDecision;

        updateDecisionStyle(
            finalDecision
        );
    }


    // --------------------------------------------------------
    // ANSWER BADGE
    // --------------------------------------------------------

    if (answerBadge) {

        answerBadge.textContent =
            finalDecision;

        answerBadge.className =
            "review-badge";


        if (
            finalDecision ===
            "APPROVE"
        ) {

            answerBadge.classList.add(
                "approved"
            );

        } else if (
            finalDecision ===
            "REVISE"
        ) {

            answerBadge.classList.add(
                "revised"
            );
        }
    }


    // --------------------------------------------------------
    // REVISION COUNT
    // --------------------------------------------------------

    if (revisionCount) {

        revisionCount.textContent =
            data.revision_count ?? 0;
    }


    // --------------------------------------------------------
    // FEEDBACK
    // --------------------------------------------------------

    const feedback =
        data.final_feedback || "";


    if (feedbackBox) {

        if (
            feedback.trim() !== ""
        ) {

            feedbackBox.innerHTML =
                renderMarkdown(feedback);

        } else {

            feedbackBox.textContent =
                "No additional review notes.";
        }
    }


    // --------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------

    if (
        Array.isArray(data.events)
    ) {

        renderEvents(
            data.events
        );

        animatePipelineFromEvents(
            data.events
        );

    } else {

        clearTrace();
    }


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (pipelineStatus) {
        pipelineStatus.textContent =
            "COMPLETED";
    }


    if (systemStatus) {
        systemStatus.textContent =
            "SUCCESS";
    }


    hideError();


    // --------------------------------------------------------
    // SCROLL TO RESULT
    // --------------------------------------------------------

    setTimeout(
        () => {

            if (answerBox) {

                answerBox.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }

        },
        300
    );
}


// ============================================================
// 11. RENDER EVENTS
// ============================================================

function renderEvents(events) {

    if (!traceBox) {
        return;
    }


    traceBox.innerHTML = "";


    if (
        !Array.isArray(events) ||
        events.length === 0
    ) {

        clearTrace();

        return;
    }


    events.forEach(
        (event, index) => {

            if (
                !event ||
                typeof event !== "object"
            ) {
                return;
            }


            const agent =
                typeof event.agent === "string"
                    ? event.agent
                    : "unknown";


            const agentName =
                formatAgentName(agent);


            let status = "DONE";


            if (
                event.blocked === true
            ) {

                status = "BLOCKED";

            } else if (
                event.decision === "REVISE"
            ) {

                status = "REVISE";

            } else if (
                event.decision === "APPROVE"
            ) {

                status = "APPROVED";
            }


            const item =
                document.createElement("div");

            item.className =
                "trace-item";


            const number =
                document.createElement("span");

            number.className =
                "trace-number";

            number.textContent =
                String(index + 1)
                    .padStart(2, "0");


            const content =
                document.createElement("div");

            content.className =
                "trace-content";


            const title =
                document.createElement("strong");

            title.textContent =
                agentName;


            const description =
                document.createElement("small");

            description.textContent =
                getEventDescription(
                    agent,
                    event
                );


            content.appendChild(title);
            content.appendChild(description);


            const statusElement =
                document.createElement("span");

            statusElement.className =
                "trace-status";

            statusElement.textContent =
                status;


            item.appendChild(number);
            item.appendChild(content);
            item.appendChild(statusElement);


            traceBox.appendChild(item);
        }
    );
}


// ============================================================
// 12. EVENT DESCRIPTION
// ============================================================

function getEventDescription(
    agent,
    event
) {

    switch (agent) {

        case "guardrail":

            if (
                event.blocked === true
            ) {

                return (
                    "Travel request blocked by safety guardrail."
                );
            }

            return (
                "Safety validation completed successfully."
            );


        case "travelweb":

            return (
                "Live travel web research completed."
            );


        case "planner":

            return (
                "Budget-friendly itinerary generated."
            );


        case "review":

            if (
                typeof event.feedback === "string" &&
                event.feedback.trim() !== ""
            ) {

                return event.feedback;
            }

            return (
                "Budget review completed."
            );


        case "reviser":

            return (
                "Itinerary revised using reviewer feedback."
            );


        default:

            return (
                "Agent completed processing."
            );
    }
}


// ============================================================
// 13. FORMAT AGENT NAME
// ============================================================

function formatAgentName(agent) {

    const names = {

        guardrail: "GUARDRAIL",

        travelweb: "TRAVEL WEB",

        planner: "PLANNER",

        review: "REVIEWER",

        reviser: "REVISER"
    };


    return (
        names[agent] ||
        agent.toUpperCase()
    );
}


// ============================================================
// 14. PIPELINE ANIMATION
// ============================================================

function animatePipelineFromEvents(events) {

    if (
        !Array.isArray(events)
    ) {
        return;
    }


    resetAgents();


    events.forEach(
        event => {

            if (
                !event ||
                typeof event !== "object"
            ) {
                return;
            }


            const agent =
                event.agent;


            let element = null;


            switch (agent) {

                case "guardrail":
                    element = guardrailAgent;
                    break;

                case "travelweb":
                    element = travelWebAgent;
                    break;

                case "planner":
                    element = plannerAgent;
                    break;

                case "review":
                    element = reviewAgent;
                    break;

                case "reviser":
                    element = reviserAgent;
                    break;
            }


            if (!element) {
                return;
            }


            if (
                event.blocked === true
            ) {

                updateAgent(
                    element,
                    "BLOCKED",
                    "blocked"
                );

                return;
            }


            if (
                event.decision === "REVISE"
            ) {

                updateAgent(
                    element,
                    "REVISE",
                    "revising"
                );

                return;
            }


            if (
                event.decision === "APPROVE"
            ) {

                updateAgent(
                    element,
                    "APPROVED",
                    "completed"
                );

                return;
            }


            updateAgent(
                element,
                "DONE",
                "completed"
            );
        }
    );
}


// ============================================================
// 15. BLOCKED REQUEST
// ============================================================

function renderBlocked(data) {

    if (decisionBox) {

        decisionBox.textContent =
            "BLOCKED";

        updateDecisionStyle(
            "BLOCKED"
        );
    }


    if (answerBadge) {

        answerBadge.textContent =
            "BLOCKED";

        answerBadge.className =
            "review-badge blocked";
    }


    if (revisionCount) {
        revisionCount.textContent = "0";
    }


    if (systemStatus) {
        systemStatus.textContent = "BLOCKED";
    }


    if (feedbackBox) {

        feedbackBox.textContent =
            "Request stopped by the safety guardrail.";
    }


    if (answerBox) {

        answerBox.classList.remove(
            "empty-answer"
        );

        answerBox.innerHTML =
            renderMarkdown(
                data.final_answer ||
                "I can't help with this request."
            );
    }


    if (pipelineStatus) {
        pipelineStatus.textContent = "BLOCKED";
    }


    resetAgents();


    updateAgent(
        guardrailAgent,
        "BLOCKED",
        "blocked"
    );


    if (traceBox) {

        traceBox.innerHTML = `
            <div class="trace-item blocked">

                <span class="trace-number">
                    01
                </span>

                <div class="trace-content">

                    <strong>
                        GUARDRAIL
                    </strong>

                    <small>
                        Request blocked for safety.
                    </small>

                </div>

                <span class="trace-status">
                    BLOCKED
                </span>

            </div>
        `;
    }


    hideError();
}


// ============================================================
// 16. DECISION STYLE
// ============================================================

function updateDecisionStyle(value) {

    if (!decisionBox) {
        return;
    }


    decisionBox.classList.remove(
        "approved",
        "approve",
        "revise",
        "blocked",
        "error"
    );


    if (
        value === "APPROVE"
    ) {

        decisionBox.classList.add(
            "approved"
        );

    } else if (
        value === "REVISE"
    ) {

        decisionBox.classList.add(
            "revise"
        );

    } else if (
        value === "BLOCKED"
    ) {

        decisionBox.classList.add(
            "blocked"
        );

    } else if (
        value === "ERROR"
    ) {

        decisionBox.classList.add(
            "error"
        );
    }
}


// ============================================================
// 17. ERROR
// ============================================================

function showError(message) {

    console.error(
        "Voyage AI Error:",
        message
    );


    if (pipelineStatus) {
        pipelineStatus.textContent =
            "ERROR";
    }


    if (systemStatus) {
        systemStatus.textContent =
            "ERROR";
    }


    if (decisionBox) {

        decisionBox.textContent =
            "ERROR";

        updateDecisionStyle(
            "ERROR"
        );
    }


    if (answerBadge) {

        answerBadge.textContent =
            "ERROR";

        answerBadge.className =
            "review-badge error";
    }


    if (feedbackBox) {
        feedbackBox.textContent =
            message;
    }


    if (answerBox) {

        answerBox.classList.remove(
            "empty-answer"
        );

        answerBox.textContent =
            "Please give me your trip details";
    }


    resetAgents();


    if (traceBox) {

        traceBox.innerHTML = "";


        const item =
            document.createElement("div");

        item.className =
            "trace-item error";


        const number =
            document.createElement("span");

        number.className =
            "trace-number";

        number.textContent =
            "!";


        const content =
            document.createElement("div");

        content.className =
            "trace-content";


        const title =
            document.createElement("strong");

        title.textContent =
            "SYSTEM ERROR";


        const description =
            document.createElement("small");

        description.textContent =
            message;


        content.appendChild(title);
        content.appendChild(description);


        const status =
            document.createElement("span");

        status.className =
            "trace-status";

        status.textContent =
            "ERROR";


        item.appendChild(number);
        item.appendChild(content);
        item.appendChild(status);


        traceBox.appendChild(item);
    }
}


// ============================================================
// 18. HIDE ERROR
// ============================================================

function hideError() {

    console.log(
        "No frontend error."
    );
}


// ============================================================
// 19. CLEAR TRACE
// ============================================================

function clearTrace() {

    if (!traceBox) {
        return;
    }


    traceBox.innerHTML = `
        <div class="empty-trace">

            <div class="empty-symbol">
                ⌁
            </div>

            <span>
                No agent activity.
            </span>

        </div>
    `;
}


// ============================================================
// 20. CTRL + ENTER
// ============================================================

if (questionInput) {

    questionInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                event.ctrlKey
            ) {

                event.preventDefault();

                buildTrip();
            }
        }
    );
}


// ============================================================
// 21. BUILD BUTTON
// ============================================================

if (planButton) {

    planButton.addEventListener(
        "click",
        buildTrip
    );
}


// ============================================================
// 22. SAMPLE BUTTONS
// ============================================================

const sampleButtons =
    document.querySelectorAll(
        ".sample-btn"
    );


sampleButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            function() {

                const query =
                    button.dataset.query ||
                    button.textContent.trim();


                if (
                    questionInput &&
                    query
                ) {

                    questionInput.value =
                        query;

                    questionInput.focus();
                }
            }
        );
    }
);


// ============================================================
// 23. DATA-TRIP BUTTONS
// ============================================================

const tripButtons =
    document.querySelectorAll(
        "[data-trip]"
    );


tripButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            function() {

                const query =
                    button.dataset.trip;


                if (
                    questionInput &&
                    query
                ) {

                    questionInput.value =
                        query;

                    questionInput.focus();
                }
            }
        );
    }
);


// ============================================================
// 24. INITIALIZE
// ============================================================

initializeUI();


// ============================================================
// 25. FINAL LOG
// ============================================================

console.log(
    "✈ VOYAGE AI READY"
);