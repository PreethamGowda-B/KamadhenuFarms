'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { playNotificationChime, isSoundMuted, setSoundMuted } from '@/lib/sound';

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  metadata: string | null;
  createdAt: string;
}

export interface UseAdminNotificationsResult {
  notifications: AdminNotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  soundMuted: boolean;
  toggleSound: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  revalidate: () => Promise<void>;
  latestNewNotification: AdminNotificationItem | null;
  clearToast: () => void;
}

// Global known IDs set across component remounts during the session
const sessionKnownIds = new Set<string>();
let isInitialFetchCompleted = false;

export function useAdminNotifications(pollIntervalMs = 18000): UseAdminNotificationsResult {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [soundMuted, setSoundMutedState] = useState<boolean>(false);
  const [latestNewNotification, setLatestNewNotification] = useState<AdminNotificationItem | null>(null);

  const isPollingRef = useRef(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize sound mute preference
  useEffect(() => {
    setSoundMutedState(isSoundMuted());
  }, []);

  const toggleSound = useCallback(() => {
    const nextState = !soundMuted;
    setSoundMutedState(nextState);
    setSoundMuted(nextState);
  }, [soundMuted]);

  const clearToast = useCallback(() => {
    setLatestNewNotification(null);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
  }, []);

  // Core SWR fetcher
  const fetchNotifications = useCallback(async (isBackground = false) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      if (!isBackground) setLoading(true);

      const res = await fetch('/api/admin/notifications?limit=25', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          // Admin not logged in or session expired
          return;
        }
        throw new Error(`Failed to fetch notifications: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Notification error');

      const incoming: AdminNotificationItem[] = data.notifications || [];
      const incomingUnreadCount: number = data.unreadCount ?? 0;

      // Check for genuinely new incoming notifications
      if (isInitialFetchCompleted) {
        const brandNewUnread = incoming.find(
          (n) => !n.isRead && !sessionKnownIds.has(n.id)
        );

        if (brandNewUnread) {
          // Play sound alert (guaranteed once per notification ID)
          playNotificationChime();

          // Trigger visual toast
          setLatestNewNotification(brandNewUnread);
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = setTimeout(() => {
            setLatestNewNotification(null);
          }, 8000);
        }
      }

      // Track all known IDs into the session set
      incoming.forEach((n) => sessionKnownIds.add(n.id));
      isInitialFetchCompleted = true;

      setNotifications(incoming);
      setUnreadCount(incomingUnreadCount);
      setError(null);
    } catch (err: any) {
      console.warn('[Admin Notifications] SWR background revalidation notice:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
      isPollingRef.current = false;
    }
  }, []);

  // Optimistic Mark as Read
  const markAsRead = useCallback(async (id: string) => {
    // 1. Optimistic local state update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Clear active toast if it belongs to this notification
    setLatestNewNotification((current) => (current?.id === id ? null : current));

    // 2. Background server sync
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success && typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to sync markAsRead to server:', err);
    }
  }, []);

  // Optimistic Mark All as Read
  const markAllAsRead = useCallback(async () => {
    // 1. Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    setLatestNewNotification(null);

    // 2. Server sync
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_ALL_READ' }),
      });
    } catch (err) {
      console.error('Failed to sync markAllAsRead to server:', err);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

  // SWR Active Tab Polling & Visibility / Focus Revalidation
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          fetchNotifications(true);
        }
      }, pollIntervalMs);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    // Tab visibility revalidation
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(true);
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Window focus revalidation
    const handleFocus = () => {
      fetchNotifications(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [fetchNotifications, pollIntervalMs]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    soundMuted,
    toggleSound,
    markAsRead,
    markAllAsRead,
    revalidate: () => fetchNotifications(false),
    latestNewNotification,
    clearToast,
  };
}
