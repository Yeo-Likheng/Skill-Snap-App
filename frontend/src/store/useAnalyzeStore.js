import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useAnalyzeStore = create(
    (set, get) => ({
    
      isAnalyzing: false,
      isGeneratingCoverLetter: false,
      courseSuggestions: null, 
      coverLetter: null,

      analyzeCandidate: async (resumeFile, jobDescription) => {
        set({ isAnalyzing: true, error: null });
        try {
          if (!resumeFile) throw new Error("Resume file is required");
          if (!jobDescription?.trim()) throw new Error("Job description is required");

          const formData = new FormData();
          formData.append("resume", resumeFile);
          formData.append("jobDescription", jobDescription);

          const { data } = await axiosInstance.post("/resumes/analyze", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (!data.success) throw new Error(data.error || "Analysis failed");

          // Store the course suggestions directly
          set({ courseSuggestions: data.courseSuggestions || {} });

          toast.success("Resume analyzed successfully!");
          return data.courseSuggestions || {};
        } catch (err) {
          const message = err.response?.data?.error || err.message;
          set({ error: message, courseSuggestions: null });
          toast.error(message);
          throw err;
        } finally {
          set({ isAnalyzing: false });
        }
      },

      // Generate Cover Letter
      generateCoverLetter: async (resumeFile, jobDescription) => {
        set({ isGeneratingCoverLetter: true, error: null });
        try {
          if (!resumeFile) throw new Error("Resume file is required");
          if (!jobDescription?.trim()) throw new Error("Job description is required");

          const formData = new FormData();
          formData.append("resume", resumeFile);
          formData.append("jobDescription", jobDescription);

          const { data } = await axiosInstance.post("/resumes/cover-letter", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          if (!data.success) throw new Error(data.error || "Cover letter generation failed");

          set({ coverLetter: data.coverLetter });
          toast.success("Cover letter generated successfully!");
          return data.coverLetter;
        } catch (err) {
          const message = err.response?.data?.error || err.message;
          set({ error: message, coverLetter: null });
          toast.error(message);
          throw err;
        } finally {
          set({ isGeneratingCoverLetter: false });
        }
      },

      clearAnalysis: () => {
        set({
          courseSuggestions: null,
        });
      },

      clearCoverLetter: () => {
        set({
          coverLetter: null,
        });
      },

      // Fetch user-specific suggestion from MongoDB
      fetchUserSuggestion: async () => {
        try {
          const { data } = await axiosInstance.get("/resumes/suggestion");
          
          if (data.success && data.suggestion && data.suggestion.courseSuggestions) {
            // The courseSuggestions is already in the correct format from MongoDB
            set({ courseSuggestions: data.suggestion.courseSuggestions });
            return data.suggestion.courseSuggestions;
          } else {
            set({ courseSuggestions: null });
            return null;
          }
        } catch (err) {
          console.error("Error fetching user suggestion:", err);
          set({ courseSuggestions: null });
          return null;
        }
      },

      // Fetch user-specific cover letter from MongoDB
      fetchUserCoverLetter: async () => {
        try {
          const { data } = await axiosInstance.get("/resumes/cover-letter");
          
          if (data.success && data.coverLetter) {
            set({ coverLetter: data.coverLetter });
            return data.coverLetter;
          } else {
            set({ coverLetter: null });
            return null;
          }
        } catch (err) {
          console.error("Error fetching user cover letter:", err);
          set({ coverLetter: null });
          return null;
        }
      },

      getAllCourses: () => {
        const { courseSuggestions } = get();
        if (!courseSuggestions) return [];
        
        const allCourses = [];
        Object.keys(courseSuggestions).forEach(skill => {
          courseSuggestions[skill].forEach(course => {
            allCourses.push({
              ...course,
              skillCategory: skill
            });
          });
        });
        
        return allCourses;
      },

    }),
    {
      name: 'analyze-store', // Key for localStorage
      partialize: (state) => ({
        // Only persist the results
        courseSuggestions: state.courseSuggestions,
        coverLetter: state.coverLetter,
      }),
    }
  )
;
