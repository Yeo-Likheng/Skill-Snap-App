import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useAnalyzeStore } from "../store/useAnalyzeStore.js";
import { Upload } from 'lucide-react';
import toast from "react-hot-toast";

export default function GenerateCoverLetter() {
  const { generateCoverLetter, coverLetter, clearCoverLetter, isGeneratingCoverLetter, fetchUserCoverLetter } = useAnalyzeStore();
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [editableLetter, setEditableLetter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserCoverLetter = async () => {
      setIsLoading(true);
      const data = await fetchUserCoverLetter();
      if (data) {
        setEditableLetter(data);
      }
      setIsLoading(false);
    };

    loadUserCoverLetter();
  }, [fetchUserCoverLetter]);

  useEffect(() => {
    if (coverLetter) {
      setEditableLetter(coverLetter);
    }
  }, [coverLetter]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => setResumeFile(acceptedFiles[0]),
    accept: { "application/pdf": [".pdf"], "application/msword": [".doc", ".docx"] },
    multiple: false,
  });

  const handleGenerate = async () => {
    try {
      clearCoverLetter();
      const newCoverLetter = await generateCoverLetter(resumeFile, jobDescription);
      if (newCoverLetter) {
        setResumeFile(null);
        setJobDescription("");
        setEditableLetter(newCoverLetter);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableLetter);
    toast.success("Cover Letter Copied")
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your cover letter...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Generate Cover Letter</h1>

      {editableLetter && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-800 text-sm">
            📄 You have a previously generated cover letter. You can edit it below or generate a new one.
          </p>
        </div>
      )}

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
        onClick={handleGenerate}
        disabled={isGeneratingCoverLetter}
        className="mt-4 w-full bg-indigo-600 text-white py-2 rounded-xl cursor-pointer hover:bg-indigo-700 disabled:opacity-50"
      >
        {isGeneratingCoverLetter ? "Generating..." : "Generate Cover Letter"}
      </button>

      {editableLetter && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Your Cover Letter</h2>
          <textarea
            className="w-full border border-gray-300 rounded-xl p-3 h-64"
            value={editableLetter}
            onChange={(e) => setEditableLetter(e.target.value)}
          />
          <button
            onClick={handleCopy}
            className="mt-3 bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 cursor-pointer"
          >
            Copy Cover Letter
          </button>
        </div>
      )}
    </div>
  );
}
