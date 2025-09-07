// controllers/analyzeController.js
import { extractResumeData } from "../services/documentQAService.js";
import { extractSkills } from "../services/nerService.js";
import { suggestCoursesFromSkills } from "../services/courseSuggestionService.js";
import Suggestion from "../models/suggestion.model.js";
import fs from "fs/promises";

export async function analyzeCandidate(req, res) {
  try {
    // Validate authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        error: "Authentication required. Please log in to analyze candidates." 
      });
    }

    // Validate request
    if (!req.file) {
      return res.status(400).json({ 
        error: "No resume file uploaded. Please upload a PDF, image, or Word document." 
      });
    }

    if (!req.body.jobDescription) {
      return res.status(400).json({ 
        error: "Job description is required" 
      });
    }

    const { jobDescription } = req.body;
    const resumeFilePath = req.file.path;
    const userId = req.user._id;

    console.log("Processing file:", resumeFilePath);
    console.log("File details:", {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Step 1: Extract and structure resume data
    let resumeResult;
    try {
      resumeResult = await extractResumeData(resumeFilePath, req.file.originalname);
      console.log("Resume extraction successful:", resumeResult.success);
    } catch (extractionError) {
      console.error("Resume extraction failed:", extractionError);
      return res.status(400).json({ 
        error: "Failed to process resume file",
        details: extractionError.message,
        suggestion: "Please ensure the file is a clear PDF, image, or Word document with readable text"
      });
    } finally {
      if (resumeFilePath) {
        try {
          await fs.unlink(resumeFilePath);
          console.log(`Deleted uploaded file: ${resumeFilePath}`);
        } catch (unlinkError) {
          console.warn("Failed to delete uploaded file:", unlinkError.message);
        }
      }
    }

    // Step 2: Extract skills from resume
    let resumeSkills = [];
    if (resumeResult.data && resumeResult.data.skills) {
      resumeSkills = resumeResult.data.skills;
    }

    if (resumeSkills.length === 0 && resumeResult.rawText) {
      try {
        resumeSkills = extractSkills(resumeResult.rawText);
      } catch (skillError) {
        console.error("Skills extraction failed:", skillError);
        resumeSkills = extractSkillsSimple(resumeResult.rawText);
      }
    }

    // Step 3: Extract job skills from job description
    let jobSkills = [];
    try {
      jobSkills = extractSkills(jobDescription);
    } catch (jobSkillError) {
      console.error("Job skill extraction failed:", jobSkillError);
      jobSkills = extractSkillsSimple(jobDescription);
    }

    // Step 4: Find missing skills (no AI matching)
    const missingSkills = jobSkills.filter(jobSkill =>
      !resumeSkills.some(resumeSkill =>
        resumeSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(resumeSkill.toLowerCase())
      )
    );

    // Step 5: Suggest courses for missing skills
    let courseSuggestions = {};
    try {
      if (missingSkills.length > 0) {
        const courseResult = await suggestCoursesFromSkills(missingSkills);
        // Extract the suggestions object from the service response
        courseSuggestions = courseResult.suggestions || {};
      }
    } catch (courseError) {
      console.error("Course suggestion failed:", courseError);
      courseSuggestions = {};
    }
    
    // If no courses found, set empty object
    if (Object.keys(courseSuggestions).length === 0) {
      courseSuggestions = {};
    }

    // Step 6: Delete previous suggestions for this user before storing new ones
    try {
      const deletedCount = await Suggestion.deleteMany({ userId });
      console.log(`Deleted ${deletedCount.deletedCount} previous suggestions for user ${userId}`);
    } catch (deleteError) {
      console.error("Error deleting previous suggestions:", deleteError);
    }

    // Step 7: Save new suggestion to MongoDB
    try {
      const suggestionData = {
        userId,
        resumeSkills,
        jobSkills,
        missingSkills,
        courseSuggestions,
        matchingScore: calculateMatchingScore(resumeSkills, jobSkills, missingSkills),
        metadata: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          processingMethod: resumeResult.success ? "AI" : "Fallback",
          skillsFound: resumeSkills.length,
          missingSkillsCount: missingSkills.length
        },
        jobDescription
      };

      const savedSuggestion = await Suggestion.create(suggestionData);
      console.log("Suggestion saved to MongoDB with ID:", savedSuggestion._id);
    } catch (saveError) {
      console.error("Error saving suggestion to MongoDB:", saveError);
      // Continue with response even if saving fails
    }

    const response = {
      success: true,
      resumeSkills,
      jobSkills,
      missingSkills,
      courseSuggestions,
      matchingScore: calculateMatchingScore(resumeSkills, jobSkills, missingSkills),
      metadata: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        processingMethod: resumeResult.success ? "AI" : "Fallback",
        skillsFound: resumeSkills.length,
        missingSkillsCount: missingSkills.length
      }
    };

    console.log("Analysis completed successfully");
    res.json(response);

  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      error: "Internal server error during analysis",
      details: error.message
    });
  }
}

// Helper functions
function extractSkillsSimple(text) {
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Swift', 'Kotlin',
    'React', 'Vue', 'Angular', 'Node.js', 'Express', 'HTML', 'CSS', 'SASS', 'TypeScript',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'SQL',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitHub',
    'Machine Learning', 'Data Science', 'AI', 'REST API', 'GraphQL',
    'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication'
  ];

  const foundSkills = [];
  const lowerText = text.toLowerCase();

  commonSkills.forEach(skill => {
    if (lowerText.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });

  return [...new Set(foundSkills)];
}

function calculateMatchingScore(jobSkills, missingSkills) {
  if (jobSkills.length === 0) return 0;

  const matchedSkills = jobSkills.length - missingSkills.length;
  const score = Math.round((matchedSkills / jobSkills.length) * 100);

  // Clamp score to 0–100 range
  return Math.max(0, Math.min(100, score));
}

// Get user's latest suggestion from MongoDB
export async function getUserSuggestion(req, res) {
  try {
    // Validate authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        error: "Authentication required. Please log in to view suggestions." 
      });
    }

    const userId = req.user._id;

    // Find the latest suggestion for this user
    const suggestion = await Suggestion.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!suggestion) {
      return res.json({
        success: true,
        suggestion: null,
        message: "No suggestions found. Please analyze a resume first."
      });
    }

    res.json({
      success: true,
      suggestion: {
        resumeSkills: suggestion.resumeSkills,
        jobSkills: suggestion.jobSkills,
        missingSkills: suggestion.missingSkills,
        courseSuggestions: suggestion.courseSuggestions,
        matchingScore: suggestion.matchingScore,
        metadata: suggestion.metadata,
        createdAt: suggestion.createdAt
      }
    });

  } catch (error) {
    console.error("Error fetching user suggestion:", error);
    res.status(500).json({
      error: "Internal server error while fetching suggestions",
      details: error.message
    });
  }
}
