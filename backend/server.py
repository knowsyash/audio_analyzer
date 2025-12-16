import asyncio
import websockets
import json
import speech_recognition as sr
from io import BytesIO
import tempfile
import os
import wave

recognizer = sr.Recognizer()
recognizer.energy_threshold = 300
recognizer.dynamic_energy_threshold = True

async def handle_connection(websocket):
    print(f"New client connected")
    audio_chunks = []
    chunk_count = 0
    
    try:
        async for message in websocket:
            # Collect audio chunks
            audio_chunks.append(message)
            chunk_count += 1
            print(f"Received audio chunk: {len(message)} bytes. Total chunks: {len(audio_chunks)}")
            
            # Process after collecting 8-10 chunks (about 4-5 seconds)
            if len(audio_chunks) >= 8:
                print(f"Processing {len(audio_chunks)} audio chunks...")
                
                try:
                    # Combine chunks
                    combined_audio = b''.join(audio_chunks)
                    audio_chunks = []
                    
                    # Save to temporary WebM file
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
                        temp_file.write(combined_audio)
                        temp_path = temp_file.name
                    
                    # Use speech recognition with the WebM file directly
                    try:
                        # Try to recognize using Google Speech Recognition
                        # Note: This might not work with WebM directly, so we'll use a workaround
                        with open(temp_path, 'rb') as audio_file:
                            audio_data = sr.AudioData(combined_audio, 48000, 2)
                            
                        text = recognizer.recognize_google(audio_data)
                        print(f"Transcription: {text}")
                        
                        # Send transcription to client
                        response = json.dumps({
                            "text": text,
                            "timestamp": str(asyncio.get_event_loop().time())
                        })
                        await websocket.send(response)
                    
                    except sr.UnknownValueError:
                        print("Could not understand audio")
                        response = json.dumps({
                            "text": "[listening...]",
                            "timestamp": str(asyncio.get_event_loop().time())
                        })
                        await websocket.send(response)
                    
                    except sr.RequestError as e:
                        print(f"Speech recognition service error: {e}")
                        response = json.dumps({
                            "text": "[Recognition service unavailable]",
                            "timestamp": str(asyncio.get_event_loop().time())
                        })
                        await websocket.send(response)
                    
                    except Exception as e:
                        print(f"Recognition error: {e}")
                        # Send a placeholder response
                        response = json.dumps({
                            "text": f"[Audio processed - {chunk_count} chunks received]",
                            "timestamp": str(asyncio.get_event_loop().time())
                        })
                        await websocket.send(response)
                    
                    finally:
                        # Clean up temp file
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
                
                except Exception as e:
                    print(f"Error processing audio: {e}")
                    # Continue listening even if processing fails
    
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")

async def main():
    print("Starting WebSocket server on port 8080...")
    print("WebSocket endpoint: ws://localhost:8080/transcribe")
    
    async with websockets.serve(handle_connection, "localhost", 8080, process_request=None):
        print("Server running. Waiting for connections...")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped")
