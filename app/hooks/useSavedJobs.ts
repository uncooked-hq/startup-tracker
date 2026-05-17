'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthProvider';

export function useSavedJobs() {
  const { user, isLoggedIn } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Clear saved jobs on logout, fetch on login
  useEffect(() => {
    if (!isLoggedIn || !user) {
      setSavedIds(new Set());
      return;
    }
    // Reset to empty before fetching to avoid stale count
    setSavedIds(new Set());

    setLoading(true);
    fetch(`/api/saved-jobs?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setSavedIds(new Set(data.savedJobIds || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isLoggedIn, user]);

  const toggleSave = useCallback(async (jobId: string) => {
    if (!user) return;

    const isSaved = savedIds.has(jobId);
    const action = isSaved ? 'unsave' : 'save';

    // Optimistic update
    setSavedIds(prev => {
      const next = new Set(prev);
      if (isSaved) next.delete(jobId);
      else next.add(jobId);
      return next;
    });

    try {
      const res = await fetch('/api/saved-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, jobId, action }),
      });

      if (!res.ok) {
        // Revert on failure
        setSavedIds(prev => {
          const next = new Set(prev);
          if (isSaved) next.add(jobId);
          else next.delete(jobId);
          return next;
        });
      }
    } catch {
      // Revert on failure
      setSavedIds(prev => {
        const next = new Set(prev);
        if (isSaved) next.add(jobId);
        else next.delete(jobId);
        return next;
      });
    }
  }, [user, savedIds]);

  const isSaved = useCallback((jobId: string) => savedIds.has(jobId), [savedIds]);

  return { savedIds, isSaved, toggleSave, loading, count: savedIds.size };
}
