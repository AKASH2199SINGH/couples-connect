// --- 1. DOM ELEMENTS ---
const homeScreen = document.getElementById('home-screen');
const callContainer = document.getElementById('call-container');
const createMeetingBtn = document.getElementById('create-meeting-btn');
const copyLinkBtn = document.getElementById('copy-link-btn');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const localVideoFrame = document.getElementById('local-video-frame');
const remoteVideoFrame = document.getElementById('main-video-frame');
const idleScreen = document.getElementById('idle-screen');
const clockElement = document.getElementById('clock');
const notification = document.getElementById('notification');

// Control Buttons
const micButton = document.getElementById('micButton');
const cameraButton = document.getElementById('cameraButton');
const questionsButton = document.getElementById('questionsButton');
const endCallButton = document.getElementById('endCallButton');

// Question Box
const questionBox = document.getElementById('question-box');
const questionTurn = document.getElementById('question-turn');
const questionText = document.getElementById('question-text');

// --- 2. GLOBAL VARIABLES ---
let localStream;
let peerConnection;
let websocket;
let isCallInitiator = false;
let signalingQueue = [];
let isStreamReady = false;
let meetingId = '';

let questionModeActive = false;
let isMyTurn = false;
let currentQuestionIndex = 0;

// Reliable TURN server configuration
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

// --- Counseling Questions ---
const counselingQuestions = [
    "What is one small thing I can do this week to make you feel more loved?",
    "What's a recent memory of us that made you really happy?",
    "Is there anything I've done recently that unknowingly hurt you?",
    "What is one of your biggest fears for our future?",
    "What is one of your biggest dreams for our future?",
    "How can I be a better listener for you?",
    "What does 'romance' mean to you, and how can we have more of it?",
    "What's something you feel we're really good at as a couple?",
    "What's one area where you feel we could improve as a team?",
    "If you could relive one day of our relationship, which one would it be and why?",
    "What's a simple, everyday thing I do that makes you smile?",
    "Do you feel you have enough personal space and time? How can I support that?",
    "What is one assumption you've made about me that you found out was wrong?",
    "How do you prefer to be comforted when you're upset?",
    "What's a long-term goal you have that I can help you with?",
];

// --- 3. CORE FUNCTIONS (Initialization, Page Load) ---

// Handle page load
window.onload = () => {
    const path = window.location.pathname.split('/');
    if (path.length === 3 && path[1] === 'meeting') {
        // This is a join link
        meetingId = path[2];
        isCallInitiator = false;
        showCallUI();
        startApp(); // Start the call process
    } else {
        // This is the home screen
        showHomeUI();
    }
};

// Show only the Home UI
function showHomeUI() {
    homeScreen.classList.remove('hidden');
    callContainer.classList.add('hidden');
    createMeetingBtn.onclick = createNewMeeting;
}

// Show only the Call UI
function showCallUI() {
    homeScreen.classList.add('hidden');
    callContainer.classList.remove('hidden');
}

// User creates a new meeting
function createNewMeeting() {
    isCallInitiator = true;
    meetingId = generateMeetingId();
    // Update URL without reloading
    window.history.pushState({}, '', `/meeting/${meetingId}`);
    showCallUI();
    startApp(); // Start the call process
}

// Generate a simple random meeting ID
function generateMeetingId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let id = '';
    for (let i = 0; i < 3; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    id += '-';
    for (let i = 0; i < 3; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
    return id;
}

// --- 4. STARTUP & WEBSOCKET ---

// Main function to start video and WebSocket connection
async function startApp() {
    startClock();
    setupButtonListeners();

    try {
        // Get local video stream
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        isStreamReady = true;

        // Connect to WebSocket server
        setupWebSocket();
        
        // Process any queued messages
        processSignalingQueue();

    } catch (error) {
        console.error("Error accessing media devices.", error);
        alert("Could not access your camera or microphone. Please check permissions.");
    }
}

function setupWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsURL = `${wsProtocol}//${window.location.host}/ws/${meetingId}`;
    websocket = new WebSocket(wsURL);

    websocket.onopen = () => {
        console.log("WebSocket connection established");
        // If this user is the initiator, they can start the call
        if (isCallInitiator) {
            console.log("Ready to start call as initiator.");
        } else {
            // If this user is the joiner, they send a 'join' message
            // which will trigger the initiator to send an offer.
            console.log("Sending join signal as joiner.");
            sendSignal({ type: 'join' });
        }
    };

    websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (isStreamReady) {
            handleSignalingMessage(message);
        } else {
            signalingQueue.push(message); // Queue if stream isn't ready
        }
    };

    websocket.onclose = () => console.log("WebSocket connection closed");
    websocket.onerror = (error) => console.error("WebSocket error:", error);
}

// --- 5. WEBRTC SIGNALING ---

// Process messages that arrived before stream was ready
function processSignalingQueue() {
    while (signalingQueue.length > 0) {
        handleSignalingMessage(signalingQueue.shift());
    }
}

// Handle all incoming WebSocket messages
async function handleSignalingMessage(message) {
    // The 'join' message is received by the INITIATOR
    if (message.type === 'join' && isCallInitiator) {
        console.log("Joiner is ready, creating offer.");
        createPeerConnection();
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignal({ type: 'offer', offer: offer });
    }
    // The 'offer' message is received by the JOINER
    else if (message.type === 'offer') {
        console.log("Received offer, creating answer.");
        createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendSignal({ type: 'answer', answer: answer });
    }
    // The 'answer' message is received by the INITIATOR
    else if (message.type === 'answer') {
        console.log("Received answer.");
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        hideIdleScreen(); // Both parties are connected
    }
    // 'candidate' is received by both
    else if (message.type === 'candidate' && peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
        } catch (e) {
            console.error('Error adding received ice candidate', e);
        }
    }
    // 'question' sync is received by both
    else if (message.type === 'question_sync') {
        syncQuestionMode(message);
    }
    // 'end_call' is received by both
    else if (message.type === 'end_call') {
        handleRemoteEndCall();
    }
}

