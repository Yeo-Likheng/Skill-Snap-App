// models/Suggestion.js
import mongoose from "mongoose";

const suggestionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resumeSkills: [{
        type: String,
        trim: true
    }],
    jobSkills: [{
        type: String,
        trim: true
    }],
    missingSkills: [{
        type: String,
        trim: true
    }],
    courseSuggestions: {
        type: mongoose.Schema.Types.Mixed, 
        default: {}
    },
    matchingScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    metadata: {
        fileName: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number,
            required: true
        },
        processingMethod: {
            type: String,
            enum: ['AI', 'Fallback'],
            default: 'AI'
        },
        skillsFound: {
            type: Number,
            default: 0
        },
        missingSkillsCount: {
            type: Number,
            default: 0
        }
    },
    jobDescription: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});


// Index for faster queries by user
suggestionSchema.index({ userId: 1, createdAt: -1 });

const Suggestion = mongoose.model("Suggestion", suggestionSchema);

export default Suggestion;
