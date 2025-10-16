// static/script.js

// --- 1. GET DOM ELEMENTS ---
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const localVideoFrame = document.getElementById("localVideoFrame");
const remoteVideoFrame = document.getElementById("remoteVideoFrame");
const callContainer = document.getElementById("call-container");
const idleScreen = document.getElementById("idle-screen");
const clockElement = document.getElementById("clock");
const callButton = document.getElementById("callButton");
const micButton = document.getElementById("micButton");
const cameraButton = document.getElementById("cameraButton");
const counselingButton = document.getElementById("counselingButton");
const endCallButton = document.getElementById("endCallButton");
const questionBox = document.getElementById("question-box");
const questionText = document.getElementById("question-text");
const nextQuestionButton = document.getElementById("nextQuestionButton");
const notification = document.getElementById("notification");

// --- 2. GLOBAL VARIABLES & CONFIG ---
let localStream, peerConnection;
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsURL = `${wsProtocol}//${window.location.host}/ws`;
const websocket = new WebSocket(wsURL);
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
const questions = [
  "What's one small thing I can do for you this week to make you feel loved?",
  "Share a favorite memory we've created together.",
  "What's a dream for our future that you haven't shared with me yet?",
  "When do you feel most connected to me?",
  "What's something you appreciate about me that you don't say often?",
  "If we could go anywhere in the world for a week, where would we go and why?",
  "What is one thing you would like to learn together?",
  "How can we be better at supporting each other's personal goals?",
  "Is there something you've been hesitant to tell me?",
  "What does a perfect, relaxing day look like for you?",
  "In what ways have we grown together as a couple?",
  "What's a challenge we've overcome that made us stronger?",
  "What is a boundary you'd like to set or reinforce in our relationship?",
  "What's one of your favorite non-physical traits about me?",
  "How can I better support you when you're feeling stressed or overwhelmed?",
  "What's a simple, everyday thing that makes you happy?",
  "What are you most proud of in your life right now?",
  "Describe a time you felt truly understood by me.",
  "What is our biggest strength as a couple?",
  "What's one new tradition you'd like us to start together?",
];
let currentQuestionIndex = 0;
let isMyTurn = false;

// --- 3. WEBSOCKET MESSAGE HANDLING ---
websocket.onopen = () => console.log("WebSocket connection established");
websocket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch (message.type) {
    case "offer":
      handleOffer(message.payload);
      break;
    case "answer":
      handleAnswer(message.payload);
      break;
    case "candidate":
      handleCandidate(message.payload);
      break;
    case "start_questions":
      startQuestionMode(false);
      break;
    case "end_questions":
      endQuestionMode();
      break;
    case "next_question":
      displayNextQuestion(message.payload.index, message.payload.turn);
      break;
    default:
      console.log("Unknown message type:", message.type);
  }
};

// --- 4. CORE WEBTRC & CALL LOGIC ---
function createPeerConnection() {
  peerConnection = new RTCPeerConnection(configuration);
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    idleScreen.style.opacity = 0;
    setTimeout(() => idleScreen.classList.add("hidden"), 500);
  };
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) sendMessage("candidate", event.candidate);
  };
  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));
}
async function startCall() {
  isMyTurn = !0;
  createPeerConnection();
  const e = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(e);
  sendMessage("offer", e);
  updateUIForActiveCall();
}
async function handleOffer(e) {
  isMyTurn = !1;
  createPeerConnection();
  await peerConnection.setRemoteDescription(new RTCSessionDescription(e));
  const t = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(t);
  sendMessage("answer", t);
  updateUIForActiveCall();
}
async function handleAnswer(e) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(e));
}
async function handleCandidate(e) {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(e));
  } catch (t) {
    console.error("Error adding ICE candidate", t);
  }
}

// --- 5. COUNSELING QUESTIONS LOGIC ---
function startQuestionMode(e) {
  e && sendMessage("start_questions", {});
  questionBox.classList.remove("hidden");
  counselingButton.textContent = "💬 End Questions";
  displayNextQuestion(0, isMyTurn);
}
function endQuestionMode() {
  questionBox.classList.add("hidden");
  counselingButton.textContent = "💬 Questions";
  currentQuestionIndex = 0;
}
function displayNextQuestion(e, t) {
  currentQuestionIndex = e;
  isMyTurn = t;
  if (currentQuestionIndex >= questions.length) {
    questionText.textContent = "You've completed all the questions!";
    nextQuestionButton.classList.add("hidden");
    return;
  }
  const n = isMyTurn ? "Your turn to answer:" : "Your partner's turn:";
  questionText.innerHTML = `<em>${n}</em><br>${questions[currentQuestionIndex]}`;
  nextQuestionButton.classList.remove("hidden");
}
function onNextQuestionClick() {
  const e = currentQuestionIndex + 1,
    t = !isMyTurn;
  sendMessage("next_question", { index: e, turn: t });
  displayNextQuestion(e, t);
}

// --- 6. UI & EVENT LISTENERS ---
function toggleMic() {
  const e = localStream.getAudioTracks()[0];
  e.enabled = !e.enabled;
  micButton.textContent = e.enabled ? "🎤 Mute" : "🔇 Unmute";
}
function toggleCamera() {
  const e = localStream.getVideoTracks()[0];
  e.enabled = !e.enabled;
  cameraButton.textContent = e.enabled ? "📹 Cam Off" : "📸 Cam On";
}
function endCall() {
  if (peerConnection) peerConnection.close();
  window.location.reload();
}
function updateUIForActiveCall() {
  callButton.classList.add("hidden");
  micButton.classList.remove("hidden");
  cameraButton.classList.remove("hidden");
  counselingButton.classList.remove("hidden");
  endCallButton.classList.remove("hidden");
}
function sendMessage(e, t) {
  websocket.send(JSON.stringify({ type: e, payload: t }));
}
function updateClock() {
  const e = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  clockElement.textContent = e;
}
function swapVideos() {
  callContainer.classList.toggle("local-is-main");
}
function showNotification(message) {
  notification.textContent = message;
  notification.classList.remove("hidden");
  notification.classList.add("show");
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.classList.add("hidden"), 300);
  }, 3e3);
}
async function initialize() {
  setInterval(updateClock, 1e3);
  updateClock();
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: !0,
      audio: !0,
    });
    localVideo.srcObject = localStream;
    localVideoFrame.style.opacity = 1;
    callButton.disabled = !1;
    callButton.textContent = "🚀 Start Call";
  } catch (e) {
    console.error("Error accessing media devices.", e);
    showNotification("Error: Could not access camera.");
    callButton.textContent = "⛔ No Camera";
  }
}

// Attach all event listeners
callButton.addEventListener("click", startCall);
micButton.addEventListener("click", toggleMic);
cameraButton.addEventListener("click", toggleCamera);
endCallButton.addEventListener("click", endCall);
nextQuestionButton.addEventListener("click", onNextQuestionClick);
counselingButton.addEventListener("click", () => {
  const e = !questionBox.classList.contains("hidden");
  if (e) {
    sendMessage("end_questions", {});
    endQuestionMode();
  } else startQuestionMode(!0);
});
localVideoFrame.addEventListener("click", swapVideos);
remoteVideoFrame.addEventListener("click", swapVideos);

// Start the entire application
initialize();
