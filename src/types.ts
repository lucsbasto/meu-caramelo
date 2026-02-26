export type PointStatus =
  | 'ok'
  | 'needs_water'
  | 'needs_food'
  | 'needs_maintenance';

export type FeedingPoint = {
  id: string;
  title: string;
  notes: string | null;
  status: PointStatus;
  latitude: number;
  longitude: number;
  updated_at: string;
  created_at: string;
};

export type CreateFeedingPointInput = {
  title: string;
  notes?: string;
  latitude: number;
  longitude: number;
};
