import React, { useState, useMemo } from 'react';
import { User, Company } from '../types';
import { XMarkIcon, PencilIcon, TrashIcon, LockClosedIcon, LockOpenIcon, MagnifyingGlassIcon } from './icons';
import EditUserModal from './EditUserModal';
import ConfirmationModal from './ConfirmationModal';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  companies: Company[];
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  companies,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  const companyMap = useMemo(() => new Map(companies.map(c => [c.id, c.name])), [companies]);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleDeleteRequest = (user: User) => {
    setUserToDelete(user);
    setConfirmModalOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
    }
  };

  const handleToggleDisable = (user: User) => {
    const action = user.isDisabled ? 'enable' : 'disable';
    if (window.confirm(`Are you sure you want to ${action} this user's account?`)) {
      onUpdateUser({ ...user, isDisabled: !user.isDisabled });
    }
  };
  
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const lowercasedQuery = searchQuery.toLowerCase();
    return users.filter(user =>
        user.name.toLowerCase().includes(lowercasedQuery) ||
        user.email.toLowerCase().includes(lowercasedQuery) ||
        companyMap.get(user.companyId)?.toLowerCase().includes(lowercasedQuery)
    );
  }, [users, searchQuery, companyMap]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 transition-opacity p-4 overflow-y-auto">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-xl mt-10 mb-10 w-full max-w-4xl relative animate-fade-in-up text-slate-800 dark:text-white">
          <header className="p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">User Management</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage all users across the platform.</p>
                </div>
                <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                    <XMarkIcon className="w-6 h-6" />
                </button>
            </div>
             <div className="relative mt-4">
                <input
                    type="text"
                    placeholder="Search by name, email, or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg pl-10 pr-4 py-2 text-slate-800 dark:text-white focus:ring-teal-500 focus:border-teal-500"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
          </header>
          
          <div className="p-6">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-200 dark:bg-slate-700/50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Company</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Role</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredUsers.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">{companyMap.get(user.companyId) || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300">{user.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isDisabled ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300'}`}>
                          {user.isDisabled ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleToggleDisable(user)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white" title={user.isDisabled ? 'Enable User' : 'Disable User'}>
                                {user.isDisabled ? <LockOpenIcon className="w-5 h-5"/> : <LockClosedIcon className="w-5 h-5"/>}
                            </button>
                            <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Edit User">
                                <PencilIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={() => handleDeleteRequest(user)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300" title="Delete User">
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredUsers.length === 0 && (
                <p className="text-center py-8 text-slate-500">No users found.</p>
            )}
          </div>
        </div>
      </div>
      {isEditModalOpen && selectedUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={onUpdateUser}
          user={selectedUser}
          companies={companies}
        />
      )}
      {isConfirmModalOpen && userToDelete && (
        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false);
            setUserToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete User"
          message={`Are you sure you want to permanently delete the user ${userToDelete.name} (${userToDelete.email})? This action cannot be undone.`}
          confirmText="Delete User"
        />
      )}
    </>
  );
};

export default UserManagementModal;