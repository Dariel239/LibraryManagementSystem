import { useState } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ProfilePage() {
  const { user, updateProfile, changePassword } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [nameError, setNameError] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleNameSubmit(e) {
    e.preventDefault();
    setNameError('');
    setSavingName(true);
    try {
      await updateProfile(name.trim());
      showToast('Profile updated');
    } catch (err) {
      setNameError(err.response?.data?.error || 'Could not update your profile.');
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError('');
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password changed');
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Could not change your password.');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <AppLayout>
      <h1 className="font-display text-2xl font-semibold text-primary mb-1">Profile</h1>
      <p className="text-sm text-muted mb-6">Manage your account details.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <form onSubmit={handleNameSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-primary mb-1">Name</h2>

          {nameError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{nameError}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Display name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Email</label>
            <input
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-border rounded-md bg-gray-50 text-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted mt-1">Email can't be changed.</p>
          </div>

          <button
            type="submit"
            disabled={savingName || !name.trim()}
            className="w-full bg-accent hover:bg-accent-hover text-white font-medium py-2 rounded-md transition-colors disabled:opacity-60"
          >
            {savingName ? 'Saving…' : 'Save name'}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <h2 className="font-display text-lg font-semibold text-primary mb-1">Password</h2>

          {passwordError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {passwordError}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-primary mb-1">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:border-accent outline-none"
              placeholder="At least 8 characters, with a letter and a number"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword || !currentPassword || !newPassword}
            className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2 rounded-md transition-colors disabled:opacity-60"
          >
            {savingPassword ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
