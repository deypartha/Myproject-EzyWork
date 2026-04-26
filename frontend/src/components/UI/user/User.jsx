import React, { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaCamera, FaStar, FaMapMarkerAlt, FaQuestionCircle, FaTimes, FaPhone, FaEnvelope, FaComments, FaUser, FaClipboardList, FaCreditCard, FaWallet, FaCheckCircle, FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import API_BASE_URL from "../../../config/api";
import { io } from "socket.io-client";

function User() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [problem, setProblem] = useState("");
  const [workerSuggestions, setWorkerSuggestions] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState([]);
  const [detectedSkill, setDetectedSkill] = useState(null);
  const [otp, setOtp] = useState("");
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const mediaStreamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [showQuestions, setShowQuestions] = useState(true);
  const chatEndRef = useRef(null);
  const [currentProblemId, setCurrentProblemId] = useState(null);
  const [userProblems, setUserProblems] = useState([]);
  const [currentProblem, setCurrentProblem] = useState(null);

  const parseAmount = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return null;
    const match = value.match(/\d+(?:\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // Predefined FAQ
  const faqData = [
    {
      question: "How do I book a worker?",
      answer: "To book a worker: 1) Describe your problem on the main page, 2) Browse through suggested workers, 3) Select a worker that fits your needs, 4) Confirm booking and choose payment method. You'll receive an OTP after booking!"
    },
    {
      question: "What payment methods are accepted?",
      answer: "We accept multiple payment methods: UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, and Cash on Completion. You can choose 'Pay Now' or 'Pay Later' options."
    },
    {
      question: "How do I rate a worker?",
      answer: "After work completion: 1) Enter the OTP provided by the worker, 2) Complete the payment, 3) You'll be prompted to rate the worker on a scale of 1-5 stars and leave a review. Your feedback helps other users!"
    },
    {
      question: "What if the worker doesn't show up?",
      answer: "If a worker doesn't show up: 1) Contact our support immediately, 2) You can cancel the booking without any charges, 3) We'll help you find another worker quickly, 4) The worker may face penalties for no-show."
    },
    {
      question: "Is my payment secure?",
      answer: "Yes! All payments are 100% secure. We use industry-standard encryption and comply with PCI DSS standards. Your payment information is never stored on our servers. We also offer buyer protection for all transactions."
    },
    {
      question: "How do I cancel a booking?",
      answer: "To cancel: 1) Go to 'Pending' section, 2) Find your booking, 3) Click 'Cancel' button. Free cancellation is available up to 1 hour before scheduled time. After that, cancellation charges may apply."
    },
    {
      question: "Can I contact the worker directly?",
      answer: "Yes! After booking confirmation, you'll receive the worker's contact number. You can call them to discuss details, share your location, or coordinate timing. Keep all communication professional."
    },
    {
      question: "What if I'm not satisfied with the work?",
      answer: "If you're not satisfied: 1) Don't enter the OTP immediately, 2) Discuss concerns with the worker first, 3) Contact our support team, 4) We offer a satisfaction guarantee and will help resolve the issue or arrange a replacement."
    }
  ];

  // Handle question click
  const handleQuestionClick = (faq) => {
    // Add user question
    const userMessage = {
      type: 'user',
      text: faq.question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add bot answer after a short delay
    setChatMessages(prev => [...prev, userMessage]);
    setShowQuestions(false);

    setTimeout(() => {
      const botMessage = {
        type: 'bot',
        text: faq.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  // Reset chat
  const resetChat = () => {
    setChatMessages([]);
    setShowQuestions(true);
  };

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Fetch user problems on mount
  useEffect(() => {
    fetchUserProblems();
  }, [user]);

  const isPlumberRequest = (text) => {
    if (!text) return false;
    const t = text.toLowerCase();
    return t.includes("plumb") || t.includes("tap") || t.includes("leak") || t.includes("pipe");
  };

  // Try to detect the skill using backend/AI (Gemini). Falls back to simple keyword matching.
  const detectSkill = async (text) => {
    if (!text) return null;
    try {
      // Backend detects with Gemini if configured, and falls back to keyword rules.
      const res = await fetch(`${API_BASE_URL}/api/workers/detect-skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.skill) return json.skill;
      }
    } catch (e) {
      // ignore and fallback
      console.warn("AI detect failed, falling back to local heuristics", e);
    }

    // fallback simple heuristics
    if (isPlumberRequest(text)) return "Plumber";
    const t = text.toLowerCase();
    if (t.includes("electri") || t.includes("switch") || t.includes("wire")) return "Electrician";
    if (t.includes("clean") || t.includes("deep clean") || t.includes("wash")) return "Cleaner";
    if (t.includes("paint") || t.includes("color") || t.includes("wall")) return "Painter";
    if (t.includes("carpen") || t.includes("wood") || t.includes("furniture")) return "Carpenter";
    return null;
  };

  const handleProblemSubmit = () => {
    (async () => {
      try {
        const skill = await detectSkill(problem);
        setDetectedSkill(skill);

        // 1. Create Problem in Backend (Triggers Socket Broadcast)
        let createdProblem = null;
        if (user) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/problems/create`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: problem.substring(0, 50) + "...", // Short title
                description: problem,
                category: skill || "General",
                createdBy: user.id || user._id, // Assuming user object has ID
                location: { city: "Unknown" } // Placeholder
              })
            });
            if (res.ok) {
              createdProblem = await res.json();
              setCurrentProblemId(createdProblem._id);
            }
          } catch (err) {
            console.error("Failed to broadcast problem:", err);
            // Continue anyway to show list
          }
        }

        // 2. Fetch workers from database by full query (stronger matching than strict type)
        let workers = [];
        const searchRes = await fetch(`${API_BASE_URL}/api/workers/search?q=${encodeURIComponent(problem)}`);
        if (searchRes.ok) {
          const payload = await searchRes.json();
          workers = payload?.workers || [];
          if (!skill && payload?.detectedSkill) {
            setDetectedSkill(payload.detectedSkill);
          }
        }

        // Fallback to previous flow if search endpoint fails
        if (!Array.isArray(workers) || workers.length === 0) {
          let url = `${API_BASE_URL}/api/workers/all`;
          if (skill) {
            url = `${API_BASE_URL}/api/workers/type/${encodeURIComponent(skill)}`;
          }

          const response = await fetch(url);
          workers = await response.json();
        }

        // Transform database workers to match the expected format
        const transformedWorkers = workers.map((worker) => ({
          id: worker._id,
          name: worker.fullName || worker.name,
          skill: worker.typeOfWork && worker.typeOfWork[0] ? worker.typeOfWork[0] : "General",
          rating: 4.5, // Default rating (you can add this to your model later)
          distance: "N/A", // Can calculate based on location later
          price: "$40 - $60", // Default price (you can add this to your model later)
          contact: worker.mobileNumber || worker.number,
          location: worker.location || "Unknown",
          image: null,
          email: worker.email,
          yearsOfExperience: worker.yearsOfExperience || 0,
          allSkills: worker.typeOfWork || []
        }));

        setWorkerSuggestions(transformedWorkers);
        setStep(2);

      } catch (error) {
        console.error("Error in handleProblemSubmit:", error);
        alert("Failed to process problem. Please try again.");
      }
    })();
  };

  const handleWorkerSelect = async (worker) => {
    setSelectedWorker(worker);
    if (currentProblemId) {
      try {
        await fetch(`${API_BASE_URL}/api/problems/${currentProblemId}/request`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workerId: worker.id })
        });
        alert("Request sent to worker! Waiting for acceptance.");
        setStep(3); // Go to waiting step
      } catch (err) {
        console.error("Failed to request worker:", err);
        alert("Failed to send request");
      }
    }
  };

  const handlePayment = async (method) => {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtp(generatedOtp);
    const fixedAmount = parseAmount(selectedWorker?.price);

    if (currentProblemId) {
      try {
        await fetch(`${API_BASE_URL}/api/problems/${currentProblemId}/book`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            otp: generatedOtp,
            paymentMethod: method,
            amount: fixedAmount,
          })
        });
      } catch (err) {
        console.error("Failed to update booking:", err);
      }
    }

    // Still save to localStorage for now, but will fetch from backend later
    const newBooking = {
      problemId: currentProblemId,
      worker: selectedWorker,
      problem,
      status: "assigned",
      otp: generatedOtp,
      workerName: selectedWorker.name,
      workerEmail: selectedWorker.contact,
      dateTime: new Date().toLocaleString(),
      price: selectedWorker.price,
      amount: fixedAmount,
      paymentMethod: method,
    };

    setHistory((prev) => [...prev, newBooking]);

    // Save booking to localStorage
    if (user) {
      const bookingKey = `bookingHistory_${user.email}`;
      const existingBookings = localStorage.getItem(bookingKey);
      const bookings = existingBookings ? JSON.parse(existingBookings) : [];
      bookings.push(newBooking);
      localStorage.setItem(bookingKey, JSON.stringify(bookings));
    }

    setStep(5); // Go to dashboard
  };

  const cancelWork = (historyItem) => {
    setHistory((prev) => prev.filter((item) => item !== historyItem));
  };

  const fetchUserProblems = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/problems/user/${user.id || user._id}`);
      if (res.ok) {
        const problems = await res.json();
        setUserProblems(problems);
      }
    } catch (err) {
      console.error("Failed to fetch user problems:", err);
    }
  };

  const fetchCurrentProblem = async () => {
    if (!currentProblemId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/problems/${currentProblemId}`);
      if (res.ok) {
        const problem = await res.json();
        setCurrentProblem(problem);
      }
    } catch (err) {
      console.error("Failed to fetch current problem:", err);
    }
  };

  // Camera / microphone helpers
  const startMedia = async ({ video = false, audio = false } = {}) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      mediaStreamRef.current = stream;
      if (video && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => { });
      }
      setIsCameraOn(!!video);
      setIsMicOn(!!audio);
    } catch (err) {
      console.error("Media error", err);
      alert("Cannot access camera/microphone. Please allow permissions.");
    }
  };

  const stopMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); videoRef.current.srcObject = null; } catch (e) { }
    }
    setIsCameraOn(false);
    setIsMicOn(false);
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    // Convert to blob and store
    canvas.toBlob(async (blob) => {
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);

      // Send to AI for analysis
      await analyzeImageWithAI(blob);
    }, 'image/jpeg', 0.95);
  };

  // Send captured image to AI for problem detection
  const analyzeImageWithAI = async (imageBlob) => {
    setIsAnalyzingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'problem.jpg');

      // Send to backend AI endpoint
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        // json should have { description: '...', detectedProblem: '...' }
        if (json.description) {
          setProblem(prev => {
            const newText = json.description;
            return prev ? `${prev}\n\n[From Image]: ${newText}` : newText;
          });
        }
      } else {
        console.warn('Image analysis failed');
        setProblem(prev => prev + '\n\n[Image captured - Click Next to proceed]');
      }
    } catch (err) {
      console.error('Image analysis error:', err);
      setProblem(prev => prev + '\n\n[Image captured - Click Next to proceed]');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const stopAudioTracks = () => {
    if (!mediaStreamRef.current) return;
    try {
      mediaStreamRef.current.getAudioTracks().forEach((t) => t.stop());
      // remove audio tracks from stream object
      const videoTracks = mediaStreamRef.current.getVideoTracks();
      if (videoTracks.length === 0) {
        mediaStreamRef.current = null;
        if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; }
        setIsCameraOn(false);
      } else {
        // keep video tracks
        const newStream = new MediaStream(videoTracks);
        mediaStreamRef.current = newStream;
        if (videoRef.current) videoRef.current.srcObject = newStream;
      }
    } catch (e) {
      console.warn("stopAudioTracks error", e);
    }
    setIsMicOn(false);
  };

  // Recording helpers: start MediaRecorder and collect chunks
  const startRecording = () => {
    if (!mediaStreamRef.current) return;
    try {
      audioChunksRef.current = [];
      const options = { mimeType: "audio/webm" };
      const mr = new MediaRecorder(mediaStreamRef.current, options);
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // upload and translate
        await uploadAudioForTranslation(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
    } catch (e) {
      console.warn("startRecording failed", e);
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch (e) {
      console.warn("stopRecording error", e);
    }
    mediaRecorderRef.current = null;
  };

  const uploadAudioForTranslation = async (blob) => {
    setIsUploading(true);
    setDetectedLanguage(null);
    try {
      const fd = new FormData();
      fd.append("file", blob, "audio.webm");
      // POST to your backend which should perform speech-to-text + translate to English
      const res = await fetch("/api/translate", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Transcription failed");
      }
      const json = await res.json();
      // expect { translated_text: '...', detected_language: 'Hindi' }
      const translated = json.translated_text || json.text || "";
      const lang = json.detected_language || json.language || null;
      if (translated) {
        setProblem(translated);
        finalTranscriptRef.current = translated;
      }
      setDetectedLanguage(lang);
    } catch (e) {
      console.error("uploadAudioForTranslation error", e);
      alert("Translation failed: " + (e.message || e));
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    return () => stopMedia();
  }, []);

  // Speech-to-text (live transcription) using Web Speech API (SpeechRecognition)
  const startTranscription = () => {
    if (isTranscribing) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Use Chrome/Edge desktop for best support.");
      return;
    }

    // Reset interim/final
    setInterimTranscript("");
    finalTranscriptRef.current = problem || "";

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        const text = res[0].transcript;
        if (res.isFinal) {
          // Append final transcript to the stored final text
          finalTranscriptRef.current = (finalTranscriptRef.current + " " + text).trim();
          setInterimTranscript("");
          // update visible problem with confirmed text
          setProblem(finalTranscriptRef.current);
        } else {
          interim += text;
        }
      }
      if (interim) {
        setInterimTranscript(interim);
        // Show final + interim in the textarea to reflect live speech
        setProblem((finalTranscriptRef.current + " " + interim).trim());
      }
    };

    recognition.onerror = (e) => {
      console.warn("Recognition error", e);
      // keep running but inform user
    };

    recognition.onend = () => {
      setIsTranscribing(false);
      // ensure final text is applied
      setProblem(finalTranscriptRef.current);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsTranscribing(true);
  };

  const stopTranscription = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
      recognitionRef.current = null;
    }
    setIsTranscribing(false);
    setInterimTranscript("");
    finalTranscriptRef.current = problem || "";
  };

  // plumber-card navigation helpers
  const handleNextWorker = () => {
    if (workerSuggestions.length === 0) return;
    setCurrentIndex((idx) => (idx + 1) % workerSuggestions.length);
  };

  const handleAcceptAndPay = (worker) => {
    // navigate to payment page and pass selected worker & problem
    navigate("/payment", { state: { worker, problem } });
  };

  // Fetch current problem when in dashboard
  useEffect(() => {
    if (step === 5 && currentProblemId) {
      fetchCurrentProblem();
      const interval = setInterval(fetchCurrentProblem, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [step, currentProblemId]);

  // Initialize Socket
  useEffect(() => {
    socketRef.current = io(API_BASE_URL);
    if (user) {
      const rooms = new Set();
      if (user.id) rooms.add(`user-${user.id}`);
      if (user._id) rooms.add(`user-${user._id}`);
      if (user.email) rooms.add(`user-email-${user.email}`);

      rooms.forEach((room) => {
        socketRef.current.emit("join-room", room);
        console.log("Joined user room:", room);
      });
    }

    return () => {
      socketRef.current.disconnect();
    };
  }, [user]);

  // Listen for Request Accepted
  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on("request-accepted", (data) => {
      console.log("Request Accepted:", data);
      alert("Your worker request has been accepted! You can now proceed to payment.");
      
      // Refresh current problem and go to payment step
      if (currentProblemId) {
        fetchCurrentProblem();
        setStep(4);
      }
    });

    return () => {
      socketRef.current.off("request-accepted");
    };
  }, [currentProblemId]);

  // Listen for OTP verification completion event from worker flow
  useEffect(() => {
    if (!socketRef.current) return;

    const handleOtpVerified = (data) => {
      console.log("OTP verified event received:", data);
      alert(data?.message || "OTP verified successfully. Opening payment page...");
      navigate("/payment", {
        state: {
          problem: data?.problem || currentProblem,
          problemId: data?.problemId || currentProblemId,
          source: "otp-verified",
        },
      });
    };

    socketRef.current.on("otp-verified", handleOtpVerified);

    return () => {
      socketRef.current.off("otp-verified", handleOtpVerified);
    };
  }, [navigate, currentProblem, currentProblemId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-gray-800 to-indigo-900 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        <button onClick={()=>navigate('/')} className="mb-4 bg-gray-600 p-5 text-blue-500 hover:text-blue-700 font-medium cursor-pointer">Back to Home</button>
        {/* Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {[
              { num: 1, label: "Describe Problem" },
              { num: 2, label: "Select Worker" },
              { num: 3, label: "Wait for Acceptance" },
              { num: 4, label: "Payment" },
              { num: 5, label: "Booking Dashboard" }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-sm md:text-base transition-all duration-300 ${step === s.num
                    ? 'bg-blue-800 text-white shadow-lg scale-110'
                    : step > s.num
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                    }`}>
                    {step > s.num ? '✓' : s.num}
                  </div>
                  <span className={`text-xs md:text-sm mt-2 font-medium hidden md:block ${step === s.num ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                    {s.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div className={`w-12 md:w-24 h-1 mx-2 transition-all duration-300 ${step > s.num ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Problem Description */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10 border border-gray-200">
            <div className="mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                What can we help you with?
              </h2>
              <p className="text-gray-600">Describe your problem in detail or use voice/camera</p>
            </div>

            <div className="space-y-6">
              {/* Textarea with character counter */}
              <div className="relative">
                <textarea
                  placeholder="Example: My AC is not cooling properly, making strange noises..."
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  className="w-full h-48 px-6 py-4 border-2 border-blue-00 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-700 placeholder-gray-400 transition-all"
                />
                <div className="absolute bottom-4 right-4 text-sm text-gray-400">
                  {problem.length} characters
                </div>
              </div>

              {/* Media Controls */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={async () => {
                    const desiredVideo = !isCameraOn;
                    const desiredAudio = isMicOn;
                    await startMedia({ video: desiredVideo, audio: desiredAudio });
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${isCameraOn
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <FaCamera className="text-lg" />
                  <span>{isCameraOn ? 'Camera On' : 'Use Camera'}</span>
                </button>

                <button
                  onClick={async () => {
                    const desiredAudio = !isMicOn;
                    const desiredVideo = isCameraOn;
                    if (desiredAudio) {
                      await startMedia({ video: desiredVideo, audio: true });
                      startTranscription();
                      startRecording();
                      setIsMicOn(true);
                    } else {
                      stopTranscription();
                      stopRecording();
                      stopAudioTracks();
                    }
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${isTranscribing
                    ? 'bg-red-500 text-white shadow-lg animate-pulse'
                    : isMicOn
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <FaMicrophone className="text-lg" />
                  <span>{isTranscribing ? 'Recording...' : isMicOn ? 'Mic On' : 'Use Voice'}</span>
                </button>
              </div>

              {/* Video Preview */}
              {isCameraOn && (
                <div className="bg-gray-900 rounded-xl overflow-hidden">
                  <video ref={videoRef} className="w-full h-64 object-cover" autoPlay muted />
                  <div className="bg-gray-800 p-4 flex items-center justify-between">
                    <span className="text-white text-sm">Camera Preview</span>
                    <button
                      onClick={capturePhoto}
                      disabled={isAnalyzingImage}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:bg-gray-600 transition-all flex items-center gap-2"
                    >
                      {isAnalyzingImage ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FaCamera />
                          📸 Capture Photo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Captured Image */}
              {capturedImage && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <img src={capturedImage} alt="Captured" className="w-24 h-24 object-cover rounded-lg" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-600 font-semibold">✓ Photo Captured</span>
                        <button
                          onClick={() => setCapturedImage(null)}
                          className="text-sm text-red-600 hover:text-red-800 underline ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">
                        {isAnalyzingImage ? 'AI is analyzing your image...' : 'Image analyzed and added to description'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transcription Status */}
              {isTranscribing && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-red-600 font-semibold">Recording in progress...</span>
                  </div>
                  {interimTranscript && (
                    <p className="text-sm text-gray-600 italic">"{interimTranscript}"</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleProblemSubmit}
                disabled={!problem.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
              >
                Find Workers →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Worker Suggestions */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            {/* Back Button */}
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <FaArrowLeft />
              <span className="font-medium">Back to Problem Description</span>
            </button>

            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Available Workers
              </h2>
              <p className="text-gray-600">
                {detectedSkill && <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium mr-2">
                  {detectedSkill}
                </span>}
                {workerSuggestions.length} workers found near you
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {workerSuggestions.map((worker) => (
                <div
                  key={worker.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:border-blue-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                    <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                      {worker.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {worker.name}
                      </h3>
                      <p className="text-gray-600 text-sm">{worker.skill}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <FaStar className="text-yellow-500 text-base" />
                      <span className="font-medium text-gray-700">{worker.rating}</span>
                      <span className="text-gray-500">rating</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FaMapMarkerAlt className="text-gray-500 text-base" />
                      <span className="text-gray-700">{worker.distance}</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      <span className="text-gray-800 font-semibold text-sm">{worker.price}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWorkerSelect(worker)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm transition-all"
                    >
                      Select
                    </button>
                    <button className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition-all">
                      Skip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Waiting for Acceptance */}
        {step === 3 && selectedWorker && (
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 max-w-2xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
            >
              <FaArrowLeft />
              <span className="font-medium">Back to Worker Selection</span>
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUser className="text-blue-600 text-2xl" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Request Sent!
              </h2>
              <p className="text-gray-600">Waiting for {selectedWorker.name} to accept your request</p>
            </div>

            <div className="space-y-4 mb-8">
              {/* Worker Details Box */}
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <FaUser className="text-blue-600 text-lg" />
                  <span className="text-gray-800 font-semibold text-lg">Requested Worker</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Name:</span>
                    <span className="text-gray-800 font-medium">{selectedWorker.name}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Skill:</span>
                    <span className="text-gray-800 font-medium">{selectedWorker.skill}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Rating:</span>
                    <span className="text-gray-800 font-medium flex items-center gap-1">
                      <FaStar className="text-yellow-500 text-sm" /> {selectedWorker.rating}
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Price:</span>
                    <span className="text-gray-800 font-medium">{selectedWorker.price}</span>
                  </div>
                </div>
              </div>

              {/* Problem Description Box */}
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <FaClipboardList className="text-blue-600 text-lg" />
                  <span className="text-gray-800 font-semibold text-lg">Your Problem</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{problem}</p>
              </div>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Please wait while the worker reviews your request...</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && selectedWorker && (
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCreditCard className="text-green-600 text-2xl" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Payment Options
              </h2>
              <p className="text-gray-600">Choose your preferred payment method</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <FaUser className="text-blue-600 text-lg" />
                  <span className="text-gray-800 font-semibold text-lg">Worker Details</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Name:</span>
                    <span className="text-gray-800 font-medium">{selectedWorker.name}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Skill:</span>
                    <span className="text-gray-800 font-medium">{selectedWorker.skill}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Price:</span>
                    <span className="text-gray-800 font-medium">{selectedWorker.price}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <FaClipboardList className="text-blue-600 text-lg" />
                  <span className="text-gray-800 font-semibold text-lg">Problem Description</span>
                </div>
                <p className="text-gray-700 leading-relaxed">{problem}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handlePayment("Pay Now")}
                className="flex-1 bg-green-600 text-white px-6 py-3.5 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <FaCreditCard className="text-lg" />
                Pay Now
              </button>
              <button
                onClick={() => handlePayment("Pay Later")}
                className="flex-1 bg-gray-600 text-white px-6 py-3.5 rounded-lg hover:bg-gray-700 font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <FaWallet className="text-lg" />
                Pay Later
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Booking Dashboard */}
        {step === 5 && (
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <FaCheckCircle className="text-white text-3xl" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Booking Confirmed!
              </h2>
              <p className="text-gray-600">Your worker will arrive shortly</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* User Details */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <FaUser className="text-blue-600 text-lg" />
                  <span className="text-gray-800 font-semibold text-lg">User Details</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Name:</span>
                    <span className="text-gray-800 font-medium">{user?.name || user?.fullName || "User"}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Problem:</span>
                    <span className="text-gray-800 font-medium">{problem}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Raised:</span>
                    <span className="text-gray-800 font-medium">{new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Worker Details */}
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                  <FaUser className="text-blue-600 text-lg" />
                  <span className="text-gray-800 font-semibold text-lg">Worker Details</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Name:</span>
                    <span className="text-gray-800 font-medium">{selectedWorker?.name}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Contact:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-800 font-medium">{selectedWorker?.contact}</span>
                      <button
                        onClick={() => window.open(`tel:${selectedWorker?.contact}`, '_self')}
                        className="bg-green-500 text-white p-1 rounded-full hover:bg-green-600 transition-colors"
                        title="Call Worker"
                      >
                        <FaPhone className="text-sm" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <span className="text-gray-600 w-24 text-sm">Status:</span>
                    <span className={`font-medium ${
                      currentProblem?.status === 'completed' ? 'text-green-600' :
                      currentProblem?.status === 'in_progress' ? 'text-orange-600' :
                      'text-blue-600'
                    }`}>
                      {currentProblem?.status === 'completed' ? 'Resolved' :
                       currentProblem?.status === 'in_progress' ? 'In Progress' :
                       'Assigned'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* OTP Section */}
            <div className="mt-8 border-2 border-gray-200 rounded-lg p-6">
              <p className="text-gray-700 font-medium mb-4 text-sm uppercase tracking-wide">Your One-Time Password</p>
              <div className="bg-gray-50 rounded-lg p-6 mb-5">
                <div className="text-5xl font-bold text-blue-600 tracking-widest font-mono text-center">
                  {otp}
                </div>
              </div>
              <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-left">
                <FaExclamationTriangle className="text-yellow-600 text-xl mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800 mb-1">Important Security Notice</p>
                  <p className="text-sm text-gray-700">
                    Share this OTP with the worker ONLY after the work is completed to your satisfaction.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={() => {
                  setStep(1);
                  setProblem("");
                  setSelectedWorker(null);
                  setOtp("");
                  setCurrentProblemId(null);
                }}
                className="flex-1 bg-blue-600 text-white px-6 py-3.5 rounded-lg hover:bg-blue-700 font-semibold transition-all"
              >
                Book Another Worker
              </button>
              <button
                onClick={() => setStep(6)}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-medium transition-all"
              >
                View All Bookings
              </button>
            </div>
          </div>
        )}

        {/* Step 5: History */}
        {step === 5 && (
          <div className="w-full max-w-7xl">
            <h2 className="text-3xl font-bold text-[#0b2545] mb-6">History</h2>
            <div className="grid grid-cols-1 gap-6">
              {history
                .filter((item) => item.status === "Completed")
                .map((item, index) => (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition"
                  >
                    <p className="text-gray-600 mb-2">
                      Problem: <strong>{item.problem}</strong>
                    </p>
                    <p className="text-gray-600 mb-2">
                      Worker: <strong>{item.worker.name}</strong>
                    </p>
                    <p className="text-gray-600 mb-2">
                      Status: <strong className="text-green-500">Completed</strong>
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Step 6: All Bookings */}
        {step === 6 && (
          <div className="w-full max-w-7xl">
            <h2 className="text-3xl font-bold text-[#0b2545] mb-6">All Bookings</h2>
            <div className="grid grid-cols-1 gap-6">
              {userProblems.map((problem, index) => (
                <div
                  key={problem._id}
                  className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 mb-2">
                        Problem: <strong>{problem.description}</strong>
                      </p>
                      <p className="text-gray-600 mb-2">
                        Category: <strong>{problem.category}</strong>
                      </p>
                      <p className="text-gray-600 mb-2">
                        Created: <strong>{new Date(problem.createdAt).toLocaleString()}</strong>
                      </p>
                      <p className="text-gray-600 mb-2">
                        Payment: <strong>{problem.paymentMethod || "N/A"}</strong>
                      </p>
                    </div>
                    <div>
                      {problem.assignedTo && (
                        <>
                          <p className="text-gray-600 mb-2">
                            Worker: <strong>{problem.assignedTo.fullName || problem.assignedTo.name}</strong>
                          </p>
                          <p className="text-gray-600 mb-2">
                            Contact: <strong>{problem.assignedTo.mobileNumber}</strong>
                            <button
                              onClick={() => window.open(`tel:${problem.assignedTo.mobileNumber}`, '_self')}
                              className="ml-2 bg-green-500 text-white p-1 rounded-full hover:bg-green-600 transition-colors"
                              title="Call Worker"
                            >
                              <FaPhone className="text-sm" />
                            </button>
                          </p>
                        </>
                      )}
                      <p className="text-gray-600 mb-2">
                        Status: <strong className={`${
                          problem.status === 'completed' ? 'text-green-500' :
                          problem.status === 'in_progress' ? 'text-orange-500' :
                          problem.status === 'assigned' ? 'text-blue-500' :
                          'text-gray-500'
                        }`}>{problem.status}</strong>
                      </p>
                      {problem.otp && (
                        <p className="text-gray-600 mb-2">
                          OTP: <strong>{problem.otp}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Help Button */}
        <button
          onClick={() => setHelpModalOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group"
          title="Help & Support"
        >
          <FaQuestionCircle className="text-2xl group-hover:rotate-12 transition-transform" />
        </button>

        {/* Help Modal - Chat Interface */}
        {helpModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full h-[600px] flex flex-col transform transition-all">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-2xl relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <FaComments className="text-xl" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">EzyWork Support</h2>
                    <p className="text-xs text-blue-100">Online • Reply in seconds</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setHelpModalOpen(false);
                    resetChat();
                  }}
                  className="text-white/80 hover:text-white hover:rotate-90 transition-all duration-300"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>

              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
                {/* Welcome Message */}
                {chatMessages.length === 0 && (
                  <div className="flex gap-2 items-start">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaComments className="text-white text-sm" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm max-w-[80%]">
                      <p className="text-sm text-gray-800">
                        👋 Hi! I'm your EzyWork assistant. How can I help you today?
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Just now</p>
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                {chatMessages.map((msg, index) => (
                  <div key={index} className={`flex gap-2 items-start ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.type === 'bot' && (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <FaComments className="text-white text-sm" />
                      </div>
                    )}
                    <div className={`rounded-2xl p-3 shadow-sm max-w-[80%] ${msg.type === 'user'
                      ? 'bg-blue-500 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 rounded-tl-none'
                      }`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}

                <div ref={chatEndRef} />
              </div>

              {/* Questions Section */}
              <div className="border-t border-gray-200 p-4 bg-white rounded-b-2xl max-h-[250px] overflow-y-auto">
                {showQuestions ? (
                  <div>
                    <p className="text-xs text-gray-500 mb-3 font-medium">Select a question:</p>
                    <div className="space-y-2">
                      {faqData.map((faq, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuestionClick(faq)}
                          className="w-full text-left px-3 py-2.5 text-sm bg-blue-50 hover:bg-blue-100 text-gray-700 rounded-lg transition-colors border border-blue-100 hover:border-blue-200"
                        >
                          💬 {faq.question}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <button
                      onClick={resetChat}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      ← Back to Questions
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Need more help? Call us at +91 1800-123-4567
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

    </div>
  </div>
  );
}

export default User;