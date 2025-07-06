    function updateLineNumbers(textarea, lineNumberElement) {
        const lines = textarea.value.split("\n").length;
        const fragment = document.createDocumentFragment();
        for (let i = 1; i <= lines; i++) {
            const lineNumber = document.createElement("div");
            lineNumber.textContent = i;
            fragment.appendChild(lineNumber);
        }
        lineNumberElement.innerHTML = "";
        lineNumberElement.appendChild(fragment);
    }

    function syncScroll(element) {
        const input = document.getElementById("input");
        const output = document.getElementById("output");
        const lineNumbers = document.getElementById("lineNumbers");
        const lineNumbersOutput = document.getElementById("lineNumbersOutput");

        if (element === input) {
            lineNumbers.scrollTop = input.scrollTop;
        } else if (element === output) {
            lineNumbersOutput.scrollTop = output.scrollTop;
        }
    }

    function detectSourceLanguage(code) {
        if (code.includes("printf") || code.includes("#include")) {
            return "C";
        }
        if (code.includes("print(") || code.includes("def ")) {
            return "Python";
        }
        return "Unknown";
    }

    async function convertCode() {
        const input = document.getElementById("input").value;
        if (!input.trim()) {
            console.error("Please enter some code to convert");
            return;
        }

        const targetLanguage = document.getElementById("langs").value;
        const outputTextarea = document.getElementById("output");
        const convertButton = document.getElementById("convert");
        const sourceLanguage = detectSourceLanguage(input);

        try {
            convertButton.disabled = true;
            convertButton.textContent = "Converting...";
            outputTextarea.value = "Processing...";

            const response = await fetch('http://localhost:3000/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: input,
                    targetLanguage: targetLanguage,
                    sourceLanguage: sourceLanguage
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'No JSON error message' }));
                throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorData.error || errorData.message}`);
            }

            const data = await response.json();
            outputTextarea.value = data.convertedCode;
            updateLineNumbers(outputTextarea, document.getElementById("lineNumbersOutput"));

        } catch (error) {
            console.error('Error during code conversion:', error);
            outputTextarea.value = "Error converting code. Please try again or check console for details.";
        } finally {
            convertButton.disabled = false;
            convertButton.textContent = "Convert";
        }
    }

    function copyOutput() {
        const output = document.getElementById("output");
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(output.value)
                .then(() => console.log("Code copied to clipboard!"))
                .catch(err => console.error("Failed to copy code to clipboard:", err));
        } else {
            output.select();
            try {
                document.execCommand('copy');
                console.log("Code copied to clipboard (using execCommand)!");
            } catch (err) {
                console.error("Failed to copy code to clipboard (execCommand fallback failed):", err);
            }
        }
    }

    document.querySelectorAll("textarea").forEach(area => {
        area.addEventListener("keydown", e => {
            if (e.key === "Tab") {
                e.preventDefault();
                const start = area.selectionStart;
                const end = area.selectionEnd;
                area.value = area.value.substring(0, start) + "    " + area.value.substring(end);
                area.selectionStart = area.selectionEnd = start + 4;
            }
        });
    });

    document.addEventListener("DOMContentLoaded", () => {
        const inputTextarea = document.getElementById("input");
        const outputTextarea = document.getElementById("output");

        updateLineNumbers(inputTextarea, document.getElementById("lineNumbers"));
        updateLineNumbers(outputTextarea, document.getElementById("lineNumbersOutput"));

        document.getElementById("convert").addEventListener("click", convertCode);

        const copyButton = document.getElementById("copyBtn");
        if (copyButton) {
            copyButton.addEventListener("click", copyOutput);
        }
    });

    document.getElementById("input").addEventListener("input", function() {
        updateLineNumbers(this, document.getElementById("lineNumbers"));
    });

    document.getElementById("output").addEventListener("input", function() {
        updateLineNumbers(this, document.getElementById("lineNumbersOutput"));
    });