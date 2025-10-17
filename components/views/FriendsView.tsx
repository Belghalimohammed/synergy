import React, { useState, useMemo } from 'react';
import { User, Invitation } from '../../types';
import { UserGroupIcon, TrashIcon, CheckIcon, XMarkIcon } from '../Icons';

interface FriendsViewProps {
  currentUser: User;
  allUsers: User[];
  invitations: Invitation[];
  onSendInvitation: (toId: string) => void;
  onAcceptInvitation: (invitation: Invitation) => void;
  onDeclineInvitation: (invitation: Invitation) => void;
  onRemoveFriend: (friendId: string) => void;
}

const FriendsView: React.FC<FriendsViewProps> = ({ currentUser, allUsers, invitations, onSendInvitation, onAcceptInvitation, onDeclineInvitation, onRemoveFriend }) => {
  const [activeTab, setActiveTab] = useState('friends');
  const [searchTerm, setSearchTerm] = useState('');
  
  const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u.username])), [allUsers]);

  const friends = useMemo(() => allUsers.filter(u => currentUser.friends.includes(u.id)), [allUsers, currentUser]);
  
  const incomingInvites = useMemo(() => invitations.filter(inv => inv.toId === currentUser.id && inv.status === 'pending'), [invitations, currentUser]);
  
  const sentInvites = useMemo(() => invitations.filter(inv => inv.fromId === currentUser.id), [invitations, currentUser]);

  const directoryUsers = useMemo(() => {
    const friendIds = new Set(currentUser.friends);
    const sentInviteIds = new Set(sentInvites.filter(i => i.status === 'pending').map(i => i.toId));
    
    return allUsers.filter(u => 
      u.id !== currentUser.id && 
      !friendIds.has(u.id) && 
      !sentInviteIds.has(u.id) &&
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allUsers, currentUser, sentInvites, searchTerm]);

  const tabs = [
    { id: 'friends', label: 'My Friends', count: friends.length },
    { id: 'invitations', label: 'Invitations', count: incomingInvites.length },
    { id: 'directory', label: 'Directory', count: 0 },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">Friends & Connections</h1>
      
      <div className="border-b border-[var(--border-color)]">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-semibold text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary-500)] text-[var(--color-primary-600)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${activeTab === tab.id ? 'bg-[var(--color-primary-500)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>{tab.count}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--border-radius)] p-6 min-h-[50vh]">
        {activeTab === 'friends' && (
            <div>
                {friends.length > 0 ? (
                    <ul className="divide-y divide-[var(--border-color)]">
                        {friends.map(friend => (
                            <li key={friend.id} className="py-3 flex items-center justify-between">
                                <span className="font-medium text-[var(--text-primary)]">{friend.username}</span>
                                <button onClick={() => onRemoveFriend(friend.id)} className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-md py-1 px-2 transition-colors">
                                    <TrashIcon className="w-4 h-4"/> Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-center text-sm text-[var(--text-muted)] py-8">Your friends list is empty. Find users in the Directory tab.</p>}
            </div>
        )}
        {activeTab === 'invitations' && (
            <div>
                 {incomingInvites.length > 0 ? (
                    <ul className="divide-y divide-[var(--border-color)]">
                        {incomingInvites.map(invite => (
                            <li key={invite.id} className="py-3 flex items-center justify-between">
                                <span className="font-medium text-[var(--text-primary)]">{userMap.get(invite.fromId) || 'Unknown User'} wants to be your friend.</span>
                                <div className="flex gap-2">
                                    <button onClick={() => onAcceptInvitation(invite)} className="flex items-center gap-1 bg-green-500/10 text-green-400 font-semibold text-sm px-3 py-1 rounded-md hover:bg-green-500/20"><CheckIcon className="w-4 h-4"/> Accept</button>
                                    <button onClick={() => onDeclineInvitation(invite)} className="flex items-center gap-1 bg-red-500/10 text-red-400 font-semibold text-sm px-3 py-1 rounded-md hover:bg-red-500/20"><XMarkIcon className="w-4 h-4"/> Decline</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-center text-sm text-[var(--text-muted)] py-8">You have no pending invitations.</p>}
            </div>
        )}
        {activeTab === 'directory' && (
            <div className="space-y-4">
                <input type="text" placeholder="Search all users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]" />
                 <ul className="divide-y divide-[var(--border-color)] max-h-96 overflow-y-auto">
                    {directoryUsers.map(user => (
                        <li key={user.id} className="py-3 flex items-center justify-between">
                            <span className="font-medium text-[var(--text-primary)]">{user.username}</span>
                            <button onClick={() => onSendInvitation(user.id)} className="bg-[var(--color-primary-500)] text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-[var(--color-primary-600)]">
                                Send Invite
                            </button>
                        </li>
                    ))}
                    {searchTerm && directoryUsers.length === 0 && <p className="text-center text-sm text-[var(--text-muted)] py-8">No users found matching "{searchTerm}".</p>}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};

export default FriendsView;