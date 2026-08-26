import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlCenterModal } from './ControlCenterModal';
import { FeedConfig, AppArchetypeStyle } from '../types';

describe('ControlCenterModal - Draft & Dirty State Isolation', () => {
  const initialFeeds: FeedConfig[] = [
    {
      id: 'feed-1',
      name: 'Source 1 Original',
      category: 'Инженерный',
      enabled: true,
      sources: [
        {
          id: 'src-1',
          name: 'Source 1 Original',
          type: 'rss',
          url: 'https://example.com/rss1',
          enabled: true,
        },
      ],
    },
    {
      id: 'feed-2',
      name: 'Source 2 Original',
      category: 'Инженерный',
      enabled: true,
      sources: [
        {
          id: 'src-2',
          name: 'Source 2 Original',
          type: 'rss',
          url: 'https://example.com/rss2',
          enabled: true,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps local edits when external props (feeds, timers, etc.) update in background', () => {
    const handleClose = vi.fn();
    const handleUpdateFeeds = vi.fn();
    const handleSaveAll = vi.fn();

    const { rerender } = render(
      <ControlCenterModal
        isOpen={true}
        onClose={handleClose}
        initialTab="✦ ИСТОЧНИКИ"
        feeds={initialFeeds}
        timers={[]}
        accessibility={{ scalePercent: 100, visualAcuity: 'Не указывать' }}
        customAiPrompt=""
        appStyle={'engineer' as AppArchetypeStyle}
        customWallpaper=""
        scheduledHours={[6, 12, 19]}
        onUpdateFeeds={handleUpdateFeeds}
        onSaveAllWorkspaceSettings={handleSaveAll}
      />
    );

    // Initial state: first feed name input should have 'Source 1 Original'
    const nameInput = screen.getByDisplayValue('Source 1 Original') as HTMLInputElement;
    expect(nameInput).toBeDefined();

    // User edits the name to 'Source 1 USER DRAFT'
    fireEvent.change(nameInput, { target: { value: 'Source 1 USER DRAFT' } });
    expect(nameInput.value).toBe('Source 1 USER DRAFT');

    // The unsaved changes indicator should be visible
    expect(screen.getByText('Есть несохранённые изменения')).toBeDefined();

    // Simulate an external background sync / RSS refresh / realtime update altering external `feeds` prop
    const updatedExternalFeeds: FeedConfig[] = [
      {
        id: 'feed-1',
        name: 'Source 1 Overwritten By Background Sync',
        category: 'Инженерный',
        enabled: true,
        sources: [
          {
            id: 'src-1',
            name: 'Source 1 Overwritten By Background Sync',
            type: 'rss',
            url: 'https://example.com/rss1',
            enabled: true,
          },
        ],
      },
    ];

    rerender(
      <ControlCenterModal
        isOpen={true}
        onClose={handleClose}
        initialTab="✦ ИСТОЧНИКИ"
        feeds={updatedExternalFeeds}
        timers={[]}
        accessibility={{ scalePercent: 100, visualAcuity: 'Не указывать' }}
        customAiPrompt=""
        appStyle={'engineer' as AppArchetypeStyle}
        customWallpaper=""
        scheduledHours={[6, 12, 19]}
        onUpdateFeeds={handleUpdateFeeds}
        onSaveAllWorkspaceSettings={handleSaveAll}
      />
    );

    // CRITICAL: The user's input MUST NOT be overwritten by the background update!
    expect(nameInput.value).toBe('Source 1 USER DRAFT');
    expect(screen.getByText('Есть несохранённые изменения')).toBeDefined();

    // When saving all, it should send the user's drafted data
    const saveButton = screen.getByText('Сохранить всё');
    fireEvent.click(saveButton);

    expect(handleSaveAll).toHaveBeenCalledTimes(1);
    const savedPayload = handleSaveAll.mock.calls[0][0];
    expect(savedPayload.feeds[0].name).toBe('Source 1 USER DRAFT');
  });

  it('prompts user confirmation on close when dirty, but allows closing when confirmed', () => {
    const handleClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(
      <ControlCenterModal
        isOpen={true}
        onClose={handleClose}
        initialTab="✦ ИСТОЧНИКИ"
        feeds={initialFeeds}
        timers={[]}
        accessibility={{ scalePercent: 100, visualAcuity: 'Не указывать' }}
        customAiPrompt=""
        appStyle={'engineer' as AppArchetypeStyle}
        customWallpaper=""
        scheduledHours={[6, 12, 19]}
      />
    );

    const nameInput = screen.getByDisplayValue('Source 1 Original') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Edited Name' } });

    // Try closing with confirmation declined
    confirmSpy.mockReturnValueOnce(false);
    const closeBtn = screen.getByText('Закрыть (Esc)');
    fireEvent.click(closeBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(handleClose).not.toHaveBeenCalled();

    // Try closing with confirmation accepted
    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