// Send a signaling message
function sendSignal(message) {
    websocket.send(JSON.stringify(message));
}

// Create and configure the RTCPeerConnection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
        hideIdleScreen(); // Call is connected
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            sendSignal({ type: 'candidate', candidate: event.candidate });
        }
    };

    // Add local stream tracks to the connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
}

// --- 6. UI & BUTTON LISTENERS ---

function setupButtonListeners() {
    micButton.addEventListener('click', toggleMic);
    cameraButton.addEventListener('click', toggleCamera);
    endCallButton.addEventListener('click', endCall);
    questionsButton.addEventListener('click', toggleQuestionMode);
    copyLinkBtn.addEventListener('click', copyMeetingLink);
    localVideoFrame.addEventListener('click', swapVideos);
    remoteVideoFrame.addEventListener('click', swapVideos);
}

// Copy the current URL to the clipboard
function copyMeetingLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Link copied to clipboard!');
    }, () => {
        showNotification('Failed to copy link.');
    });
}

// Show the idle screen
function showIdleScreen() {
    idleScreen.classList.remove('hidden');
}

// Hide the idle screen
function hideIdleScreen() {
    idleScreen.classList.add('hidden');
}

// --- 7. IN-CALL CONTROLS ---

// Mute/Unmute microphone
function toggleMic() {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    micButton.innerHTML = audioTrack.enabled ? '🎤 Mute' : '🔇 Unmute';
    micButton.classList.toggle('active', !audioTrack.enabled);
}

// Turn camera on/off
function toggleCamera() {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    cameraButton.innerHTML = videoTrack.enabled ? '📹 Cam Off' : '📸 Cam On';
    cameraButton.classList.toggle('active', !videoTrack.enabled);
}

// End the call
function endCall() {
    sendSignal({ type: 'end_call' });
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    localStream.getTracks().forEach(track => track.stop());
    // Go back to the home screen
    window.location.href = '/';
}

// Handle when the other person ends the call
function handleRemoteEndCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    localStream.getTracks().forEach(track => track.stop());
    showNotification('Your partner ended the call.');
    // Go back to the home screen after a delay
    setTimeout(() => {
        window.location.href = '/';
    }, 2000);
}

// Swap main and PiP videos
function swapVideos() {
    localVideoFrame.classList.toggle('pip');
    localVideoFrame.classList.toggle('main');
    remoteVideoFrame.classList.toggle('pip');
    remoteVideoFrame.classList.toggle('main');
}

// --- 8. QUESTION MODE ---

function toggleQuestionMode() {
    if (questionModeActive) {
        // End question mode
        questionModeActive = false;
        isMyTurn = false;
        sendSignal({ type: 'question_sync', active: false });
        syncQuestionMode({ active: false }); // Sync local UI
    } else {
        // Start question mode
        questionModeActive = true;
        isMyTurn = isCallInitiator; // Initiator asks first
        currentQuestionIndex = 0;
        const message = {
            type: 'question_sync',
            active: true,
            index: currentQuestionIndex,
            initiatorTurn: isMyTurn
        };
        sendSignal(message);
        syncQuestionMode(message); // Sync local UI
    }
}

// Syncs the UI based on message from WebSocket
function syncQuestionMode(message) {
    questionModeActive = message.active;
    if (!questionModeActive) {
        questionBox.classList.add('hidden');
        questionsButton.innerHTML = '💬 Questions';
        questionsButton.classList.remove('active');
        // Add a "Next" button if not already there
        const nextBtn = document.getElementById('next-q-btn');
        if (nextBtn) nextBtn.remove();
        return;
    }

    // Update button text
    questionsButton.innerHTML = '🔚 End Qs';
    questionsButton.classList.add('active');

    // Update question text
    currentQuestionIndex = message.index;
    questionText.innerText = counselingQuestions[currentQuestionIndex];
    
    // Determine whose turn it is
    // 'isMyTurn' is relative to the *local* user
    isMyTurn = (isCallInitiator === message.initiatorTurn);
    questionTurn.innerText = isMyTurn ? "Your Turn to Ask:" : "Your Partner is Asking:";
    
    // Show the box
    questionBox.classList.remove('hidden');

    // Add "Next Question" button only if it's my turn
    let nextBtn = document.getElementById('next-q-btn');
    if (isMyTurn) {
        if (!nextBtn) {
            nextBtn = document.createElement('button');
            nextBtn.id = 'next-q-btn';
            nextBtn.innerText = 'Next Question →';
            nextBtn.onclick = nextQuestion;
            questionBox.appendChild(nextBtn);
        }
    } else {
        if (nextBtn) nextBtn.remove(); // Remove button if it's not my turn
    }
}

function nextQuestion() {
    currentQuestionIndex = (currentQuestionIndex + 1) % counselingQuestions.length;
    // Flip the turn
    isMyTurn = !isMyTurn; 
    const message = {
        type: 'question_sync',
        active: true,
        index: currentQuestionIndex,
        initiatorTurn: (isCallInitiator ? isMyTurn : !isMyTurn) // Send the *initiator's* turn state
    };
    sendSignal(message);
    syncQuestionMode(message); // Sync local UI immediately
}

// --- 9. UTILITY FUNCTIONS ---

// Update the on-screen clock
function startClock() {
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        clockElement.textContent = timeString;
    }
    updateTime();
    setInterval(updateTime, 1000);
}

// Show a temporary notification
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

