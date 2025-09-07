import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useAnalyzeStore } from "../store/useAnalyzeStore.js";
import { Upload } from 'lucide-react';

export default function UploadPage() {
  const navigate = useNavigate();
  const { analyzeCandidate, isAnalyzing, clearAnalysis } = useAnalyzeStore();
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => setResumeFile(acceptedFiles[0]),
    accept: { "application/pdf": [".pdf"], "application/msword": [".doc", ".docx"] },
    multiple: false,
  });

  const handleAnalyze = async () => {
    try {
      clearAnalysis();
      await analyzeCandidate(resumeFile, jobDescription);
      navigate("/courses");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Upload Resume & Analyze</h1>

      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-indigo-500 bg-indigo-50 scale-105 shadow-md"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:shadow-md"
        }`}
      >
        <input {...getInputProps()} />
        {resumeFile ? (
          <p className="text-green-600 font-medium">{resumeFile.name}</p>
        ) : (
          <div className="flex flex-col items-center text-gray-500 gap-3">
            <Upload />
            <p className="font-medium">Drag & drop your resume</p>
            <p className="text-sm text-gray-400">or click to browse files PDF only</p>
          </div>
        )}
      </div>
      <textarea
        className="w-full border border-gray-300 rounded-xl mt-4 p-2"
        rows={5}
        placeholder="Paste job description here..."
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-xl cursor-pointer hover:bg-indigo-700 disabled:opacity-50"
      >
        {isAnalyzing ? "Analyzing..." : "Analyze"}
      </button>
    </div>
  );
}
