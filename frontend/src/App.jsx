import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardHR from './pages/DashboardHR';
import DashboardManager from './pages/DashboardManager';
import DashboardEmployee from './pages/DashboardEmployee';
import Settings from './pages/Settings';
import HelpCenter from './pages/HelpCenter';
import Jobs from './pages/Jobs';
import Candidates from './pages/Candidates';
import EmployeeDirectory from './pages/EmployeeDirectory';
import Attendance from './pages/Attendance';
import Performance from './pages/Performance';
import InterviewAssistant from './pages/InterviewAssistant';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
    );

    if (!user) return <Navigate to="/login" />;
    
    if (roles && !roles.includes(user.role.toLowerCase())) {
        return <Navigate to={`/dashboard/${user.role.toLowerCase()}`} />;
    }

    return children;
};

const LandingRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
            </div>
        );
    }

    if (user) {
        return <Navigate to={`/dashboard/${user.role.toLowerCase()}`} replace />;
    }

    return <Landing />;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<LandingRoute />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    
                    {/* Role-Based Dashboards */}
                    <Route path="/dashboard/hr" element={
                        <ProtectedRoute roles={['admin', 'hr']}>
                            <DashboardHR />
                        </ProtectedRoute>
                    } />
                    <Route path="/dashboard/admin" element={
                        <ProtectedRoute roles={['admin', 'hr']}>
                            <DashboardHR />
                        </ProtectedRoute>
                    } />
                    <Route path="/dashboard/manager" element={
                        <ProtectedRoute roles={['manager']}>
                            <DashboardManager />
                        </ProtectedRoute>
                    } />
                    <Route path="/dashboard/employee" element={
                        <ProtectedRoute roles={['employee']}>
                            <DashboardEmployee />
                        </ProtectedRoute>
                    } />

                    <Route path="/employees" element={
                        <ProtectedRoute roles={['admin', 'hr', 'manager']}>
                            <EmployeeDirectory />
                        </ProtectedRoute>
                    } />

                    <Route path="/attendance" element={
                        <ProtectedRoute roles={['admin', 'hr', 'manager', 'employee']}>
                            <Attendance />
                        </ProtectedRoute>
                    } />

                    <Route path="/performance" element={
                        <ProtectedRoute roles={['admin', 'hr', 'manager', 'employee']}>
                            <Performance />
                        </ProtectedRoute>
                    } />

                    <Route path="/interviews" element={
                        <ProtectedRoute roles={['admin', 'hr']}>
                            <InterviewAssistant />
                        </ProtectedRoute>
                    } />

                    <Route path="/settings" element={
                        <ProtectedRoute roles={['admin', 'hr', 'manager', 'employee']}>
                            <Settings />
                        </ProtectedRoute>
                    } />

                    <Route path="/help" element={
                        <ProtectedRoute roles={['admin', 'hr', 'manager', 'employee']}>
                            <HelpCenter />
                        </ProtectedRoute>
                    } />

                    <Route path="/jobs" element={
                        <ProtectedRoute roles={['admin', 'hr', 'manager']}>
                            <Jobs />
                        </ProtectedRoute>
                    } />
                    <Route path="/candidates" element={
                        <ProtectedRoute roles={['admin', 'hr', 'manager']}>
                            <Candidates />
                        </ProtectedRoute>
                    } />

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
