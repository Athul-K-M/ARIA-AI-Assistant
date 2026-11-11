/* ==========================================
   A.R.I.A. OFFLINE ENGINE v1.0
   Local commands, notes, calculator and timer
========================================== */

window.ARIAOffline = (() => {

    const STORAGE_KEY = "aria_offline_notes";

    // Speak using the browser's local speech engine
    function speak(text) {
        if (!("speechSynthesis" in window)) return;

        window.speechSynthesis.cancel();

        const message = new SpeechSynthesisUtterance(text);
        message.rate = 1;
        message.pitch = 1;

        window.speechSynthesis.speak(message);
    }

    // Retrieve saved notes
    function getNotes() {
        try {
            return JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "[]"
            );
        } catch {
            return [];
        }
    }

    // Save notes locally
    function saveNote(note) {
        const notes = getNotes();

        notes.push({
            text: note,
            date: new Date().toLocaleString()
        });

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(notes)
        );
    }

    // Safe calculator using arithmetic parsing
    function calculate(expression) {

        expression = expression
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/[^0-9+\-*/().%\s]/g, "");

        let position = 0;

        function skipSpaces() {
            while (expression[position] === " ") position++;
        }

        function parseNumber() {
            skipSpaces();

            if (expression[position] === "+") {
                position++;
                return parseNumber();
            }

            if (expression[position] === "-") {
                position++;
                return -parseNumber();
            }

            if (expression[position] === "(") {
                position++;
                const value = parseExpression();
                skipSpaces();

                if (expression[position] !== ")") {
                    throw new Error("Invalid brackets");
                }

                position++;
                return value;
            }

            const match = expression
                .slice(position)
                .match(/^(?:\d+\.?\d*|\.\d+)/);

            if (!match) {
                throw new Error("Invalid number");
            }

            position += match[0].length;

            return Number(match[0]);
        }

        function parseTerm() {
            let value = parseNumber();

            while (true) {
                skipSpaces();

                const operator = expression[position];

                if (operator !== "*" &&
                    operator !== "/" &&
                    operator !== "%") break;

                position++;

                const next = parseNumber();

                if ((operator === "/" || operator === "%")
                    && next === 0) {
                    throw new Error("Cannot divide by zero");
                }

                if (operator === "*") value *= next;
                if (operator === "/") value /= next;
                if (operator === "%") value %= next;
            }

            return value;
        }

        function parseExpression() {
            let value = parseTerm();

            while (true) {
                skipSpaces();

                const operator = expression[position];

                if (operator !== "+" && operator !== "-") break;

                position++;

                const next = parseTerm();

                if (operator === "+") value += next;
                if (operator === "-") value -= next;
            }

            return value;
        }

        if (!expression.trim()) {
            throw new Error("No calculation provided");
        }

        const result = parseExpression();

        skipSpaces();

        if (position !== expression.length ||
            !Number.isFinite(result)) {
            throw new Error("Invalid calculation");
        }

        return result;
    }

    // Start a local timer
    function startTimer(seconds) {

        if (!Number.isFinite(seconds) ||
            seconds <= 0 ||
            seconds > 86400) {
            return "Please choose a timer between 1 second and 24 hours.";
        }

        setTimeout(() => {
            speak("Your timer has finished.");
            console.log("ARIA: Timer finished.");
        }, seconds * 1000);

        return `Timer started for ${seconds} seconds.`;
    }

    // App launching through supported web destinations
    function openApp(appName) {

        const apps = {
            youtube: "https://www.youtube.com/",
            google: "https://www.google.com/",
            github: "https://github.com/",
            wikipedia: "https://www.wikipedia.org/",
            spotify: "https://open.spotify.com/"
        };

        const key = appName.toLowerCase().trim();

        if (!apps[key]) {
            return `I don't have a supported destination for ${appName}.`;
        }

        window.open(apps[key], "_blank");

        return `Opening ${key}.`;
    }

    // Main command processor
    async function handleCommand(input) {

        const original = input.trim();
        const command = original.toLowerCase();

        if (!original) {
            return {
                handled: false
            };
        }

        let response = "";

        // GREETINGS
        if (/^(hello|hi|hey|hey aria)\b/.test(command)) {
            response = "Hello! A.R.I.A. offline systems are ready.";
        }

        // TIME
        else if (/\b(time|clock)\b/.test(command)) {
            response = `The current time is ${
                new Date().toLocaleTimeString()
            }.`;
        }

        // DATE
        else if (/\b(date|today|day)\b/.test(command)) {
            response = `Today is ${
                new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                })
            }.`;
        }

        // SAVE NOTE
        else if (
            command.startsWith("save a note") ||
            command.startsWith("save note") ||
            command.startsWith("remember")
        ) {
            const note = original
                .replace(/^(save a note|save note|remember)\s*/i, "")
                .trim();

            if (!note) {
                response = "What would you like me to remember?";
            } else {
                saveNote(note);
                response = "Your note has been saved locally.";
            }
        }

        // SHOW NOTES
        else if (
            command.includes("show my notes") ||
            command.includes("read my notes") ||
            command.includes("list my notes")
        ) {
            const notes = getNotes();

            if (notes.length === 0) {
                response = "You don't have any saved notes.";
            } else {
                response = "Here are your saved notes: " +
                    notes.map((note, index) =>
                        `${index + 1}. ${note.text}`
                    ).join(". ");
            }
        }

        // CLEAR NOTES
        else if (
            command === "clear my notes" ||
            command === "delete all notes"
        ) {
            localStorage.removeItem(STORAGE_KEY);
            response = "All locally saved notes have been cleared.";
        }

        // CALCULATOR
        else if (
            command.startsWith("calculate") ||
            command.startsWith("what is") ||
            command.startsWith("compute")
        ) {
            const expression = original
                .replace(/^(calculate|what is|compute)\s*/i, "")
                .trim();

            try {
                const result = calculate(expression);
                response = `The answer is ${result}.`;
            } catch {
                response = "I couldn't understand that calculation.";
            }
        }

        // TIMER
        else if (command.startsWith("set a timer for")) {

            const match = command.match(
                /set a timer for (\d+)\s*(second|seconds|minute|minutes|hour|hours)?/
            );

            if (!match) {
                response = "Please specify the timer duration.";
            } else {
                let seconds = Number(match[1]);
                const unit = match[2] || "seconds";

                if (unit.startsWith("minute")) seconds *= 60;
                if (unit.startsWith("hour")) seconds *= 3600;

                response = startTimer(seconds);
            }
        }

        // READ TEXT
        else if (command.startsWith("read aloud")) {

            const text = original
                .replace(/^read aloud\s*/i, "")
                .trim();

            if (!text) {
                response = "Please provide the text you want me to read.";
            } else {
                response = `Reading: ${text}`;
            }
        }

        // OPEN APP
        else if (command.startsWith("open ")) {
            const appName = original
                .replace(/^open\s+/i, "")
                .trim();

            response = openApp(appName);
        }

        // SYSTEM STATUS
        else if (
            command.includes("system status") ||
            command.includes("are you online") ||
            command.includes("are you offline")
        ) {
            response = navigator.onLine
                ? "Internet connection detected. Offline engine is ready."
                : "Currently offline. Local command engine is operational.";
        }

        // HELP
        else if (
            command === "help" ||
            command === "what can you do"
        ) {
            response =
                "I can tell you the time and date, calculate numbers, " +
                "save and read notes, start timers, read supplied text " +
                "aloud and open supported websites.";
        }

        // THANKS
        else if (/\b(thank you|thanks)\b/.test(command)) {
            response = "You're welcome. Always ready.";
        }

        // UNKNOWN COMMAND
        else {
            return {
                handled: false,
                response: "I don't recognize that offline command yet."
            };
        }

        return {
            handled: true,
            response: response,
            speak: true
        };
    }

    // Public offline engine
    return {
        handleCommand,
        getNotes,
        speak,
        calculate
    };

})();
