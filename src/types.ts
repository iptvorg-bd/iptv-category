export interface CategoryConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  iconName?: string;
  enabled: boolean;
}

export interface ChannelItem {
  id: string;
  name: string;
  logo: string;
  group: string;
  category: string;
  tvgId: string;
  url: string;
  rawExtInf?: string;
  status?: "working" | "dead" | "checking" | "unchecked";
  checkLatencyMs?: number;
  httpCode?: number;
}

export interface SyncCategoryResult {
  count: number;
  url: string;
  status: string;
  channels: ChannelItem[];
}

export interface SyncAllResponse {
  timestamp: string;
  totalChannels: number;
  workingCount?: number;
  deadCount?: number;
  categories: Record<string, SyncCategoryResult>;
  allChannelsSample: ChannelItem[];
}
