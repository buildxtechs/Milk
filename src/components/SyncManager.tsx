'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function SyncManager() {
    const syncData = useStore((state) => state.syncData);
    const fetchInitialData = useStore((state) => state.fetchInitialData);
    const pendingSync = useStore((state) => state.pendingSync);

    // Initial fetch on mount
    useEffect(() => {
        const init = async () => {
            // If we are online and have pending changes, sync them first
            if (navigator.onLine && pendingSync.length > 0) {
                await syncData();
            }
            // Then fetch latest from server
            await fetchInitialData();
        };
        init();
    }, [fetchInitialData, syncData]); // Only run on mount, but technically depends on these

    // Sync when coming back online
    useEffect(() => {
        const handleOnline = () => {
            console.log('App is online, triggering sync...');
            syncData();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [syncData]);

    // Periodic sync if there are pending changes and we are online
    useEffect(() => {
        if (pendingSync.length === 0) return;

        const interval = setInterval(() => {
            if (navigator.onLine) {
                syncData();
            }
        }, 30000); // Try every 30 seconds if there are changes

        return () => clearInterval(interval);
    }, [pendingSync, syncData]);

    // Immediate sync attempt if online and pendingSync changes
    useEffect(() => {
        if (pendingSync.length > 0 && navigator.onLine) {
            syncData();
        }
    }, [pendingSync, syncData]);

    return null; // This component doesn't render anything
}
