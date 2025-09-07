import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore.js';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';
import LoginPage from './pages/LoginPage.jsx';
import SignUpPage from './pages/SignUpPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import CoursesPage from './pages/CoursesPage.jsx';
import CoverLetterPage from './pages/CoverLetterPage.jsx';
import { Toaster } from 'react-hot-toast';

const App = () => {
  const { authUser, isCheckingAuth, checkAuth } = useAuthStore();

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if(isCheckingAuth && !authUser){
    return (
      <LoadingSpinner />
    );
  }

  return (
   <>
   <Navbar />
    <Routes>
        <Route path="/" element={authUser ? <UploadPage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/courses" element={authUser ? <CoursesPage /> : <Navigate to="/" />} />
        <Route path="/cover-letter" element={authUser ? <CoverLetterPage /> : <Navigate to="/login" />} />
    </Routes>
    
    <Toaster />
   </>
  )
}

export default App