Couple's Connect: A WebRTC Video Chat Application

Couple's Connect is a modern, web-based video communication platform designed specifically for couples. It provides an intimate and feature-rich environment for partners to connect through a high-quality video call, enhanced with guided conversation features.

Live Demo: https://couples-connect.onrender.com/

✨ Core Features

Real-Time Video & Audio Chat: High-quality, low-latency video and audio streaming directly between two users using WebRTC.

Interactive Counseling Mode: A synchronized question feature to facilitate deep conversations, indicating whose turn it is to answer.

Polished User Interface (UI):

An elegant "idle screen" with a live clock before a call starts.

Decorative, animated frames around the video feeds.

A clean, dark-themed, and fully responsive layout.

Dynamic Video Swapping: An intuitive feature allowing users to swap the main video feed with the picture-in-picture view with a smooth animation.

🛠️ Technology Stack

The project utilizes a modern technology stack, separating frontend and backend responsibilities for a clean and scalable architecture.

Category

Technology

Description

Frontend

HTML5, CSS3, JavaScript (ES6+)

For structure, styling/animations, and client-side logic.

Real-Time API

WebRTC, WebSockets

For peer-to-peer video streaming and real-time signaling between clients and the server.

Backend

Python 3, FastAPI, Uvicorn

A high-performance Python framework and ASGI server for the WebSocket signaling logic.

Deployment

Render, Git, GitHub

Hosted on Render, with continuous deployment from a GitHub repository.

🚀 How It Works: The Project Flow

The application's architecture is built around a Signaling Server model to enable a direct, peer-to-peer WebRTC connection. This minimizes server load and ensures user privacy.

Initialization:

A user opens the web application.

The browser establishes a WebSocket connection to the Python backend, announcing the user is online.

The app requests camera/mic access, and the user's local video appears on the idle screen.

The Handshake (Signaling):

User A clicks "Start Call," generating a WebRTC "offer." This offer is sent to the server via WebSocket.

The server relays this offer to User B.

User B's browser receives the offer and generates an "answer," which is sent back to User A through the server.

During this, both browsers also exchange network path information (ICE Candidates) via the server.

Peer-to-Peer Connection:

Once the handshake is complete, both browsers have enough information to establish a direct, encrypted WebRTC connection to each other.

The video and audio stream directly between the users, and the server is no longer involved in the media stream.

Live Call:

The UI transitions from the idle screen to the main call interface.

In-call features like the "Counseling Mode" are synchronized between users using the persistent WebSocket connection for signaling.

本地设置和运行 (Local Setup & Run)

To run this project on your local machine, follow these steps:

Clone the repository:

git clone [https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git)
cd YOUR_REPOSITORY


Create and activate a Python virtual environment:

# For macOS/Linux
python3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
.\venv\Scripts\activate


Install the required dependencies:

pip install -r requirements.txt


Run the Uvicorn server:

uvicorn main:app --reload


Open your browser and navigate to http://127.0.0.1:8000. Open a second tab to simulate the other user.
