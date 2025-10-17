import React, { useState } from 'react';
import { User } from '../types';
import * as authService from '../services/authService';
import { SparklesIcon } from './Icons';

interface LoginPageProps {
    onLoginSuccess: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const user = await authService.login(username, password);

        if (user) {
            onLoginSuccess(user);
        } else {
            setError('Invalid username or password.');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)] p-4">
            <div className="w-full max-w-sm mx-auto">
                <div className="text-center mb-8">
                    <SparklesIcon className="w-12 h-12 mx-auto text-[var(--color-primary-400)]" />
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mt-2">Synergy AI</h1>
                    <p className="text-[var(--text-secondary)]">Your intelligent workspace</p>
                </div>
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] shadow-lg p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                            >
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] transition-colors"
                            />
                        </div>
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center bg-[var(--color-primary-500)] text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-secondary)] disabled:opacity-50"
                            >
                                {isLoading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
