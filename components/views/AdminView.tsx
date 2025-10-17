import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import * as dbService from '../../services/dbService';
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon } from '../Icons';

const AdminView: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' as 'user' | 'admin' });
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const allUsers = await dbService.getAllUsers();
            setUsers(allUsers);
        } catch (e) {
            console.error("Failed to fetch users", e);
            setError("Could not load user data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.username.trim() || !newUser.password.trim()) {
            setError("Username and password are required.");
            return;
        }

        try {
            const existingUser = await dbService.getUserByUsername(newUser.username.trim());
            if (existingUser) {
                setError("Username already exists.");
                return;
            }

            // FIX: Add missing 'friends' property to satisfy the User type.
            const userToSave: User = {
                id: `user_${Date.now()}`,
                username: newUser.username.trim(),
                password: newUser.password.trim(), // Storing plaintext as requested
                role: newUser.role,
                createdAt: new Date().toISOString(),
                friends: [],
            };

            await dbService.saveUser(userToSave);
            setNewUser({ username: '', password: '', role: 'user' });
            setIsCreating(false);
            setError(null);
            await fetchUsers(); // Refresh the list
        } catch (err) {
            console.error("Failed to create user", err);
            setError("An error occurred while creating the user.");
        }
    };
    
    const handleDeleteUser = async (user: User) => {
        if (user.role === 'admin') {
            alert("Admin accounts cannot be deleted from this panel.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete the user "${user.username}"? This action cannot be undone.`)) {
            try {
                await dbService.deleteUser(user.id);
                await fetchUsers();
            } catch (err) {
                 console.error("Failed to delete user", err);
                 setError("An error occurred while deleting the user.");
            }
        }
    }


    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">Admin Panel - User Management</h1>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-[var(--color-primary-600)] transition-colors"
                    >
                        <PlusIcon className="w-5 h-5"/>
                        New User
                    </button>
                )}
            </div>

            {isCreating && (
                 <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-6">
                    <h2 className="text-xl font-bold mb-4">Create New User</h2>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Username</label>
                                <input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2.5 text-sm" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Password</label>
                                <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2.5 text-sm" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
                                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as 'user' | 'admin'})} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2.5 text-sm">
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => { setIsCreating(false); setError(null); }} className="bg-[var(--bg-quaternary)] text-[var(--text-primary)] px-4 py-2 rounded-md text-sm font-semibold hover:bg-[var(--border-color)] transition-colors">Cancel</button>
                            <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-600 transition-colors">Create User</button>
                        </div>
                    </form>
                 </div>
            )}

            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] overflow-hidden">
                 <table className="min-w-full divide-y divide-[var(--border-color)]">
                    <thead className="bg-[var(--bg-tertiary)]/50">
                        <tr>
                            <th className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-[var(--text-primary)]">Username</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-[var(--text-primary)]">Role</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-[var(--text-primary)]">Created At</th>
                            <th className="relative py-3.5 pl-3 pr-6"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                        {isLoading ? (
                            <tr><td colSpan={4} className="text-center p-8 text-[var(--text-secondary)]">Loading users...</td></tr>
                        ) : users.map(user => (
                            <tr key={user.id}>
                                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-[var(--text-primary)]">{user.username}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-[var(--text-secondary)]">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-700 text-slate-300'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-[var(--text-secondary)]">{new Date(user.createdAt).toLocaleString()}</td>
                                <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right">
                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full"
                                        >
                                            <TrashIcon className="w-5 h-5"/>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        </div>
    );
};

export default AdminView;