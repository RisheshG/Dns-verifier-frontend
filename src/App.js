import React, { useState } from "react";
import axios from "axios";
import Papa from "papaparse";
import "./styles.css";

function App() {
    const [file, setFile] = useState(null);
    const [columns, setColumns] = useState([]);
    const [selectedColumn, setSelectedColumn] = useState("");
    const [downloadLinks, setDownloadLinks] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Handle file change
    const handleFileChange = (event) => {
        const uploadedFile = event.target.files[0];
        setFile(uploadedFile);

        Papa.parse(uploadedFile, {
            complete: (result) => {
                if (result.data && result.data.length > 0) {
                    setColumns(Object.keys(result.data[0]));
                }
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

        setIsUploading(true);
        setUploadProgress(0);
        setIsProcessing(true);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("column", selectedColumn);

        try {
            const response = await axios.post("https://dns-verifier-backend.onrender.com/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                },
            });

            setDownloadLinks(response.data.downloadLinks);
        } catch (error) {
            console.error("Error uploading file", error);
        } finally {
            setIsUploading(false);
            setIsProcessing(false);
        }
    };

    return (
        <div className="container">
            <h2>Email DNS Checker</h2>

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
                disabled={isUploading || !file || !selectedColumn}
            >
                {isUploading ? "Uploading..." : "Upload"}
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
                        <div key={index} className="download-item">
                            <span>{link.count} → </span>
                            <a
                                href={`https://dns-verifier-backend.onrender.com/download/${link.file.split("/").pop()}`}
                                download
                            >
                                {link.category} CSV
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;
