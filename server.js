const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

app.use(express.static('public')); 

function wrapCodeIfNeeded(code, sourceLanguage) {
    if (sourceLanguage === 'C' && !code.includes("main")) {
        return `#include <stdio.h>\n\nint main() {\n    ${code}\n    return 0;}\n`;
    }
    return code;
}

app.post('/convert', async (req, res) => {
    try {
        console.log('Request body received:', req.body);
        console.log('OPENROUTER_API_KEY status:', process.env.OPENROUTER_API_KEY ? 'Loaded' : 'NOT LOADED or EMPTY');

        const { code, targetLanguage } = req.body;

        if (!code || !targetLanguage) {
            console.error('Validation Error: Code or target language is missing from request body.', { code, targetLanguage });
            return res.status(400).json({ error: 'Code and target language are required' });
        }

        const sourceLanguage = targetLanguage === 'Python' ? 'C' : 'Python';

        const strictPrompt = `
Convert the following ${sourceLanguage} code to equivalent ${targetLanguage} code.
Respond only with valid ${targetLanguage} code. No extra explanation or comments.

Code:
${wrapCodeIfNeeded(code, sourceLanguage)}
`;
        console.log('Sending request to OpenRouter API...');
        console.log('Prompt being sent to OpenRouter:', strictPrompt);
        
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'deepseek/deepseek-r1-0528-qwen3-8b:free', 
                messages: [
                    { role: 'system', content: 'You are a code converter that strictly translates C ↔ Python.' },
                    { role: 'user', content: strictPrompt }
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 20000,
            }
        );
        console.log('Received successful response from OpenRouter API.');

        const output = response.data?.choices?.[0]?.message?.content;

        if (!output) {
            console.error('Error: No content received from AI model.', response.data);
            return res.status(500).json({ error: 'No response from AI model' });
        }

        const cleaned = output
            .split('\n')
            .map(line => line.trim())
            .filter((line, idx, self) => line && self.indexOf(line) === idx);

        res.json({ convertedCode: cleaned.join('\n') });

    } catch (error) {
        console.error('Conversion failed. Detailed error:', error);
        if (error.response) {
            console.error('Error Response Data:', error.response.data);
            console.error('Error Response Status:', error.response.status);
            console.error('Error Response Headers:', error.response.headers);
        } else if (error.request) {
            console.error('Error Request (no response received):', error.request);
            console.error('Check network connectivity or if OpenRouter API is down.');
        } else {
            console.error('Error Message:', error.message);
            console.error('This might be an issue with axios setup or request parameters.');
        }
        res.status(500).json({ error: 'Conversion failed. Please check server logs for details.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Static files served from 'public' directory.`);
});