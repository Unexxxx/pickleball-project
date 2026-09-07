export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          auth_user_id: string;
          contact_verified_at: string | null;
          created_at: string;
          id: string;
          player_id: string;
        };
        Insert: {
          auth_user_id: string;
          contact_verified_at?: string | null;
          created_at?: string;
          id?: string;
          player_id: string;
        };
        Update: {
          auth_user_id?: string;
          contact_verified_at?: string | null;
          created_at?: string;
          id?: string;
          player_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "accounts_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "accounts_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      club_memberships: {
        Row: {
          club_id: string;
          created_at: string;
          id: string;
          player_id: string;
          role: Database["public"]["Enums"]["club_role"];
          status: Database["public"]["Enums"]["membership_status"];
          updated_at: string;
          version: number;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          id?: string;
          player_id: string;
          role?: Database["public"]["Enums"]["club_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          version?: number;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          id?: string;
          player_id?: string;
          role?: Database["public"]["Enums"]["club_role"];
          status?: Database["public"]["Enums"]["membership_status"];
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "club_memberships_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_memberships_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "club_memberships_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "club_memberships_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      clubs: {
        Row: {
          background_image_path: string | null;
          created_at: string;
          id: string;
          name: string;
          profile_image_path: string | null;
          slug: string;
          subscription_status: Database["public"]["Enums"]["subscription_status"];
          subscription_valid_until: string | null;
          timezone: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          background_image_path?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          profile_image_path?: string | null;
          slug: string;
          subscription_status?: Database["public"]["Enums"]["subscription_status"];
          subscription_valid_until?: string | null;
          timezone: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          background_image_path?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          profile_image_path?: string | null;
          slug?: string;
          subscription_status?: Database["public"]["Enums"]["subscription_status"];
          subscription_valid_until?: string | null;
          timezone?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      dispute_evidence: {
        Row: {
          added_by: string;
          created_at: string;
          dispute_id: string;
          evidence_object_id: string;
        };
        Insert: {
          added_by: string;
          created_at?: string;
          dispute_id: string;
          evidence_object_id: string;
        };
        Update: {
          added_by?: string;
          created_at?: string;
          dispute_id?: string;
          evidence_object_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dispute_evidence_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "dispute_evidence_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey";
            columns: ["dispute_id"];
            isOneToOne: false;
            referencedRelation: "result_disputes";
            referencedColumns: ["id"];
          },
        ];
      };
      duplicate_identity_reviews: {
        Row: {
          assigned_admin_id: string | null;
          candidate_player_a_id: string;
          candidate_player_b_id: string;
          created_at: string;
          decided_at: string | null;
          decision_reason: string | null;
          evidence_summary: string;
          id: string;
          status: Database["public"]["Enums"]["duplicate_review_status"];
          surviving_player_id: string | null;
        };
        Insert: {
          assigned_admin_id?: string | null;
          candidate_player_a_id: string;
          candidate_player_b_id: string;
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          evidence_summary: string;
          id?: string;
          status?: Database["public"]["Enums"]["duplicate_review_status"];
          surviving_player_id?: string | null;
        };
        Update: {
          assigned_admin_id?: string | null;
          candidate_player_a_id?: string;
          candidate_player_b_id?: string;
          created_at?: string;
          decided_at?: string | null;
          decision_reason?: string | null;
          evidence_summary?: string;
          id?: string;
          status?: Database["public"]["Enums"]["duplicate_review_status"];
          surviving_player_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "duplicate_identity_reviews_candidate_player_a_id_fkey";
            columns: ["candidate_player_a_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duplicate_identity_reviews_candidate_player_a_id_fkey";
            columns: ["candidate_player_a_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "duplicate_identity_reviews_candidate_player_a_id_fkey";
            columns: ["candidate_player_a_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "duplicate_identity_reviews_candidate_player_b_id_fkey";
            columns: ["candidate_player_b_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duplicate_identity_reviews_candidate_player_b_id_fkey";
            columns: ["candidate_player_b_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "duplicate_identity_reviews_candidate_player_b_id_fkey";
            columns: ["candidate_player_b_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "duplicate_identity_reviews_surviving_player_id_fkey";
            columns: ["surviving_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duplicate_identity_reviews_surviving_player_id_fkey";
            columns: ["surviving_player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "duplicate_identity_reviews_surviving_player_id_fkey";
            columns: ["surviving_player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      event_attendance: {
        Row: {
          changed_by: string | null;
          checked_in_at: string | null;
          checked_out_at: string | null;
          event_id: string;
          id: string;
          player_id: string;
          state: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          changed_by?: string | null;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          event_id: string;
          id?: string;
          player_id: string;
          state?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          changed_by?: string | null;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          event_id?: string;
          id?: string;
          player_id?: string;
          state?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "event_attendance_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_attendance_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "event_attendance_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "event_attendance_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_attendance_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_attendance_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "event_attendance_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      event_courts: {
        Row: {
          created_at: string;
          current_match_id: string | null;
          event_id: string;
          id: string;
          label: string;
          status: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          current_match_id?: string | null;
          event_id: string;
          id?: string;
          label: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          current_match_id?: string | null;
          event_id?: string;
          id?: string;
          label?: string;
          status?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "event_courts_current_match_id_fkey";
            columns: ["current_match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_courts_current_match_id_fkey";
            columns: ["current_match_id"];
            isOneToOne: false;
            referencedRelation: "public_match_history";
            referencedColumns: ["match_id"];
          },
          {
            foreignKeyName: "event_courts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_join_tokens: {
        Row: {
          created_at: string;
          event_id: string;
          expires_at: string;
          id: string;
          revoked_at: string | null;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          expires_at: string;
          id?: string;
          revoked_at?: string | null;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          expires_at?: string;
          id?: string;
          revoked_at?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_join_tokens_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_queue_entries: {
        Row: {
          assigned_match_id: string | null;
          club_id: string;
          event_id: string;
          id: string;
          joined_at: string;
          player_id: string;
          position_key: number;
          position_sequence: number;
          state: Database["public"]["Enums"]["queue_entry_state"];
          updated_at: string;
          version: number;
        };
        Insert: {
          assigned_match_id?: string | null;
          club_id: string;
          event_id: string;
          id?: string;
          joined_at?: string;
          player_id: string;
          position_key: number;
          position_sequence: number;
          state?: Database["public"]["Enums"]["queue_entry_state"];
          updated_at?: string;
          version?: number;
        };
        Update: {
          assigned_match_id?: string | null;
          club_id?: string;
          event_id?: string;
          id?: string;
          joined_at?: string;
          player_id?: string;
          position_key?: number;
          position_sequence?: number;
          state?: Database["public"]["Enums"]["queue_entry_state"];
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "event_queue_entries_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_queue_entries_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_queue_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_queue_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "event_queue_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      event_registrations: {
        Row: {
          event_id: string;
          id: string;
          player_id: string;
          registered_at: string;
          status: Database["public"]["Enums"]["registration_status"];
          terms_version: string;
          version: number;
          waitlist_position: number | null;
          withdrawn_at: string | null;
        };
        Insert: {
          event_id: string;
          id?: string;
          player_id: string;
          registered_at?: string;
          status: Database["public"]["Enums"]["registration_status"];
          terms_version: string;
          version?: number;
          waitlist_position?: number | null;
          withdrawn_at?: string | null;
        };
        Update: {
          event_id?: string;
          id?: string;
          player_id?: string;
          registered_at?: string;
          status?: Database["public"]["Enums"]["registration_status"];
          terms_version?: string;
          version?: number;
          waitlist_position?: number | null;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_registrations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_registrations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "event_registrations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      external_event_roster_entries: {
        Row: {
          club_id: string;
          created_at: string;
          display_name: string;
          event_id: string;
          id: string;
          matched_player_id: string | null;
          source_ref: string;
          source_url: string;
          status: Database["public"]["Enums"]["registration_status"];
          waitlist_position: number | null;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          display_name: string;
          event_id: string;
          id?: string;
          matched_player_id?: string | null;
          source_ref: string;
          source_url: string;
          status: Database["public"]["Enums"]["registration_status"];
          waitlist_position?: number | null;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          display_name?: string;
          event_id?: string;
          id?: string;
          matched_player_id?: string | null;
          source_ref?: string;
          source_url?: string;
          status?: Database["public"]["Enums"]["registration_status"];
          waitlist_position?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "external_event_roster_entries_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "external_event_roster_entries_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "external_event_roster_entries_matched_player_id_fkey";
            columns: ["matched_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          access_code_hash: string | null;
          capacity: number;
          club_id: string;
          created_at: string;
          eligibility: Json;
          ends_at: string;
          formats: string[];
          id: string;
          is_private: boolean;
          join_code: string;
          map_url: string | null;
          name: string;
          notes: string | null;
          queue_version: number;
          record_class: Database["public"]["Enums"]["record_class"];
          registration_closes_at: string | null;
          registration_opens_at: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["event_status"];
          type: Database["public"]["Enums"]["event_type"];
          updated_at: string;
          venue: string;
          version: number;
        };
        Insert: {
          access_code_hash?: string | null;
          capacity: number;
          club_id: string;
          created_at?: string;
          eligibility?: Json;
          ends_at: string;
          formats: string[];
          id?: string;
          is_private?: boolean;
          join_code?: string;
          map_url?: string | null;
          name: string;
          notes?: string | null;
          queue_version?: number;
          record_class: Database["public"]["Enums"]["record_class"];
          registration_closes_at?: string | null;
          registration_opens_at?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["event_status"];
          type: Database["public"]["Enums"]["event_type"];
          updated_at?: string;
          venue: string;
          version?: number;
        };
        Update: {
          access_code_hash?: string | null;
          capacity?: number;
          club_id?: string;
          created_at?: string;
          eligibility?: Json;
          ends_at?: string;
          formats?: string[];
          id?: string;
          is_private?: boolean;
          join_code?: string;
          map_url?: string | null;
          name?: string;
          notes?: string | null;
          queue_version?: number;
          record_class?: Database["public"]["Enums"]["record_class"];
          registration_closes_at?: string | null;
          registration_opens_at?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["event_status"];
          type?: Database["public"]["Enums"]["event_type"];
          updated_at?: string;
          venue?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
        ];
      };
      identity_attestations: {
        Row: {
          attestation_type: string;
          attested_by_player_id: string;
          club_id: string;
          created_at: string;
          id: string;
          note: string | null;
          player_id: string;
          revoked_at: string | null;
        };
        Insert: {
          attestation_type: string;
          attested_by_player_id: string;
          club_id: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          player_id: string;
          revoked_at?: string | null;
        };
        Update: {
          attestation_type?: string;
          attested_by_player_id?: string;
          club_id?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          player_id?: string;
          revoked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "identity_attestations_attested_by_player_id_fkey";
            columns: ["attested_by_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_attestations_attested_by_player_id_fkey";
            columns: ["attested_by_player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "identity_attestations_attested_by_player_id_fkey";
            columns: ["attested_by_player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "identity_attestations_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_attestations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "identity_attestations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "identity_attestations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      leaderboard_entries: {
        Row: {
          calculation_version: number;
          club_id: string | null;
          current_streak: number;
          id: string;
          last_match_at: string | null;
          longest_win_streak: number;
          losses: number;
          player_id: string;
          rating: number;
          scope: string;
          win_rate: number;
          wins: number;
        };
        Insert: {
          calculation_version: number;
          club_id?: string | null;
          current_streak: number;
          id?: string;
          last_match_at?: string | null;
          longest_win_streak: number;
          losses: number;
          player_id: string;
          rating: number;
          scope: string;
          win_rate: number;
          wins: number;
        };
        Update: {
          calculation_version?: number;
          club_id?: string | null;
          current_streak?: number;
          id?: string;
          last_match_at?: string | null;
          longest_win_streak?: number;
          losses?: number;
          player_id?: string;
          rating?: number;
          scope?: string;
          win_rate?: number;
          wins?: number;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "leaderboard_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      leaderboard_rules: {
        Row: {
          description: string;
          id: string;
          minimum_matches: number;
          ordering: string[];
          updated_at: string;
        };
        Insert: {
          description: string;
          id: string;
          minimum_matches?: number;
          ordering: string[];
          updated_at?: string;
        };
        Update: {
          description?: string;
          id?: string;
          minimum_matches?: number;
          ordering?: string[];
          updated_at?: string;
        };
        Relationships: [];
      };
      match_participants: {
        Row: {
          active: boolean;
          created_at: string;
          event_id: string;
          match_id: string;
          player_id: string;
          position: number;
          side: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          event_id: string;
          match_id: string;
          player_id: string;
          position: number;
          side: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          event_id?: string;
          match_id?: string;
          player_id?: string;
          position?: number;
          side?: number;
        };
        Relationships: [
          {
            foreignKeyName: "match_participants_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_participants_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_participants_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "public_match_history";
            referencedColumns: ["match_id"];
          },
          {
            foreignKeyName: "match_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "match_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      match_proposals: {
        Row: {
          club_id: string;
          court_id: string;
          created_at: string;
          created_by: string;
          event_id: string;
          expires_at: string;
          format: Database["public"]["Enums"]["match_format"];
          id: string;
          match_id: string | null;
          policy_version: string;
          queue_entry_ids: string[];
          queue_version: number;
          request_id: string;
          side_a_player_ids: string[];
          side_b_player_ids: string[];
          snapshot: Json;
          status: Database["public"]["Enums"]["match_proposal_status"];
          version: number;
        };
        Insert: {
          club_id: string;
          court_id: string;
          created_at?: string;
          created_by: string;
          event_id: string;
          expires_at: string;
          format: Database["public"]["Enums"]["match_format"];
          id?: string;
          match_id?: string | null;
          policy_version: string;
          queue_entry_ids: string[];
          queue_version: number;
          request_id: string;
          side_a_player_ids: string[];
          side_b_player_ids: string[];
          snapshot: Json;
          status?: Database["public"]["Enums"]["match_proposal_status"];
          version?: number;
        };
        Update: {
          club_id?: string;
          court_id?: string;
          created_at?: string;
          created_by?: string;
          event_id?: string;
          expires_at?: string;
          format?: Database["public"]["Enums"]["match_format"];
          id?: string;
          match_id?: string | null;
          policy_version?: string;
          queue_entry_ids?: string[];
          queue_version?: number;
          request_id?: string;
          side_a_player_ids?: string[];
          side_b_player_ids?: string[];
          snapshot?: Json;
          status?: Database["public"]["Enums"]["match_proposal_status"];
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "match_proposals_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_proposals_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "event_courts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_proposals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_proposals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "match_proposals_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "match_proposals_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_proposals_match_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_proposals_match_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "public_match_history";
            referencedColumns: ["match_id"];
          },
        ];
      };
      match_results: {
        Row: {
          club_id: string;
          created_at: string;
          current_revision_id: string | null;
          event_id: string;
          id: string;
          match_id: string;
          status: Database["public"]["Enums"]["result_status"];
          updated_at: string;
          version: number;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          current_revision_id?: string | null;
          event_id: string;
          id?: string;
          match_id: string;
          status?: Database["public"]["Enums"]["result_status"];
          updated_at?: string;
          version?: number;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          current_revision_id?: string | null;
          event_id?: string;
          id?: string;
          match_id?: string;
          status?: Database["public"]["Enums"]["result_status"];
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "match_results_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_current_revision_fkey";
            columns: ["current_revision_id"];
            isOneToOne: false;
            referencedRelation: "result_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: true;
            referencedRelation: "public_match_history";
            referencedColumns: ["match_id"];
          },
        ];
      };
      matches: {
        Row: {
          assigned_at: string;
          canceled_by: string | null;
          cancellation_reason: string | null;
          club_id: string;
          completed_at: string | null;
          court_id: string;
          created_at: string;
          created_by: string;
          event_id: string;
          format: Database["public"]["Enums"]["match_format"];
          id: string;
          played_at: string | null;
          policy_version: string;
          proposal_id: string;
          record_class: Database["public"]["Enums"]["record_class"];
          status: Database["public"]["Enums"]["match_status"];
          updated_at: string;
          version: number;
        };
        Insert: {
          assigned_at?: string;
          canceled_by?: string | null;
          cancellation_reason?: string | null;
          club_id: string;
          completed_at?: string | null;
          court_id: string;
          created_at?: string;
          created_by: string;
          event_id: string;
          format: Database["public"]["Enums"]["match_format"];
          id?: string;
          played_at?: string | null;
          policy_version: string;
          proposal_id: string;
          record_class: Database["public"]["Enums"]["record_class"];
          status?: Database["public"]["Enums"]["match_status"];
          updated_at?: string;
          version?: number;
        };
        Update: {
          assigned_at?: string;
          canceled_by?: string | null;
          cancellation_reason?: string | null;
          club_id?: string;
          completed_at?: string | null;
          court_id?: string;
          created_at?: string;
          created_by?: string;
          event_id?: string;
          format?: Database["public"]["Enums"]["match_format"];
          id?: string;
          played_at?: string | null;
          policy_version?: string;
          proposal_id?: string;
          record_class?: Database["public"]["Enums"]["record_class"];
          status?: Database["public"]["Enums"]["match_status"];
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "matches_canceled_by_fkey";
            columns: ["canceled_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_canceled_by_fkey";
            columns: ["canceled_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "matches_canceled_by_fkey";
            columns: ["canceled_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "matches_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_court_id_fkey";
            columns: ["court_id"];
            isOneToOne: false;
            referencedRelation: "event_courts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "matches_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "matches_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_proposal_id_fkey";
            columns: ["proposal_id"];
            isOneToOne: true;
            referencedRelation: "match_proposals";
            referencedColumns: ["id"];
          },
        ];
      };
      moderation_actions: {
        Row: {
          action_type: string;
          actor_admin_id: string;
          effective_at: string;
          expires_at: string | null;
          id: string;
          reason: string;
          report_id: string | null;
          request_id: string;
          reversed_action_id: string | null;
          status: Database["public"]["Enums"]["moderation_action_status"];
          subject_id: string;
          subject_type: string;
        };
        Insert: {
          action_type: string;
          actor_admin_id: string;
          effective_at?: string;
          expires_at?: string | null;
          id?: string;
          reason: string;
          report_id?: string | null;
          request_id: string;
          reversed_action_id?: string | null;
          status?: Database["public"]["Enums"]["moderation_action_status"];
          subject_id: string;
          subject_type: string;
        };
        Update: {
          action_type?: string;
          actor_admin_id?: string;
          effective_at?: string;
          expires_at?: string | null;
          id?: string;
          reason?: string;
          report_id?: string | null;
          request_id?: string;
          reversed_action_id?: string | null;
          status?: Database["public"]["Enums"]["moderation_action_status"];
          subject_id?: string;
          subject_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moderation_actions_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moderation_actions_reversed_action_id_fkey";
            columns: ["reversed_action_id"];
            isOneToOne: false;
            referencedRelation: "moderation_actions";
            referencedColumns: ["id"];
          },
        ];
      };
      official_results: {
        Row: {
          authoritative_revision_id: string;
          calculation_checksum: string | null;
          calculation_version: number | null;
          club_id: string;
          effect_state: Database["public"]["Enums"]["ranked_effect_state"];
          eligibility_evidence: Json;
          finalized_at: string;
          finalized_by: string;
          id: string;
          match_id: string;
          updated_at: string;
        };
        Insert: {
          authoritative_revision_id: string;
          calculation_checksum?: string | null;
          calculation_version?: number | null;
          club_id: string;
          effect_state: Database["public"]["Enums"]["ranked_effect_state"];
          eligibility_evidence: Json;
          finalized_at?: string;
          finalized_by: string;
          id?: string;
          match_id: string;
          updated_at?: string;
        };
        Update: {
          authoritative_revision_id?: string;
          calculation_checksum?: string | null;
          calculation_version?: number | null;
          club_id?: string;
          effect_state?: Database["public"]["Enums"]["ranked_effect_state"];
          eligibility_evidence?: Json;
          finalized_at?: string;
          finalized_by?: string;
          id?: string;
          match_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "official_results_authoritative_revision_id_fkey";
            columns: ["authoritative_revision_id"];
            isOneToOne: true;
            referencedRelation: "result_revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "official_results_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "official_results_finalized_by_fkey";
            columns: ["finalized_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "official_results_finalized_by_fkey";
            columns: ["finalized_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "official_results_finalized_by_fkey";
            columns: ["finalized_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "official_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "official_results_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "public_match_history";
            referencedColumns: ["match_id"];
          },
        ];
      };
      player_statistics: {
        Row: {
          calculation_version: number;
          current_streak: number;
          last_match_at: string | null;
          longest_win_streak: number;
          losses: number;
          player_id: string;
          rating: number;
          updated_at: string;
          wins: number;
        };
        Insert: {
          calculation_version?: number;
          current_streak?: number;
          last_match_at?: string | null;
          longest_win_streak?: number;
          losses?: number;
          player_id: string;
          rating?: number;
          updated_at?: string;
          wins?: number;
        };
        Update: {
          calculation_version?: number;
          current_streak?: number;
          last_match_at?: string | null;
          longest_win_streak?: number;
          losses?: number;
          player_id?: string;
          rating?: number;
          updated_at?: string;
          wins?: number;
        };
        Relationships: [
          {
            foreignKeyName: "player_statistics_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "player_statistics_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "player_statistics_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: true;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      players: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          display_name: string;
          id: string;
          merged_into_player_id: string | null;
          public_slug: string | null;
          updated_at: string;
          version: number;
          visibility: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          display_name: string;
          id?: string;
          merged_into_player_id?: string | null;
          public_slug: string;
          updated_at?: string;
          version?: number;
          visibility?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          merged_into_player_id?: string | null;
          public_slug?: string;
          updated_at?: string;
          version?: number;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "players_merged_into_player_id_fkey";
            columns: ["merged_into_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "players_merged_into_player_id_fkey";
            columns: ["merged_into_player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "players_merged_into_player_id_fkey";
            columns: ["merged_into_player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      report_evidence: {
        Row: {
          added_by: string;
          created_at: string;
          evidence_object_id: string;
          report_id: string;
        };
        Insert: {
          added_by: string;
          created_at?: string;
          evidence_object_id: string;
          report_id: string;
        };
        Update: {
          added_by?: string;
          created_at?: string;
          evidence_object_id?: string;
          report_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_evidence_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_evidence_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "report_evidence_added_by_fkey";
            columns: ["added_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "report_evidence_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          assigned_admin_id: string | null;
          created_at: string;
          description: string;
          id: string;
          reason_code: string;
          reporter_player_id: string;
          resolution_reason: string | null;
          resolved_at: string | null;
          status: Database["public"]["Enums"]["report_status"];
          subject_id: string;
          subject_type: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          assigned_admin_id?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          reason_code: string;
          reporter_player_id: string;
          resolution_reason?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          subject_id: string;
          subject_type: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          assigned_admin_id?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          reason_code?: string;
          reporter_player_id?: string;
          resolution_reason?: string | null;
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          subject_id?: string;
          subject_type?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "reports_reporter_player_id_fkey";
            columns: ["reporter_player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_player_id_fkey";
            columns: ["reporter_player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "reports_reporter_player_id_fkey";
            columns: ["reporter_player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      result_confirmations: {
        Row: {
          confirmed_at: string;
          player_id: string;
          request_id: string;
          result_revision_id: string;
          score_digest: string;
          side: number;
        };
        Insert: {
          confirmed_at?: string;
          player_id: string;
          request_id: string;
          result_revision_id: string;
          score_digest: string;
          side: number;
        };
        Update: {
          confirmed_at?: string;
          player_id?: string;
          request_id?: string;
          result_revision_id?: string;
          score_digest?: string;
          side?: number;
        };
        Relationships: [
          {
            foreignKeyName: "result_confirmations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_confirmations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "result_confirmations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "result_confirmations_result_revision_id_fkey";
            columns: ["result_revision_id"];
            isOneToOne: false;
            referencedRelation: "result_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      result_disputes: {
        Row: {
          club_id: string;
          created_at: string;
          description: string;
          id: string;
          opened_by: string;
          reason_code: string;
          resolution: Database["public"]["Enums"]["dispute_resolution"] | null;
          resolution_reason: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          result_id: string;
          status: Database["public"]["Enums"]["dispute_status"];
          version: number;
        };
        Insert: {
          club_id: string;
          created_at?: string;
          description: string;
          id?: string;
          opened_by: string;
          reason_code: string;
          resolution?: Database["public"]["Enums"]["dispute_resolution"] | null;
          resolution_reason?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          result_id: string;
          status?: Database["public"]["Enums"]["dispute_status"];
          version?: number;
        };
        Update: {
          club_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          opened_by?: string;
          reason_code?: string;
          resolution?: Database["public"]["Enums"]["dispute_resolution"] | null;
          resolution_reason?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          result_id?: string;
          status?: Database["public"]["Enums"]["dispute_status"];
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "result_disputes_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_disputes_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_disputes_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "result_disputes_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "result_disputes_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_disputes_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "result_disputes_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "result_disputes_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "match_results";
            referencedColumns: ["id"];
          },
        ];
      };
      result_revisions: {
        Row: {
          id: string;
          match_id: string;
          reason: string | null;
          request_id: string;
          result_id: string;
          revision_no: number;
          score: Json;
          score_digest: string;
          status: Database["public"]["Enums"]["result_revision_status"];
          submitted_at: string;
          submitted_by: string;
          supersedes_revision_id: string | null;
          winner_side: number;
        };
        Insert: {
          id?: string;
          match_id: string;
          reason?: string | null;
          request_id: string;
          result_id: string;
          revision_no: number;
          score: Json;
          score_digest: string;
          status?: Database["public"]["Enums"]["result_revision_status"];
          submitted_at?: string;
          submitted_by: string;
          supersedes_revision_id?: string | null;
          winner_side: number;
        };
        Update: {
          id?: string;
          match_id?: string;
          reason?: string | null;
          request_id?: string;
          result_id?: string;
          revision_no?: number;
          score?: Json;
          score_digest?: string;
          status?: Database["public"]["Enums"]["result_revision_status"];
          submitted_at?: string;
          submitted_by?: string;
          supersedes_revision_id?: string | null;
          winner_side?: number;
        };
        Relationships: [
          {
            foreignKeyName: "result_revisions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_revisions_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "public_match_history";
            referencedColumns: ["match_id"];
          },
          {
            foreignKeyName: "result_revisions_result_id_fkey";
            columns: ["result_id"];
            isOneToOne: false;
            referencedRelation: "match_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_revisions_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "result_revisions_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "result_revisions_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "result_revisions_supersedes_revision_id_fkey";
            columns: ["supersedes_revision_id"];
            isOneToOne: false;
            referencedRelation: "result_revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      trust_score_review_requests: {
        Row: {
          assigned_admin_id: string | null;
          challenged_ledger_id: string;
          created_at: string;
          decided_at: string | null;
          decision_ledger_id: string | null;
          decision_reason: string | null;
          id: string;
          player_id: string;
          reason: string;
          status: Database["public"]["Enums"]["trust_review_status"];
          version: number;
        };
        Insert: {
          assigned_admin_id?: string | null;
          challenged_ledger_id: string;
          created_at?: string;
          decided_at?: string | null;
          decision_ledger_id?: string | null;
          decision_reason?: string | null;
          id?: string;
          player_id: string;
          reason: string;
          status?: Database["public"]["Enums"]["trust_review_status"];
          version?: number;
        };
        Update: {
          assigned_admin_id?: string | null;
          challenged_ledger_id?: string;
          created_at?: string;
          decided_at?: string | null;
          decision_ledger_id?: string | null;
          decision_reason?: string | null;
          id?: string;
          player_id?: string;
          reason?: string;
          status?: Database["public"]["Enums"]["trust_review_status"];
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "trust_score_review_requests_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trust_score_review_requests_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "trust_score_review_requests_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
    };
    Views: {
      public_leaderboards: {
        Row: {
          calculation_version: number | null;
          club_id: string | null;
          club_slug: string | null;
          current_streak: number | null;
          display_name: string | null;
          last_match_at: string | null;
          longest_win_streak: number | null;
          losses: number | null;
          player_id: string | null;
          public_slug: string | null;
          rank: number | null;
          rating: number | null;
          scope: string | null;
          win_rate: number | null;
          wins: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_club_id_fkey";
            columns: ["club_id"];
            isOneToOne: false;
            referencedRelation: "clubs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leaderboard_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "leaderboard_entries_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      public_match_history: {
        Row: {
          participants: Json | null;
          calculation_version: number | null;
          effect_state:
            Database["public"]["Enums"]["ranked_effect_state"] | null;
          format: Database["public"]["Enums"]["match_format"] | null;
          has_revision_history: boolean | null;
          match_id: string | null;
          played_at: string | null;
          player_id: string | null;
          record_class: Database["public"]["Enums"]["record_class"] | null;
          result_status: Database["public"]["Enums"]["result_status"] | null;
          score: Json | null;
          side: number | null;
          winner_side: number | null;
          won: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "match_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_profiles";
            referencedColumns: ["player_id"];
          },
          {
            foreignKeyName: "match_participants_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "public_player_statistics";
            referencedColumns: ["player_id"];
          },
        ];
      };
      public_player_profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string | null;
          display_name: string | null;
          player_id: string | null;
          public_slug: string | null;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          player_id?: string | null;
          public_slug?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          player_id?: string | null;
          public_slug?: string | null;
        };
        Relationships: [];
      };
      public_player_statistics: {
        Row: {
          calculation_version: number | null;
          current_streak: number | null;
          last_match_at: string | null;
          longest_win_streak: number | null;
          losses: number | null;
          player_id: string | null;
          public_slug: string | null;
          rating: number | null;
          rating_deviation: number | null;
          rating_model: string | null;
          provisional: boolean | null;
          win_rate: number | null;
          wins: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      add_event_court: {
        Args: { p_event_id: string; p_idempotency_key: string };
        Returns: { court_id: string; court_label: string }[];
      };
      adjust_event_queue: {
        Args: {
          p_before_entry_id: string;
          p_expected_version: number;
          p_idempotency_key: string;
          p_queue_entry_id: string;
          p_reason: string;
        };
        Returns: {
          event_queue_version: number;
          position: number;
          queue_entry_id: string;
        }[];
      };
      adjust_player_trust_score: {
        Args: {
          p_delta: number;
          p_idempotency_key: string;
          p_player_id: string;
          p_reason_code: string;
          p_source_id: string;
        };
        Returns: {
          current_score: number;
          ledger_entry_id: string;
          player_id: string;
          previous_score: number;
        }[];
      };
      apply_moderation_action: {
        Args: {
          p_action: string;
          p_expires_at: string;
          p_idempotency_key: string;
          p_reason: string;
          p_report_id: string;
          p_subject_id: string;
          p_subject_type: string;
        };
        Returns: string;
      };
      stage_external_event_roster: {
        Args: {
          p_entries: Json;
          p_event_id: string;
          p_idempotency_key: string;
          p_source_url: string;
        };
        Returns: number;
      };
      attest_player_identity: {
        Args: {
          p_attestation_type: string;
          p_club_id: string;
          p_idempotency_key: string;
          p_note: string;
          p_player_id: string;
        };
        Returns: string;
      };
      cancel_match_assignment: {
        Args: {
          p_idempotency_key: string;
          p_match_id: string;
          p_reason: string;
        };
        Returns: {
          assignment_version: number;
          match_id: string;
          status: Database["public"]["Enums"]["match_status"];
        }[];
      };
      assign_next_queued_match: {
        Args: {
          p_event_id: string;
          p_format: string;
          p_idempotency_key: string;
        };
        Returns: {
          assignment_version: number;
          court_id: string;
          match_id: string;
        }[];
      };
      can_manage_club_media: { Args: { p_club_id: string }; Returns: boolean };
      claim_expired_evidence: {
        Args: { p_batch_size: number; p_claim_token: string };
        Returns: {
          evidence_id: string;
          object_path: string;
        }[];
      };
      confirm_match_proposal: {
        Args: {
          p_expected_event_queue_version: number;
          p_idempotency_key: string;
          p_proposal_id: string;
        };
        Returns: {
          assignment_version: number;
          match_id: string;
        }[];
      };
      confirm_match_result: {
        Args: {
          p_idempotency_key: string;
          p_result_id: string;
          p_revision_id: string;
        };
        Returns: {
          calculation_version: number;
          confirmed_side_a: boolean;
          confirmed_side_b: boolean;
          result_id: string;
          status: string;
          version: number;
        }[];
      };
      create_club: {
        Args: {
          p_idempotency_key: string;
          p_name: string;
          p_slug: string;
          p_timezone: string;
        };
        Returns: string;
      };
      create_club_auto: {
        Args: {
          p_idempotency_key: string;
          p_name: string;
          p_timezone: string;
        };
        Returns: {
          club_id: string;
          slug: string;
        }[];
      };
      create_event: {
        Args: {
          p_access_code: string | null;
          p_capacity: number;
          p_club_id: string;
          p_court_count: number;
          p_ends_at: string;
          p_formats: string[];
          p_idempotency_key: string;
          p_initial_status: "draft" | "published";
          p_is_private: boolean;
          p_map_url: string | null;
          p_name: string;
          p_notes: string | null;
          p_record_class: Database["public"]["Enums"]["record_class"];
          p_starts_at: string;
          p_type: Database["public"]["Enums"]["event_type"];
          p_venue: string;
        };
        Returns: string;
      };
      create_report: {
        Args: {
          p_description: string;
          p_evidence_object_ids: string[];
          p_idempotency_key: string;
          p_reason_code: string;
          p_subject_id: string;
          p_subject_type: string;
        };
        Returns: {
          report_id: string;
          status: string;
        }[];
      };
      get_event_join_roster: {
        Args: { p_join_code: string };
        Returns: {
          avatar_path: string | null;
          display_name: string;
          public_slug: string;
          registration_status: Database["public"]["Enums"]["registration_status"];
          waitlist_position: number | null;
        }[];
      };
      current_player_id: { Args: never; Returns: string };
      decide_trust_score_review: {
        Args: {
          p_decision: string;
          p_idempotency_key: string;
          p_reason: string;
          p_review_id: string;
        };
        Returns: string;
      };
      finalize_evidence_deletion: {
        Args: { p_claim_token: string; p_evidence_id: string };
        Returns: boolean;
      };
      generate_match_proposal: {
        Args: {
          p_event_id: string;
          p_format: string;
          p_idempotency_key: string;
        };
        Returns: {
          court_id: string;
          expires_at: string;
          policy_version: string;
          proposal_id: string;
          side_a_player_ids: string[];
          side_b_player_ids: string[];
        }[];
      };
      end_match_with_score: {
        Args: {
          p_idempotency_key: string;
          p_match_id: string;
          p_score: Json;
        };
        Returns: {
          result_id: string;
          revision_id: string;
          status: string;
          version: number;
        }[];
      };
      replace_standby_player: {
        Args: {
          p_event_id: string;
          p_expected_queue_version: number;
          p_format: string;
          p_idempotency_key: string;
          p_outgoing_entry_id: string;
          p_reason: string;
          p_replacement_entry_id: string;
        };
        Returns: number;
      };
      get_dispute_evidence_path: {
        Args: { p_evidence_object_id: string };
        Returns: string;
      };
      get_my_trust_score_history: {
        Args: never;
        Returns: {
          created_at: string;
          current_score: number;
          delta: number;
          id: string;
          previous_score: number;
          reason_code: string;
        }[];
      };
      is_platform_admin: { Args: never; Returns: boolean };
      join_event_queue: {
        Args: { p_event_id: string; p_idempotency_key: string };
        Returns: {
          position: number;
          queue_entry_id: string;
          version: number;
        }[];
      };
      leave_event_queue: {
        Args: {
          p_event_id: string;
          p_idempotency_key: string;
          p_reason: string;
        };
        Returns: {
          queue_entry_id: string;
          state: Database["public"]["Enums"]["queue_entry_state"];
          version: number;
        }[];
      };
      merge_duplicate_players: {
        Args: {
          p_idempotency_key: string;
          p_reason: string;
          p_review_id: string;
          p_surviving_player_id: string;
        };
        Returns: string;
      };
      open_result_dispute: {
        Args: {
          p_description: string;
          p_evidence_object_ids: string[];
          p_idempotency_key: string;
          p_reason_code: string;
          p_result_id: string;
        };
        Returns: {
          calculation_version: number;
          dispute_id: string;
          status: string;
          version: number;
        }[];
      };
      player_ranked_eligible: {
        Args: { p_club_id: string; p_player_id: string };
        Returns: boolean;
      };
      organizer_check_in_and_queue: {
        Args: {
          p_event_id: string;
          p_idempotency_key: string;
          p_player_id: string;
        };
        Returns: {
          attendance_id: string;
          queue_entry_id: string;
          queue_position: number;
        }[];
      };
      organizer_checkout_player: {
        Args: {
          p_event_id: string;
          p_idempotency_key: string;
          p_player_id: string;
        };
        Returns: {
          attendance_id: string;
          queue_entry_id: string | null;
        }[];
      };
      provision_player_account: {
        Args: {
          p_display_name: string;
          p_public_slug: string;
          p_terms_version: string;
        };
        Returns: string;
      };
      register_for_event: {
        Args: {
          p_access_code: string | null;
          p_event_id: string;
          p_idempotency_key: string;
          p_terms_version: string;
        };
        Returns: {
          registration_id: string;
          status: Database["public"]["Enums"]["registration_status"];
          waitlist_position: number;
        }[];
      };
      reduce_event_court: {
        Args: {
          p_court_id: string;
          p_event_id: string;
          p_idempotency_key: string;
        };
        Returns: string;
      };
      resolve_event_join: {
        Args: { p_join_code: string };
        Returns: {
          capacity: number;
          club_name: string;
          club_slug: string;
          club_timezone: string;
          ends_at: string;
          event_type: Database["public"]["Enums"]["event_type"];
          formats: string[];
          id: string;
          is_private: boolean;
          map_url: string | null;
          name: string;
          notes: string | null;
          record_class: Database["public"]["Enums"]["record_class"];
          starts_at: string;
          status: Database["public"]["Enums"]["event_status"];
          venue: string;
        }[];
      };
      request_trust_score_review: {
        Args: {
          p_idempotency_key: string;
          p_ledger_entry_id: string;
          p_reason: string;
        };
        Returns: string;
      };
      update_my_player_profile: {
        Args: {
          p_avatar_path: string | null;
          p_display_name: string;
          p_expected_version: number;
          p_idempotency_key: string;
        };
        Returns: {
          avatar_path: string | null;
          display_name: string;
          player_id: string;
          version: number;
        }[];
      };
      update_event_details: {
        Args: {
          p_capacity: number;
          p_ends_at: string;
          p_event_id: string;
          p_expected_version: number;
          p_idempotency_key: string;
          p_map_url: string | null;
          p_name: string;
          p_notes: string | null;
          p_starts_at: string;
          p_venue: string;
        };
        Returns: number;
      };
      resolve_result_dispute: {
        Args: {
          p_corrected_score: Json;
          p_dispute_id: string;
          p_idempotency_key: string;
          p_reason: string;
          p_resolution: string;
        };
        Returns: {
          calculation_version: number;
          dispute_id: string;
          result_status: string;
          revision_id: string;
        }[];
      };
      review_report: {
        Args: {
          p_decision: string;
          p_expected_version: number;
          p_idempotency_key: string;
          p_reason: string;
          p_report_id: string;
        };
        Returns: {
          report_id: string;
          status: string;
          version: number;
        }[];
      };
      set_club_subscription_webhook: {
        Args: {
          p_club_id: string;
          p_event_id: string;
          p_status: Database["public"]["Enums"]["subscription_status"];
          p_valid_until: string;
        };
        Returns: undefined;
      };
      set_event_attendance: {
        Args: {
          p_event_id: string;
          p_idempotency_key: string;
          p_player_id: string;
          p_reason: string;
          p_state: string;
        };
        Returns: {
          attendance_id: string;
          state: string;
          version: number;
        }[];
      };
      set_membership_role: {
        Args: {
          p_club_id: string;
          p_idempotency_key: string;
          p_membership_id: string;
          p_reason: string;
          p_role: Database["public"]["Enums"]["club_role"];
        };
        Returns: number;
      };
      submit_match_result: {
        Args: { p_idempotency_key: string; p_match_id: string; p_score: Json };
        Returns: {
          result_id: string;
          revision_id: string;
          status: string;
          version: number;
        }[];
      };
      transition_event: {
        Args: {
          p_event_id: string;
          p_expected_version: number;
          p_idempotency_key: string;
          p_transition: Database["public"]["Enums"]["event_status"];
        };
        Returns: number;
      };
      withdraw_from_event: {
        Args: {
          p_event_id: string;
          p_idempotency_key: string;
          p_reason: string;
        };
        Returns: string;
      };
    };
    Enums: {
      club_role: "owner" | "organizer" | "score_official" | "staff" | "member";
      dispute_resolution: "upheld" | "corrected" | "voided";
      dispute_status: "open" | "resolved";
      duplicate_review_status:
        "open" | "reviewing" | "merged" | "not_duplicate" | "dismissed";
      event_status:
        | "draft"
        | "published"
        | "registration_closed"
        | "in_progress"
        | "completed"
        | "canceled";
      event_type: "open_play" | "tournament" | "league" | "clinic" | "other";
      match_format: "singles" | "doubles";
      match_proposal_status: "pending" | "confirmed" | "expired" | "canceled";
      match_status:
        | "assigned"
        | "playing"
        | "score_pending"
        | "finalized"
        | "disputed"
        | "voided"
        | "canceled";
      membership_status: "invited" | "active" | "suspended" | "left";
      moderation_action_status: "active" | "expired" | "reversed";
      queue_entry_state: "ready" | "assigned" | "left" | "unavailable";
      ranked_effect_state: "active" | "suspended" | "none";
      record_class: "ranked" | "unranked";
      registration_status:
        "confirmed" | "waitlisted" | "withdrawn" | "canceled";
      report_status:
        "open" | "reviewing" | "actioned" | "dismissed" | "reopened";
      result_revision_status:
        "pending" | "accepted" | "superseded" | "rejected";
      result_status:
        "pending_confirmation" | "finalized" | "disputed" | "voided";
      subscription_status:
        "trialing" | "active" | "past_due" | "canceled" | "expired";
      trust_review_status:
        "open" | "reviewing" | "upheld" | "adjusted" | "dismissed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      club_role: ["owner", "organizer", "score_official", "staff", "member"],
      dispute_resolution: ["upheld", "corrected", "voided"],
      dispute_status: ["open", "resolved"],
      duplicate_review_status: [
        "open",
        "reviewing",
        "merged",
        "not_duplicate",
        "dismissed",
      ],
      event_status: [
        "draft",
        "published",
        "registration_closed",
        "in_progress",
        "completed",
        "canceled",
      ],
      event_type: ["open_play", "tournament", "league", "clinic", "other"],
      match_format: ["singles", "doubles"],
      match_proposal_status: ["pending", "confirmed", "expired", "canceled"],
      match_status: [
        "assigned",
        "playing",
        "score_pending",
        "finalized",
        "disputed",
        "voided",
        "canceled",
      ],
      membership_status: ["invited", "active", "suspended", "left"],
      moderation_action_status: ["active", "expired", "reversed"],
      queue_entry_state: ["ready", "assigned", "left", "unavailable"],
      ranked_effect_state: ["active", "suspended", "none"],
      record_class: ["ranked", "unranked"],
      registration_status: ["confirmed", "waitlisted", "withdrawn", "canceled"],
      report_status: ["open", "reviewing", "actioned", "dismissed", "reopened"],
      result_revision_status: ["pending", "accepted", "superseded", "rejected"],
      result_status: [
        "pending_confirmation",
        "finalized",
        "disputed",
        "voided",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "expired",
      ],
      trust_review_status: [
        "open",
        "reviewing",
        "upheld",
        "adjusted",
        "dismissed",
      ],
    },
  },
} as const;
