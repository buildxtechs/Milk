'use client';

import { useStore } from '@/lib/store';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function SyncIndicator() {
    const isSyncing = useStore((state) => state.isSyncing);
    const pendingCount = useStore((state) => state.pendingSync.length);
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        const handleStatusChange = () => setIsOnline(navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    return (
        <div className="sync-indicator">
            {isOnline ? (
                <div className={`status-pill ${isSyncing ? 'syncing' : 'online'}`}>
                    {isSyncing ? (
                        <>
                            <RefreshCw size={14} className="spin" />
                            <span>Syncing...</span>
                        </>
                    ) : (
                        <>
                            <Cloud size={14} />
                            <span>Online {pendingCount > 0 && `(${pendingCount} pending)`}</span>
                        </>
                    )}
                </div>
            ) : (
                <div className="status-pill offline">
                    <CloudOff size={14} />
                    <span>Offline {pendingCount > 0 && `(${pendingCount} saved)`}</span>
                </div>
            )}

            <style jsx>{`
        .sync-indicator {
          display: flex;
          align-items: center;
          margin-right: 12px;
        }
        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .online {
          background: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }
        .syncing {
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        }
        .offline {
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .spin {
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
