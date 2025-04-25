// Update line numbers for input box
function updateInputLineNumbers() {
    const input = document.getElementById("input");
    const lineNumbers = document.getElementById("lineNumbers");
    const lines = input.value.split("\n").length;

    lineNumbers.innerHTML = "";
    for (let i = 1; i <= lines; i++) {
        lineNumbers.innerHTML += i + "<br>";
    }
}

// Update line numbers for output box
function updateOutputLineNumbers() {
    const output = document.getElementById("output");
    const lineNumbersOutput = document.getElementById("lineNumbersOutput");
    const lines = output.value.split("\n").length;

    lineNumbersOutput.innerHTML = "";
    for (let i = 1; i <= lines; i++) {
        lineNumbersOutput.innerHTML += i + "<br>";
    }
}

// Sync scrolling between textarea and line number column
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

// Detect source language based on content
function detectSourceLanguage(code) {
    if (code.includes("printf") || code.includes("#include")) return "C";
    if (code.includes("print(") || code.includes("def ")) return "Python";
    return "Unknown";
}

// Convert code using the backend API
async function convertCode() {
    const input = document.getElementById("input").value;
    if (!input.trim()) {
        alert("Please enter some code to convert");
        return;
    }

    const targetLanguage = document.getElementById("langs").value;
    const outputTextarea = document.getElementById("output");
    const convertButton = document.getElementById("convert");
    const sourceLanguage = detectSourceLanguage(input);
    
    try {
        // Disable button and show loading state
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
            throw new Error('Server error');
        }
        
        const data = await response.json();
        outputTextarea.value = data.convertedCode;
        updateOutputLineNumbers();
    } catch (error) {
        console.error('Error:', error);
        outputTextarea.value = "Error converting code. Please try again.";
    } finally {
        // Re-enable button
        convertButton.disabled = false;
        convertButton.textContent = "Convert";
    }
}

// Copy output code to clipboard
function copyOutput() {
    const output = document.getElementById("output");
    navigator.clipboard.writeText(output.value)
        .then(() => alert("Code copied!"))
        .catch(() => alert("Failed to copy."));
}

// Allow tab indentation in textareas
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

// Hook events
document.addEventListener("DOMContentLoaded", () => {
    updateInputLineNumbers();
    updateOutputLineNumbers();
    
    document.getElementById("convert").addEventListener("click", convertCode);
    document.getElementById("copyBtn").addEventListener("click", copyOutput);
});

document.getElementById("input").addEventListener("input", updateInputLineNumbers);
document.getElementById("output").addEventListener("input", updateOutputLineNumbers);

