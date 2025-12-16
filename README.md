# Audio Equalizer & Transcription MVP

A minimal fullstack application with a circular audio equalizer visualizer and real-time transcription service.

## Project Structure

```
webd/
├── frontend/
│   ├── index.html          # Main HTML page
│   ├── style.css           # Styling
│   └── app.js              # Audio visualization & WebSocket client
└── backend/
    ├── server.js           # WebSocket server for transcription
    ├── package.json        # Node dependencies
    └── .env.example        # Environment variables template
```

## Features

### Frontend
- ✅ Circular frequency visualizer (60 FPS smooth animation)
- ✅ MediaStream API for microphone access
- ✅ Web Audio API with AnalyserNode
- ✅ Real-time audio visualization with gradient colors
- ✅ WebSocket client for streaming audio chunks
- ✅ Live transcription display

### Backend
- ✅ WebSocket server (ws library)
- ✅ Accepts audio chunks in small continuous streams
- ✅ Low-latency processing
- ✅ Mock transcription (ready for Gemini API integration)
- ✅ Efficient resource usage

## Setup & Run

### Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file (optional for mock mode):
```bash
copy .env.example .env
```

4. Start the server:
```bash
npm start
```

Server runs on `http://localhost:8080`

### Frontend Setup

1. Open `frontend/index.html` directly in a modern browser (Chrome/Edge recommended)
   
   OR use a local server:
```bash
cd frontend
python -m http.server 3000
```

2. Grant microphone permissions when prompted

3. Click "Start Microphone" to begin

## Usage

1. Start the backend server first
2. Open the frontend in your browser
3. Click "Start Microphone" button
4. Allow microphone access
5. Speak into your microphone
6. Watch the circular visualizer react to your voice
7. See transcription appear in the box below (mock data for demo)

## Technical Details

### Audio Processing
- FFT Size: 256
- Sample Rate: Default (usually 48kHz)
- Visualization: 64 bars in circular arrangement
- Animation: 60 FPS using requestAnimationFrame
- Audio chunks sent every 500ms

### WebSocket Protocol
- Endpoint: `ws://localhost:8080/transcribe`
- Format: Binary audio chunks (webm/opus)
- Response: JSON with transcription text

### Mock Transcription
Currently uses mock data for demonstration. To integrate with Gemini API:
1. Add your Gemini API key to `.env`
2. Implement the `transcribeWithGemini()` function in `server.js`
3. Replace mock generator with actual API calls

## Browser Compatibility

- Chrome 80+
- Edge 80+
- Firefox 76+ (with getUserMedia support)
- Safari 14+ (with WebRTC support)

## Performance Notes

- Handles network fluctuations gracefully
- Debounced processing (1 second intervals)
- Efficient memory usage with buffer management
- No buffering - immediate forwarding to backend

## Future Enhancements

- Actual Gemini API integration for real transcription
- Volume control slider
- Different visualizer modes
- Export transcription to text file
- Audio recording save feature

## License

MIT
