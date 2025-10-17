import React, { useState, useEffect } from 'react';
import App from './App';
import LoginPage from './components/LoginPage';
import Loader from './components/Loader';
import * as authService from './services/authService';
import * as dbService from './services/dbService';
import { User } from './types';

const Root: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            await dbService.initDB();
            const user = authService.getCurrentUser();
            if (user) {
                setCurrentUser(user);
            }
            setIsAuthLoading(false);
        };
        init();
    }, []);

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
    };

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
    };

    if (isAuthLoading) {
        return (
            <div className="flex h-full min-h-screen bg-[var(--bg-primary)] items-center justify-center">
                <Loader />
            </div>
        );
    }

    return currentUser ? (
        <App currentUser={currentUser} onLogout={handleLogout} />
    ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
    );
};

export default Root;
