import { generateCoverLetter } from "../services/coverLetterService.js";
import CoverLetter from "../models/letter.model.js";
import fs from "fs";
import path from "path";

// Main controller function for file uploads
export async function createCoverLetter(req, res) {
  try {
    // Validate authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        error: "Authentication required. Please log in to generate cover letters." 
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        error: "No resume file provided. Please upload a PDF or image file." 
      });
    }

    // Get job description from request body
    const { jobDescription } = req.body;

    if (!jobDescription) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        error: "Missing jobDescription in request body" 
      });
    }

    const userId = req.user._id;

    console.log(`Processing resume file: ${req.file.originalname}`);
    console.log(`File extension from original name: ${path.extname(req.file.originalname)}`);
    console.log(`File extension from path: ${path.extname(req.file.path)}`);

    // Generate cover letter using the uploaded file and original filename
    const result = await generateCoverLetter(req.file.path, jobDescription, req.file.originalname);

    // Clean up uploaded file after processing
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Delete previous cover letters for this user before storing new one
    try {
      const deletedCount = await CoverLetter.deleteMany({ userId });
      console.log(`Deleted ${deletedCount.deletedCount} previous cover letters for user ${userId}`);
    } catch (deleteError) {
      console.error("Error deleting previous cover letters:", deleteError);
      // Continue with saving new cover letter even if deletion fails
    }

    // Save new cover letter to MongoDB
    try {
      const coverLetterData = {
        userId,
        coverLetter: result.coverLetter,
        candidateInfo: result.candidateInfo,
        jobDescription,
        metadata: {
          fileName: req.file.originalname,
          extractedTextPreview: result.extractedText,
          generationMethod: 'AI'
        }
      };

      const savedCoverLetter = await CoverLetter.create(coverLetterData);
      console.log("Cover letter saved to MongoDB with ID:", savedCoverLetter._id);
    } catch (saveError) {
      console.error("Error saving cover letter to MongoDB:", saveError);
      // Continue with response even if saving fails
    }

    res.json({
      success: true,
      coverLetter: result.coverLetter,
      candidateInfo: result.candidateInfo,
      extractedTextPreview: result.extractedText
    });

  } catch (error) {
    // Clean up uploaded file if processing fails
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error("Error in createCoverLetter:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// Alternative controller for base64 file uploads
export async function createCoverLetterFromBase64(req, res) {
  try {
    // Validate authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        error: "Authentication required. Please log in to generate cover letters." 
      });
    }

    const { fileData, fileName, jobDescription } = req.body;

    if (!fileData || !fileName || !jobDescription) {
      return res.status(400).json({ 
        success: false,
        error: "Missing fileData, fileName, or jobDescription" 
      });
    }

    const userId = req.user._id;

    // Create temporary file from base64 data
    const uploadDir = './uploads/temp/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const tempFilePath = path.join(uploadDir, `temp-${uniqueSuffix}-${fileName}`);

    // Decode base64 and save to temporary file
    const base64Data = fileData.replace(/^data:.*,/, '');
    fs.writeFileSync(tempFilePath, base64Data, 'base64');

    try {
      // Generate cover letter
      const result = await generateCoverLetter(tempFilePath, jobDescription);

      // Clean up temporary file
      fs.unlinkSync(tempFilePath);

      // Delete previous cover letters for this user before storing new one
      try {
        const deletedCount = await CoverLetter.deleteMany({ userId });
        console.log(`Deleted ${deletedCount.deletedCount} previous cover letters for user ${userId}`);
      } catch (deleteError) {
        console.error("Error deleting previous cover letters:", deleteError);
        // Continue with saving new cover letter even if deletion fails
      }

      // Save new cover letter to MongoDB
      try {
        const coverLetterData = {
          userId,
          coverLetter: result.coverLetter,
          candidateInfo: result.candidateInfo,
          jobDescription,
          metadata: {
            fileName: fileName,
            extractedTextPreview: result.extractedText,
            generationMethod: 'AI'
          }
        };

        const savedCoverLetter = await CoverLetter.create(coverLetterData);
        console.log("Cover letter saved to MongoDB with ID:", savedCoverLetter._id);
      } catch (saveError) {
        console.error("Error saving cover letter to MongoDB:", saveError);
        // Continue with response even if saving fails
      }

      res.json({
        success: true,
        coverLetter: result.coverLetter,
        candidateInfo: result.candidateInfo,
        extractedTextPreview: result.extractedText
      });

    } catch (error) {
      // Clean up temporary file if processing fails
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw error;
    }

  } catch (error) {
    console.error("Error in createCoverLetterFromBase64:", error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

// Get user's latest cover letter from MongoDB
export async function getUserCoverLetter(req, res) {
  try {
    // Validate authentication
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        error: "Authentication required. Please log in to view cover letters." 
      });
    }

    const userId = req.user._id;

    // Find the latest cover letter for this user
    const coverLetter = await CoverLetter.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    if (!coverLetter) {
      return res.json({
        success: true,
        coverLetter: null,
        message: "No cover letters found. Please generate a cover letter first."
      });
    }

    res.json({
      success: true,
      coverLetter: coverLetter.coverLetter,
      candidateInfo: coverLetter.candidateInfo,
      metadata: coverLetter.metadata,
      createdAt: coverLetter.createdAt
    });

  } catch (error) {
    console.error("Error fetching user cover letter:", error);
    res.status(500).json({
      error: "Internal server error while fetching cover letter",
      details: error.message
    });
  }
}
