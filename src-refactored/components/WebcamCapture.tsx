/**
 * Siliceo: CandleTest Core - Webcam Capture Component
 * Copyright (C) 2025 Progetto Siliceo - Alfonso Riva
 * 
 * This file is part of Siliceo.
 * Licensed under AGPL v3.0
 * 
 * Gives AI agents the ability to "see" through the user's webcam
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { Attachment } from '../types';

interface WebcamCaptureProps {
    onCapture: (attachment: Attachment) => void;
    onClose: () => void;
}

export const WebcamCapture: React.FC<WebcamCaptureProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Start webcam stream
    const startWebcam = useCallback(async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user', // Front camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                setStream(mediaStream);
                setIsStreaming(true);
            }
        } catch (err) {
            console.error('Error accessing webcam:', err);
            setError('Impossibile accedere alla webcam. Verifica i permessi.');
        }
    }, []);

    // Stop webcam stream
    const stopWebcam = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsStreaming(false);
        }
    }, [stream]);

    // Capture frame from video
    const captureFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to base64 JPEG (80% quality for smaller size)
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataUrl);

        // Pause video to show captured frame
        video.pause();
    }, []);

    // Retake photo
    const retake = useCallback(() => {
        setCapturedImage(null);
        if (videoRef.current) {
            videoRef.current.play();
        }
    }, []);

    // Send captured image
    const sendImage = useCallback(() => {
        if (!capturedImage) return;

        // Send full data URL - API will parse it for different providers
        // Format: data:image/jpeg;base64,<data>
        const attachment: Attachment = {
            name: `webcam_${Date.now()}.jpg`,
            type: 'image',
            content: capturedImage  // Full data URL, API handles parsing
        };

        onCapture(attachment);
        stopWebcam();
        onClose();
    }, [capturedImage, onCapture, stopWebcam, onClose]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Auto-start webcam on mount
    useEffect(() => {
        startWebcam();
    }, [startWebcam]);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        📷 Webcam - Visione AI
                    </h2>
                    <button
                        onClick={() => { stopWebcam(); onClose(); }}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Error message */}
                {error && (
                    <div className="bg-red-500/20 text-red-300 p-4 rounded-lg mb-4">
                        ⚠️ {error}
                    </div>
                )}

                {/* Video / Captured Image */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                    {capturedImage ? (
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-contain"
                        />
                    )}

                    {/* Loading overlay */}
                    {!isStreaming && !error && !capturedImage && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-white animate-pulse">
                                🎥 Attivazione webcam...
                            </div>
                        </div>
                    )}
                </div>

                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Controls */}
                <div className="flex justify-center gap-4">
                    {!capturedImage ? (
                        <button
                            onClick={captureFrame}
                            disabled={!isStreaming}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 
                                     text-white font-bold rounded-full transition-all 
                                     flex items-center gap-2"
                        >
                            📸 Cattura
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={retake}
                                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 
                                         text-white font-bold rounded-full transition-all"
                            >
                                🔄 Riprova
                            </button>
                            <button
                                onClick={sendImage}
                                className="px-6 py-3 bg-green-600 hover:bg-green-700 
                                         text-white font-bold rounded-full transition-all 
                                         flex items-center gap-2"
                            >
                                ✨ Invia all'AI
                            </button>
                        </>
                    )}
                </div>

                {/* Help text */}
                <p className="text-gray-400 text-sm text-center mt-4">
                    L'AI analizzerà l'immagine e descriverà cosa vede 👁️
                </p>
            </div>
        </div>
    );
};

export default WebcamCapture;
