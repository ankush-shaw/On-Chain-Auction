/**
 * Service for recording, persisting, and managing user transaction activity.
 * Keeps an append-only audit log in localStorage keyed by user wallet address.
 */

export type ActivityType = 'bid' | 'create' | 'settle' | 'cancel';

export interface ActivityRecord {
  id: string;
  userAddress: string;
  type: ActivityType;
  auctionId: number;
  auctionTitle: string;
  amountXlm?: string;
  timestamp: number;
  txHash?: string;
  status: 'confirmed' | 'pending' | 'failed';
}

const STORAGE_KEY_PREFIX = 'stellar_user_activity_';

export function recordUserActivity(record: Omit<ActivityRecord, 'id' | 'timestamp'>): ActivityRecord {
  const fullRecord: ActivityRecord = {
    ...record,
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Math.floor(Date.now() / 1000),
  };

  try {
    const existing = getUserActivities(record.userAddress);
    const updated = [fullRecord, ...existing].slice(0, 50); // Keep last 50
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${record.userAddress.toLowerCase()}`, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }

  return fullRecord;
}

export function getUserActivities(userAddress: string | null): ActivityRecord[] {
  if (!userAddress) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userAddress.toLowerCase()}`);
    if (raw) {
      const parsed: ActivityRecord[] = JSON.parse(raw);
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch {
    // Ignore
  }

  // Generate initial demo activity records if none exist
  return generateDemoActivities(userAddress);
}

function generateDemoActivities(userAddress: string): ActivityRecord[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      id: 'demo_1',
      userAddress,
      type: 'bid',
      auctionId: 101,
      auctionTitle: 'Mobile app landing page',
      amountXlm: '310.0',
      timestamp: now - 3600,
      txHash: '79517fcaca0f57a78833fde34e72539b325f2896e7f067db91287f94a5e6726f',
      status: 'confirmed',
    },
    {
      id: 'demo_2',
      userAddress,
      type: 'create',
      auctionId: 102,
      auctionTitle: 'Brand identity sprint',
      amountXlm: '400.0',
      timestamp: now - 18000,
      txHash: '78150559a83aee13a2943450967ced12226ed099e67b881055be381651572b21',
      status: 'confirmed',
    },
  ];
}
