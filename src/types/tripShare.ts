export interface TripShare {
  id: string;
  trip_id: string;
  share_token: string;
  shared_with_email?: string;
  shared_with_user_id?: string;
  permission: 'view' | 'edit';
  accepted_at?: string;
  created_at: string;
  updated_at: string;
}
