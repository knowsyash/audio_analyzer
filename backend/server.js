const WebSocket = require('ws');
const http = require('http');
const https = require('https');
require('dotenv').config();

const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Create HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
    });
    res.end('Audio Transcription Service Running');
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
    server,
    path: '/transcribe'
});

console.log(`WebSocket server starting on port ${PORT}...`);

wss.on('connection', (ws) => {
    console.log('New client connected');
    
    let audioChunks = [];
    let processingTimer = null;
    
    ws.on('message', async (data) => {
        try {
            // Collect audio chunks
            audioChunks.push(data);
            console.log(`Received audio chunk: ${data.length} bytes. Total chunks: ${audioChunks.length}`);
            
            // Process immediately after collecting 3 chunks (more responsive)
            if (audioChunks.length >= 3) {
                console.log(`Processing ${audioChunks.length} audio chunks...`);
                await processAudioChunks(ws, [...audioChunks]);
                audioChunks = [];
            }
            
        } catch (error) {
            console.error('Error processing audio:', error);
            ws.send(JSON.stringify({ 
                error: 'Processing failed',
                text: ''
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        if (processingTimer) {
            clearTimeout(processingTimer);
        }
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Process accumulated audio chunks
async function processAudioChunks(ws, chunks) {
    try {
        // Combine chunks into single buffer
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const audioBuffer = Buffer.concat(chunks, totalLength);
        
        console.log(`Combined ${chunks.length} chunks into ${audioBuffer.length} bytes buffer`);
        
        // Mock transcription (since Gemini API integration requires specific setup)
        // In production, you'd send audioBuffer to Gemini API
        const mockTranscription = generateMockTranscription();
        
        console.log(`Sending transcription: "${mockTranscription}"`);
        
        // Send transcription back to client
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                text: mockTranscription,
                timestamp: new Date().toISOString()
            }));
        }
        
    } catch (error) {
        console.error('Error in processAudioChunks:', error);
        throw error;
    }
}

// Mock transcription generator for demo
// Replace this with actual Gemini API call in production
function generateMockTranscription() {
    const phrases = [
        'Hello, testing microphone.',
        'The audio quality is good.',
        'Real-time transcription working.',
        'This is a demo transcription.',
        'Speaking into the microphone now.',
        'System processing audio successfully.'
    ];
    
    return phrases[Math.floor(Math.random() * phrases.length)];
}

// Optional: Function to integrate with Gemini API (requires setup)
async function transcribeWithGemini(audioBuffer) {
    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not configured');
    }
    
    // Note: This is a placeholder for actual Gemini API integration
    // You would need to implement the proper API call here
    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    // Implementation would go here
    // For now, return mock data
    return generateMockTranscription();
}

// Start server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/transcribe`);
    console.log('Waiting for connections...');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
