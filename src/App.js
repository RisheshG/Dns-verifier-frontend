import React, { useState, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";
import "./styles.css";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore"; // Use Firestore (or Realtime Database)

// Firebase configuration (replace with your Firebase project config)
const firebaseConfig = {
    apiKey: "AIzaSyBPAKJ_QWehMaas3GQm75P2ceYYPKO7iC0",
    authDomain: "dns-verifier.firebaseapp.com",
    projectId: "dns-verifier",
    storageBucket: "dns-verifier.firebasestorage.app",
    messagingSenderId: "849931378550",
    appId: "1:849931378550:web:05aecd612f3f4043bb2457",
    measurementId: "G-3EM9RDYYTZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Use Firestore (or Realtime Database)

function App() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authToken, setAuthToken] = useState(localStorage.getItem("authToken") || null);
    const [authError, setAuthError] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [file, setFile] = useState(null);
    const [columns, setColumns] = useState([]);
    const [selectedColumn, setSelectedColumn] = useState("");
    const [downloadLinks, setDownloadLinks] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUserAllowed, setIsUserAllowed] = useState(false); // Track if the user is allowed
    const [isUploading, setIsUploading] = useState(false); // New state to track upload status

    // Check if the authenticated user is allowed
    const checkIfUserIsAllowed = async (userEmail) => {
        try {
            const userDocRef = doc(db, "allowedUsers", userEmail); // Replace "allowedUsers" with your collection name
            const userDoc = await getDoc(userDocRef);
            return userDoc.exists(); // Return true if the user exists in the allowed list
        } catch (error) {
            console.error("Error checking allowed users:", error);
            return false;
        }
    };

    // Handle Firebase login
    const handleFirebaseLogin = async (e) => {
        e.preventDefault();
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        console.log("Trimmed Email:", trimmedEmail); // Debugging
        console.log("Trimmed Password:", trimmedPassword); // Debugging
    
        try {
            const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
            const user = userCredential.user;
    
            // Check if the user is allowed
            const isAllowed = await checkIfUserIsAllowed(user.email);
            if (isAllowed) {
                setIsUserAllowed(true);
                const token = await user.getIdToken();
                setAuthToken(token);
                localStorage.setItem("authToken", token);
                setAuthError("");
            } else {
                setAuthError("You are not authorized to access this application. Please ask Rishesh to give access!!");
                handleLogout();
            }
        } catch (error) {
            console.error("Firebase Auth Error:", error);
            if (error.code === 'auth/invalid-credential') {
                setAuthError("Invalid email or password.");
            } else {
                setAuthError("An error occurred. Please try again.");
            }
        }
    };

    // Handle Firebase registration
    const handleFirebaseRegister = async (e) => {
        e.preventDefault();
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        console.log("Trimmed Email (Register):", trimmedEmail); // Debugging
        console.log("Trimmed Password (Register):", trimmedPassword); // Debugging

        try {
            // Create a new user with email and password
            const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
            const user = userCredential.user;

            // Optionally, you can add the user to Firestore or perform other actions
            console.log("User registered successfully:", user);

            // Automatically log in the user after registration
            const token = await user.getIdToken();
            setAuthToken(token);
            localStorage.setItem("authToken", token);
            setAuthError("");
        } catch (error) {
            console.error("Firebase Registration Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                setAuthError("Email is already in use.");
            } else {
                setAuthError("An error occurred during registration.");
            }
        }
    };

    // Handle logout
    const handleLogout = () => {
        setAuthToken(null);
        setIsUserAllowed(false);
        localStorage.removeItem("authToken");
        auth.signOut(); // Sign out from Firebase
    };

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const isAllowed = await checkIfUserIsAllowed(user.email);
                if (isAllowed) {
                    setIsUserAllowed(true);
                    const token = await user.getIdToken();
                    setAuthToken(token);
                    localStorage.setItem("authToken", token);
                } else {
                    handleLogout();
                }
            } else {
                handleLogout();
            }
        });

        return () => unsubscribe(); // Cleanup subscription
    }, []);

    // Handle file change
    const handleFileChange = (event) => {
        const uploadedFile = event.target.files[0];
        setFile(uploadedFile);

        Papa.parse(uploadedFile, {
            complete: (result) => {
                setColumns(Object.keys(result.data[0]));
            },
            header: true,
        });
    };

    // Handle file upload
    const handleUpload = async () => {
        if (!file || !selectedColumn) {
            alert("Please select a file and column");
            return;
        }

        setIsUploading(true); // Disable the upload button
        setUploadProgress(0);
        setIsProcessing(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("column", selectedColumn);

        try {
            const response = await axios.post("https://dns-verifier-backend.onrender.com/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    Authorization: `Bearer ${authToken}`,
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                },
            });

            setDownloadLinks(response.data.downloadLinks);
        } catch (error) {
            console.error("Error uploading file", error);
        } finally {
            setIsUploading(false); // Re-enable the upload button
            setIsProcessing(false);
        }
    };

    // Only render the frontend if the user is allowed
    if (!isUserAllowed) {
        return (
            <div className="container">
                <h2>Email DNS Checker</h2>
                <div className="auth-forms">
                    {isRegistering ? (
                        <>
                            <h3>Register</h3>
                            <form onSubmit={handleFirebaseRegister}>
                                <div className="form-group">
                                    <label>Email:</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password:</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="auth-button">
                                    Register
                                </button>
                            </form>
                            <p className="toggle-auth">
                                Already have an account?{" "}
                                <span onClick={() => setIsRegistering(false)}>Login here</span>
                            </p>
                        </>
                    ) : (
                        <>
                            <h3>Login</h3>
                            <form onSubmit={handleFirebaseLogin}>
                                <div className="form-group">
                                    <label>Email:</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Password:</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <button type="submit" className="auth-button">
                                    Login
                                </button>
                            </form>
                            <p className="toggle-auth">
                                Don't have an account?{" "}
                                <span onClick={() => setIsRegistering(true)}>Register here</span>
                            </p>
                        </>
                    )}

                    {authError && <p className="error-message">{authError}</p>}
                </div>
            </div>
        );
    }

    // Render the main application if the user is allowed
    return (
        <div className="container">
            <h2>Email DNS Checker</h2>
            <div className="logout-section">
                <button onClick={handleLogout} className="logout-button">
                    Logout
                </button>
            </div>

            <div className="file-input">
                <input type="file" accept=".csv" id="file-upload" onChange={handleFileChange} />
                <label htmlFor="file-upload">Choose CSV File</label>
            </div>

            {columns.length > 0 && (
                <div className="select-container">
                    <select onChange={(e) => setSelectedColumn(e.target.value)}>
                        <option value="">Select Email Column</option>
                        {columns.map((col) => (
                            <option key={col} value={col}>{col}</option>
                        ))}
                    </select>
                </div>
            )}

            <button
                className="upload-button"
                onClick={handleUpload}
                disabled={isUploading || !file || !selectedColumn} // Disable button when uploading
            >
                {isUploading ? "Uploading..." : "Upload"} {/* Change button text when uploading */}
            </button>

            {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="progress-container">
                    <div>Uploading: {uploadProgress}%</div>
                    <progress value={uploadProgress} max="100" />
                </div>
            )}

            {isProcessing && uploadProgress === 100 && (
                <div className="processing-message">
                    Processing file, please wait...
                </div>
            )}

            {downloadLinks.length > 0 && (
                <div className="download-links">
                    <h3>Download Results</h3>
                    {downloadLinks.map((link, index) => (
                        <a
                            key={index}
                            href={`https://dns-verifier-backend.onrender.com/download/${link.file.split("/").pop()}`}
                            download
                        >
                            Download {link.category} CSV
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;
