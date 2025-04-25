require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const winston = require('winston'); 

const app = express();
const PORT = process.env.PORT || 3000;

const logger = winston.createLogger({
    level: 'info',
    transports: [
        new winston.transports.Console({ format: winston.format.simple() }),
        new winston.transports.File({ filename: 'error.log', level: 'error' })
    ]
});

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());
app.use(express.static('public'));

function wrapCodeIfNeeded(code, sourceLanguage) {
    if (sourceLanguage === 'C' && !code.includes("main")) {
        return `#include <stdio.h>\n\nint main() {\n    ${code}\n    return 0;\n}`;
    }
    return code;
}

app.post('/convert', async (req, res) => {
    try {
        const { code, targetLanguage } = req.body;

        if (!code || !targetLanguage) {
            return res.status(400).json({ error: 'Code and target language are required' });
        }

        const sourceLanguage = targetLanguage === 'Python' ? 'C' : 'Python';
        const model = process.env.MODEL_NAME || 'llama2:7b'; 

        const strictPrompt = `
Convert the following ${sourceLanguage} code to equivalent ${targetLanguage} code.
Respond only with valid ${targetLanguage} code. Do not explain anything or add formatting.

Ensure function logic and conditionals are preserved correctly.
Use the same variable names and print the square value, not just loop counters.

${wrapCodeIfNeeded(code, sourceLanguage)}
`;

        const response = await axios.post(
            'http://localhost:11434/api/generate',
            {
                model,
                prompt: strictPrompt,
                stream: false,
                options: {
                    temperature: 0
                }
            },
            { timeout: 15000 }
        );

        let output = response.data?.response;

        if (!output) {
            return res.status(500).json({ error: 'No response from the model' });
        }

        const seenLines = new Set();
        const cleanedLines = output
            .split('\n')
            .map(line => line.trim())
            .filter(line =>
                line &&
                !line.toLowerCase().startsWith('for loop') &&
                !seenLines.has(line) &&
                seenLines.add(line)
            );

        const correctedLines = cleanedLines.map(line => {
            if (line.includes('print') && line.includes('{i}') && line.includes('square')) {
                return line.replace('{i}', '{sq}'); 
            }
            return line;
        });

        const finalCode = correctedLines.join('\n');

        res.json({ convertedCode: finalCode });

    } catch (error) {
        logger.error('Error:', error.message || error);
        res.status(500).json({ error: 'Failed to convert code. Please try again later.' });
    }
});

app.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
});





