// models/CoverLetter.js
import mongoose from "mongoose";

const coverLetterSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coverLetter: {
        type: String,
        required: true,
        trim: true
    },
    candidateInfo: {
        name: {
            type: String,
            trim: true
        },
        email: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        },
        // Add other candidate info fields as needed
        experience: [{
            type: String,
            trim: true
        }],
        skills: [{
            type: String,
            trim: true
        }],
        education: [{
            type: String,
            trim: true
        }]
    },
    jobDescription: {
        type: String,
        required: true,
        trim: true
    },
    metadata: {
        fileName: {
            type: String,
            required: true
        },
        extractedTextPreview: {
            type: String,
            trim: true
        },
        generationMethod: {
            type: String,
            enum: ['AI', 'Template'],
            default: 'AI'
        }
    }
}, {
    timestamps: true
});

// Index for faster queries by user
coverLetterSchema.index({ userId: 1, createdAt: -1 });

const CoverLetter = mongoose.model("CoverLetter", coverLetterSchema);

export default CoverLetter;
