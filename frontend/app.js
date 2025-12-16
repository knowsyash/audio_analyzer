// Get elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const canvas = document.getElementById('visualizer');
const transcriptionDiv = document.getElementById('transcription');
const statusSpan = document.getElementById('status');

// Setup canvas
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 400;

// Audio context and variables
let audioContext;
let analyser;
let microphone;
let dataArray;
let bufferLength;
let animationId;
let mediaRecorder;
let socket;
let recognition; // Speech recognition

// Initialize audio visualizer
async function startAudioVisualizer() {
    try {
        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Setup audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        microphone.connect(analyser);
        
        // Setup browser speech recognition (FREE!)
        setupBrowserSpeechRecognition();
        
        // Start visualization
        visualize();
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Could not access microphone. Please grant permission.');
    }
}

// Circular frequency visualizer
function visualize() {
    animationId = requestAnimationFrame(visualize);
    
    analyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 120;
    const barCount = 64;
    
    for (let i = 0; i < barCount; i++) {
        const angle = (Math.PI * 2 * i) / barCount;
        const dataIndex = Math.floor((i * bufferLength) / barCount);
        const value = dataArray[dataIndex];
        
        // Calculate bar height with smooth animation
        const barHeight = (value / 255) * 80;
        
        // Start position (inner circle)
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        
        // End position (outer circle)
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);
        
        // Color gradient based on frequency
        const hue = (i / barCount) * 360;
        ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
        ctx.lineWidth = 4;
        
        // Draw bar
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.fill();
}

// Setup browser-based speech recognition (FREE - no backend needed!)
function setupBrowserSpeechRecognition() {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        statusSpan.textContent = 'Speech recognition not supported';
        statusSpan.style.color = '#e74c3c';
        transcriptionDiv.textContent = 'Your browser does not support speech recognition. Please use Chrome or Edge.';
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    statusSpan.textContent = 'Connected & Listening';
    statusSpan.style.color = '#27ae60';
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript) {
            // Add final transcription
            const span = document.createElement('span');
            span.textContent = finalTranscript;
            span.style.color = '#333';
            transcriptionDiv.appendChild(span);
            transcriptionDiv.scrollTop = transcriptionDiv.scrollHeight;
        }
        
        // Show interim results in real-time
        if (interimTranscript) {
            console.log('Interim:', interimTranscript);
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            console.log('No speech detected, continuing...');
        } else {
            statusSpan.textContent = 'Recognition Error';
            statusSpan.style.color = '#e74c3c';
        }
    };
    
    recognition.onend = () => {
        // Restart recognition if still recording
        if (!stopBtn.disabled) {
            recognition.start();
        }
    };
    
    recognition.start();
    console.log('Browser speech recognition started');
}

// Setup transcription with WebSocket (OLD METHOD - kept as backup)
function setupTranscription(stream) {
    statusSpan.textContent = 'Connecting...';
    statusSpan.style.color = '#f39c12';
    
    socket = new WebSocket('ws://localhost:8080/transcribe');
    
    socket.onopen = () => {
        console.log('Connected to transcription service');
        statusSpan.textContent = 'Connected & Listening';
        statusSpan.style.color = '#27ae60';
        
        // Setup media recorder to send audio chunks
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                console.log(`Sending audio chunk: ${event.data.size} bytes`);
                socket.send(event.data);
            }
        };
        
        // Send audio chunks every 500ms
        mediaRecorder.start(500);
        console.log('Media recorder started, sending chunks every 500ms');
    };
    
    socket.onmessage = (event) => {
        console.log('Received message:', event.data);
        const data = JSON.parse(event.data);
        if (data.text) {
            // Append new transcription
            const span = document.createElement('span');
            span.textContent = data.text + ' ';
            transcriptionDiv.appendChild(span);
            
            // Auto-scroll to bottom
            transcriptionDiv.scrollTop = transcriptionDiv.scrollHeight;
        }
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        statusSpan.textContent = 'Connection Error';
        statusSpan.style.color = '#e74c3c';
        transcriptionDiv.textContent = 'Transcription service unavailable. Running visualizer only.';
    };
    
    socket.onclose = () => {
        console.log('WebSocket closed');
        statusSpan.textContent = 'Disconnected';
        statusSpan.style.color = '#95a5a6';
    };
}

// Stop everything
function stopAudioVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    if (recognition) {
        recognition.stop();
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    
    if (socket) {
        socket.close();
    }
    
    if (microphone) {
        microphone.disconnect();
    }
    
    if (audioContext) {
        audioContext.close();
    }
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    statusSpan.textContent = 'Disconnected';
    statusSpan.style.color = '#95a5a6';
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
}

// Event listeners
startBtn.addEventListener('click', startAudioVisualizer);
stopBtn.addEventListener('click', stopAudioVisualizer);
