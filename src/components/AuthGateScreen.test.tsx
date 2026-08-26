import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthGateScreen } from './AuthGateScreen';
import { UserProfile } from '../types';

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(),
}));

// Mock firebase helper functions
vi.mock('../utils/firebase', () => ({
  auth: {
    currentUser: null,
  },
  saveUserProfileToFirestore: vi.fn(),
}));

import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

describe('AuthGateScreen - Secure Auth & Migration', () => {
  const mockProfiles: UserProfile[] = [
    {
      id: 'user-admin-belkin',
      username: 'Belkin',
      login: 'Belkin',
      email: 'belkin@med.ru',
      password: '1511', // Legacy plain password
      role: 'admin',
      displayName: 'Беликович',
      createdAt: '',
      lastLoginAt: '',
      updatedAt: '',
      notes: [],
      timers: [],
      feeds: [],
      bookmarks: [],
      workSchedules: {},
      accessibility: { scalePercent: 100, visualAcuity: 'Не указывать' },
      appStyle: 'medical',
      customWallpaper: '',
      customAiPrompt: '',
      scheduledHours: [6, 12, 19],
    }
  ];

  const onAuthSuccess = vi.fn();
  const onSetProfiles = vi.fn();
  const onPlaySound = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps "Belkin" to "belkin@med.ru" and performs standard signInWithEmailAndPassword', async () => {
    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({
      user: { uid: 'user-admin-belkin', email: 'belkin@med.ru' }
    } as any);

    render(
      <AuthGateScreen
        profiles={mockProfiles}
        onAuthSuccess={onAuthSuccess}
        onSetProfiles={onSetProfiles}
        onPlaySound={onPlaySound}
      />
    );

    // Enter username "Belkin" and password "some-secure-pass"
    const usernameInput = screen.getByPlaceholderText(/belkin или email@gmail.com/i) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /Войти в систему/i });

    fireEvent.change(usernameInput, { target: { value: 'Belkin' } });
    fireEvent.change(passwordInput, { target: { value: 'some-secure-pass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'belkin@med.ru',
        'some-secure-pass'
      );
      expect(onAuthSuccess).toHaveBeenCalledWith('user-admin-belkin');
      expect(onPlaySound).toHaveBeenCalledWith('success');
    });
  });

  it('does not auto-migrate or bypass if sign-in fails; instead displays a detailed guide error', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
      code: 'auth/invalid-credential',
      message: 'Invalid credential'
    });

    render(
      <AuthGateScreen
        profiles={mockProfiles}
        onAuthSuccess={onAuthSuccess}
        onSetProfiles={onSetProfiles}
        onPlaySound={onPlaySound}
      />
    );

    const usernameInput = screen.getByPlaceholderText(/belkin или email@gmail.com/i) as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /Войти в систему/i });

    fireEvent.change(usernameInput, { target: { value: 'Belkin' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // It should NOT automatically call create or bypass
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
      // It should display a clear error explaining that the account is not yet created in Firebase
      expect(screen.getByText(/Учетная запись администратора Belkin еще не создана/i)).toBeDefined();
    });
  });

  it('supports explicit migration via the migration tab', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockResolvedValueOnce({
      user: { uid: 'some-new-uid', email: 'belkin@med.ru' }
    } as any);

    render(
      <AuthGateScreen
        profiles={mockProfiles}
        onAuthSuccess={onAuthSuccess}
        onSetProfiles={onSetProfiles}
        onPlaySound={onPlaySound}
      />
    );

    // Click on "Миграция" tab
    const migrationTab = screen.getByRole('button', { name: /Миграция/i });
    fireEvent.click(migrationTab);

    // Enter old credentials and set new password
    const usernameInput = screen.getByPlaceholderText(/например, Belkin/i) as HTMLInputElement;
    const oldPasswordInput = screen.getByPlaceholderText(/Старый пароль/i) as HTMLInputElement;
    const newPasswordInput = screen.getByPlaceholderText(/Введите новый безопасный пароль/i) as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText(/Повторите новый пароль/i) as HTMLInputElement;
    const submitBtn = screen.getByRole('button', { name: /Мигрировать аккаунт и войти/i });

    fireEvent.change(usernameInput, { target: { value: 'Belkin' } });
    fireEvent.change(oldPasswordInput, { target: { value: '1511' } });
    fireEvent.change(newPasswordInput, { target: { value: 'NewSuperPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'NewSuperPassword123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'belkin@med.ru',
        'NewSuperPassword123'
      );
      expect(onSetProfiles).toHaveBeenCalled();
      expect(onAuthSuccess).toHaveBeenCalledWith('some-new-uid');
    });
  });
});
