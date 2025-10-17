import { User } from '../types';
import * as dbService from './dbService';

const SESSION_KEY = 'synergy-ai-user-session';

export const login = async (username: string, password: string): Promise<User | null> => {
    const user = await dbService.getUserByUsername(username);
    if (user && user.password === password) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
    }
    return null;
};

export const logout = (): void => {
    sessionStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
    const userJson = sessionStorage.getItem(SESSION_KEY);
    if (userJson) {
        try {
            return JSON.parse(userJson);
        } catch (error) {
            console.error('Failed to parse user session JSON:', error);
            return null;
        }
    }
    return null;
};
