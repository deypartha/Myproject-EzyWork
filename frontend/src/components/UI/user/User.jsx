import React, { useEffect, useRef, useState } from "react";
import { FaMicrophone, FaCamera, FaStar, FaMapMarkerAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import API_BASE_URL from "../../../config/api";

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

  const isPlumberRequest = (text) => {
    if (!text) return false;
    const t = text.toLowerCase();
    return t.includes("plumb") || t.includes("tap") || t.includes("leak") || t.includes("pipe");
  };

  // Try to detect the skill using backend/AI (Gemini). Falls back to simple keyword matching.
  const detectSkill = async (text) => {
    if (!text) return null;
    try {
      // Expect a backend endpoint that calls Gemini/OpenAI with your API key.
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const json = await res.json();
        // backend should return something like { skill: 'Plumber' }
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
      const skill = await detectSkill(problem);
      setDetectedSkill(skill);

      try {
        // 1. Create Problem in Backend (Triggers Socket Broadcast)
        if (user) {
          try {
            await fetch(`${API_BASE_URL}/api/problems/create`, {
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
          } catch (err) {
            console.error("Failed to broadcast problem:", err);
            // Continue anyway to show list
          }
        }

        // 2. Fetch workers from database
        let url = `${API_BASE_URL}/api/workers/all`;
        if (skill) {
          url = `${API_BASE_URL}/api/workers/type/${skill}`;
        }

        const response = await fetch(url);
        const workers = await response.json();

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
        console.error("Error fetching workers:", error);
        alert("Failed to fetch workers. Please try again.");
      }
    })();
  };

  const handleWorkerAccept = (worker) => {
    setSelectedWorker(worker);
    setStep(3);
  };

  const handlePayment = (method) => {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtp(generatedOtp);

    const newBooking = {
      worker: selectedWorker,
      problem,
      status: "Pending",
      otp: generatedOtp,
      workerName: selectedWorker.name,
      workerEmail: selectedWorker.contact,
      dateTime: new Date().toLocaleString(),
      price: selectedWorker.price,
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

    setStep(4);
  };

  const cancelWork = (historyItem) => {
    setHistory((prev) => prev.filter((item) => item !== historyItem));
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

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1220] flex flex-col items-center px-6 md:px-16">
      {/* Step 1: Problem Description */}
      {step === 1 && (
        <div className="w-full max-w-5xl min-h-[72vh] bg-white p-8 rounded-lg shadow-lg flex flex-col">
          <h2 className="text-3xl font-bold text-[#0b2545] mb-6">
            Describe Your Problem
          </h2>
          <textarea
            placeholder="Describe your problem (e.g., AC not cooling, tap leaking...)"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            className="w-full h-56 md:h-72 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b2545] mb-4 resize-none"
          />
          <div className="flex gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  const desiredVideo = !isCameraOn;
                  const desiredAudio = isMicOn;
                  await startMedia({ video: desiredVideo, audio: desiredAudio });
                }}
                className={`p-3 rounded-full ${isCameraOn ? "bg-green-200" : "bg-gray-200 hover:bg-gray-300"}`}
                title={isCameraOn ? "Turn off camera" : "Turn on camera"}
              >
                <FaCamera className="text-[#0b2545]" />
              </button>

              <button
                onClick={async () => {
                  const desiredAudio = !isMicOn;
                  const desiredVideo = isCameraOn;
                  if (desiredAudio) {
                    // request microphone and start transcription + recording
                    await startMedia({ video: desiredVideo, audio: true });
                    startTranscription();
                    startRecording();
                    setIsMicOn(true);
                  } else {
                    // stop transcription, recording and audio only
                    stopTranscription();
                    stopRecording();
                    stopAudioTracks();
                  }
                }}
                className={`p-3 rounded-full ${isTranscribing ? "bg-red-200 animate-pulse" : isMicOn ? "bg-green-200" : "bg-gray-200 hover:bg-gray-300"}`}
                title={isMicOn ? "Turn off mic" : "Turn on mic"}
              >
                <FaMicrophone className="text-[#0b2545]" />
              </button>
            </div>
          </div>
          {/* Video preview */}
          {isCameraOn && (
            <div className="mt-4">
              <video ref={videoRef} className="w-full h-56 md:h-64 object-cover rounded-md border border-gray-300 bg-gray-900" autoPlay muted />
              <div className="flex items-center justify-between mt-3">
                <div className="text-sm text-gray-500">Camera is on — preview shown above</div>
                <button
                  onClick={capturePhoto}
                  disabled={isAnalyzingImage}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
                >
                  {isAnalyzingImage ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FaCamera />
                      Capture Photo
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Captured image preview */}
          {capturedImage && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start gap-4">
                <img src={capturedImage} alt="Captured" className="w-32 h-32 object-cover rounded-md border border-gray-300" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-600 font-semibold">✓ Photo Captured</span>
                    <button
                      onClick={() => setCapturedImage(null)}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    {isAnalyzingImage
                      ? "AI is analyzing your image to detect the problem..."
                      : "Image has been analyzed and added to your problem description."}
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Live transcription badge & interim text */}
          {isTranscribing && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-red-600 rounded-full animate-pulse" />
              <span className="text-sm text-red-600 font-medium">Recording...</span>
              {isUploading && <span className="ml-3 text-sm text-gray-600">Translating...</span>}
              {detectedLanguage && !isUploading && (
                <span className="ml-3 text-sm text-gray-700">Detected: <strong>{detectedLanguage}</strong></span>
              )}
            </div>
          )}
          {interimTranscript && (
            <div className="mt-2 text-sm text-gray-500 italic">Listening: {interimTranscript}</div>
          )}
          <button
            onClick={handleProblemSubmit}
            className="bg-[#0b2545] text-white px-6 py-3 rounded-md hover:bg-[#14365b] font-semibold mt-4"
          >
            Next
          </button>
        </div>
      )}

      {/* Step 2: Worker Suggestions */}
      {step === 2 && (
        <div className="w-full max-w-7xl">
          <h2 className="text-3xl font-bold text-[#0b2545] mb-6">
            Available Workers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workerSuggestions.map((worker) => (
              <div
                key={worker.id}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#0b2545]">
                      {worker.name}
                    </h3>
                    <p className="text-gray-600">{worker.skill}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-yellow-500 mb-4">
                  <FaStar />
                  <span>{worker.rating}</span>
                </div>
                <div className="text-gray-600 mb-4">
                  <FaMapMarkerAlt className="inline-block mr-2" />
                  {worker.distance}
                </div>
                <div className="text-gray-600 mb-4">{worker.price}</div>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleWorkerAccept(worker)}
                    className="bg-[#0b2545] text-white px-4 py-2 rounded-md hover:bg-[#14365b] font-semibold"
                  >
                    Accept
                  </button>
                  <button className="bg-gray-200 text-[#0b2545] px-4 py-2 rounded-md hover:bg-gray-300 font-semibold">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* If this was a plumber request, show bottom plumber card with cycle/next/accept */}
          {isPlumberRequest(problem) && workerSuggestions.length > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-3xl bg-white p-4 rounded-lg shadow-2xl border">
              {(() => {
                const w = workerSuggestions[currentIndex % workerSuggestions.length];
                return (
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-md shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-[#0b2545]">{w.name}</h3>
                          <p className="text-sm text-gray-600">{w.skill} • {w.location}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-500 flex items-center gap-1"><FaStar /> <span>{w.rating}</span></div>
                          <div className="text-gray-600 text-sm">{w.price}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">Contact: <strong>{w.contact}</strong></div>
                      <div className="mt-3 flex gap-3">
                        <button onClick={() => handleAcceptAndPay(w)} className="bg-green-600 text-white px-4 py-2 rounded-md font-semibold">Accept</button>
                        <button onClick={handleNextWorker} className="bg-gray-200 text-[#0b2545] px-4 py-2 rounded-md font-semibold">Next</button>
                        <button onClick={() => setWorkerSuggestions(prev => prev.filter(x => x.id !== w.id))} className="bg-red-500 text-white px-4 py-2 rounded-md font-semibold">Reject</button>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && selectedWorker && (
        <div className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold text-[#0b2545] mb-6">
            Confirm Your Booking
          </h2>
          <p className="text-gray-600 mb-4">
            Worker: <strong>{selectedWorker.name}</strong>
          </p>
          <p className="text-gray-600 mb-4">
            Problem: <strong>{problem}</strong>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => handlePayment("Pay Now")}
              className="bg-[#0b2545] text-white px-6 py-3 rounded-md hover:bg-[#14365b] font-semibold"
            >
              Pay Now
            </button>
            <button
              onClick={() => handlePayment("Pay Later")}
              className="bg-gray-200 text-[#0b2545] px-6 py-3 rounded-md hover:bg-gray-300 font-semibold"
            >
              Pay Later
            </button>
          </div>
        </div>
      )}

      {/* Step 4: OTP Generation */}
      {step === 4 && (
        <div className="w-full max-w-3xl bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-3xl font-bold text-[#0b2545] mb-6">
            Booking Confirmed!
          </h2>
          <p className="text-gray-600 mb-4">
            Your OTP: <strong>{otp}</strong>
          </p>
          <p className="text-gray-600">
            Share this OTP with the worker after the work is completed.
          </p>
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

      {/* Step 6: Pending */}
      {step === 6 && (
        <div className="w-full max-w-7xl">
          <h2 className="text-3xl font-bold text-[#0b2545] mb-6">Pending</h2>
          <div className="grid grid-cols-1 gap-6">
            {history
              .filter((item) => item.status === "Pending")
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
                    OTP: <strong>{item.otp}</strong>
                  </p>
                  <button
                    onClick={() => cancelWork(item)}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default User;