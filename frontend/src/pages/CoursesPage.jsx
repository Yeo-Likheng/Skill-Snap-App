import { useState, useEffect } from "react";
import { useAnalyzeStore } from "../store/useAnalyzeStore.js";

export default function CoursePage() {
  const { courseSuggestions, fetchUserSuggestion } = useAnalyzeStore();
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserSuggestion = async () => {
      setIsLoading(true);
      await fetchUserSuggestion();
      setIsLoading(false);
    };

    loadUserSuggestion();
  }, [fetchUserSuggestion]);

  useEffect(() => {
    if (
      courseSuggestions &&
      Object.keys(courseSuggestions).length > 0 &&
      !selectedSkill
    ) {
      setSelectedSkill(Object.keys(courseSuggestions)[0]);
    }
  }, [courseSuggestions, selectedSkill]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mt-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your course suggestions...</p>
        </div>
      </div>
    );
  }

  if (!courseSuggestions || Object.keys(courseSuggestions).length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Course Suggestions</h1>
        <div className="text-center mt-10">
          <p className="text-gray-600 mb-4">No course suggestions available.</p>
          <p className="text-sm text-gray-500">Please analyze a resume first to get personalized course recommendations.</p>
        </div>
      </div>
    );
  }

  const skills = Object.keys(courseSuggestions);
  const courses = selectedSkill ? courseSuggestions[selectedSkill] : [];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Course Suggestions</h1>

      {courseSuggestions && Object.keys(courseSuggestions).length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-blue-800 text-sm">
            📚 Showing your personalized course recommendations based on your latest resume analysis.
          </p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-6">
        {skills.map((skill) => (
          <button
            key={skill}
            onClick={() => setSelectedSkill(skill)}
            className={`px-4 py-2 rounded-xl cursor-pointer ${
              selectedSkill === skill
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {skill}
          </button>
        ))}
      </div>

      {selectedSkill && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{selectedSkill} Courses</h2>
          <ul className="space-y-3">
            {courses.map((course, idx) => (
              <li
                key={idx}
                className="border p-4 rounded-xl shadow-sm hover:shadow-md flex items-center gap-4"
              >
                <img
                  src={course.image}
                  alt={course.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="font-medium">{course.title}</p>
                  <p className="text-sm text-gray-600">{course.platform}</p>
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                  >
                    View Course
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
