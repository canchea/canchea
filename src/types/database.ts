export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          actor_id: string | null
          booking_id: string | null
          event_name: string
          id: number
          metadata: Json
          occurred_at: string
          venue_id: string | null
          visitor_id: string | null
        }
        Insert: {
          actor_id?: string | null
          booking_id?: string | null
          event_name: string
          id?: never
          metadata?: Json
          occurred_at?: string
          venue_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          actor_id?: string | null
          booking_id?: string | null
          event_name?: string
          id?: never
          metadata?: Json
          occurred_at?: string
          venue_id?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: never
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: never
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["booking_status"] | null
          id: number
          metadata: Json
          reason: string
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: never
          metadata?: Json
          reason: string
          to_status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: never
          metadata?: Json
          reason?: string
          to_status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          cancellation_policy_tier: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_amount_bob: number
          commission_percentage: number
          completed_at: string | null
          completed_by: string | null
          confirmed_at: string | null
          court_id: string
          created_at: string
          deposit_amount_bob: number
          deposit_paid_at: string | null
          duration_minutes: number
          ends_at: string
          expired_at: string | null
          hold_expires_at: string | null
          id: string
          in_progress_at: string | null
          no_show_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          penalty_amount_bob: number
          player_id: string
          public_code: string
          refund_amount_bob: number
          remaining_balance_bob: number
          settlement_status: Database["public"]["Enums"]["settlement_status"]
          slot_period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price_bob: number
          updated_at: string
          venue_id: string
          venue_net_amount_bob: number
        }
        Insert: {
          cancellation_policy_tier?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_amount_bob: number
          commission_percentage: number
          completed_at?: string | null
          completed_by?: string | null
          confirmed_at?: string | null
          court_id: string
          created_at?: string
          deposit_amount_bob: number
          deposit_paid_at?: string | null
          duration_minutes: number
          ends_at: string
          expired_at?: string | null
          hold_expires_at?: string | null
          id?: string
          in_progress_at?: string | null
          no_show_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          penalty_amount_bob?: number
          player_id: string
          public_code: string
          refund_amount_bob?: number
          remaining_balance_bob: number
          settlement_status?: Database["public"]["Enums"]["settlement_status"]
          slot_period?: unknown
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price_bob: number
          updated_at?: string
          venue_id: string
          venue_net_amount_bob: number
        }
        Update: {
          cancellation_policy_tier?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          commission_amount_bob?: number
          commission_percentage?: number
          completed_at?: string | null
          completed_by?: string | null
          confirmed_at?: string | null
          court_id?: string
          created_at?: string
          deposit_amount_bob?: number
          deposit_paid_at?: string | null
          duration_minutes?: number
          ends_at?: string
          expired_at?: string | null
          hold_expires_at?: string | null
          id?: string
          in_progress_at?: string | null
          no_show_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          penalty_amount_bob?: number
          player_id?: string
          public_code?: string
          refund_amount_bob?: number
          remaining_balance_bob?: number
          settlement_status?: Database["public"]["Enums"]["settlement_status"]
          slot_period?: unknown
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_price_bob?: number
          updated_at?: string
          venue_id?: string
          venue_net_amount_bob?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_court_venue_consistency"
            columns: ["court_id", "venue_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id", "venue_id"]
          },
          {
            foreignKeyName: "bookings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          booking_id: string
          category: Database["public"]["Enums"]["complaint_category"]
          created_at: string
          description: string
          id: string
          player_id: string
          resolution_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          updated_at: string
          venue_id: string
        }
        Insert: {
          booking_id: string
          category: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          description: string
          id?: string
          player_id: string
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
          venue_id: string
        }
        Update: {
          booking_id?: string
          category?: Database["public"]["Enums"]["complaint_category"]
          created_at?: string
          description?: string
          id?: string
          player_id?: string
          resolution_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      court_blocks: {
        Row: {
          court_id: string
          created_at: string
          created_by: string
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["court_block_kind"]
          period: unknown
          reason: string | null
          starts_at: string
        }
        Insert: {
          court_id: string
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          kind: Database["public"]["Enums"]["court_block_kind"]
          period?: unknown
          reason?: string | null
          starts_at: string
        }
        Update: {
          court_id?: string
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["court_block_kind"]
          period?: unknown
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_blocks_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      court_durations: {
        Row: {
          court_id: string
          duration_minutes: number
        }
        Insert: {
          court_id: string
          duration_minutes: number
        }
        Update: {
          court_id?: string
          duration_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "court_durations_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      court_feature_assignments: {
        Row: {
          court_id: string
          feature_id: number
        }
        Insert: {
          court_id: string
          feature_id: number
        }
        Update: {
          court_id?: string
          feature_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "court_feature_assignments_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_feature_assignments_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "court_features"
            referencedColumns: ["id"]
          },
        ]
      }
      court_features: {
        Row: {
          created_at: string
          icon: string
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon: string
          id?: number
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: number
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      court_photos: {
        Row: {
          alt_text: string
          court_id: string
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["court_photo_kind"]
          object_path: string
          sort_order: number
        }
        Insert: {
          alt_text: string
          court_id: string
          created_at?: string
          created_by: string
          id?: string
          kind: Database["public"]["Enums"]["court_photo_kind"]
          object_path: string
          sort_order?: number
        }
        Update: {
          alt_text?: string
          court_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["court_photo_kind"]
          object_path?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "court_photos_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_photos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      court_pricing_rules: {
        Row: {
          court_id: string
          created_at: string
          created_by: string
          day_of_week: number
          duration_minutes: number
          ends_minute: number
          id: string
          is_active: boolean
          minute_range: unknown
          price_bob: number
          starts_minute: number
          updated_at: string
        }
        Insert: {
          court_id: string
          created_at?: string
          created_by: string
          day_of_week: number
          duration_minutes: number
          ends_minute: number
          id?: string
          is_active?: boolean
          minute_range?: unknown
          price_bob: number
          starts_minute: number
          updated_at?: string
        }
        Update: {
          court_id?: string
          created_at?: string
          created_by?: string
          day_of_week?: number
          duration_minutes?: number
          ends_minute?: number
          id?: string
          is_active?: boolean
          minute_range?: unknown
          price_bob?: number
          starts_minute?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_pricing_rules_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_pricing_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      court_surfaces: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      court_weekly_schedules: {
        Row: {
          closes_minute: number | null
          court_id: string
          day_of_week: number
          is_available: boolean
          opens_minute: number | null
          updated_at: string
        }
        Insert: {
          closes_minute?: number | null
          court_id: string
          day_of_week: number
          is_available?: boolean
          opens_minute?: number | null
          updated_at?: string
        }
        Update: {
          closes_minute?: number | null
          court_id?: string
          day_of_week?: number
          is_available?: boolean
          opens_minute?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_weekly_schedules_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          capacity: number
          created_at: string
          has_lighting: boolean
          id: string
          is_roofed: boolean
          length_m: number
          modality_id: number
          name: string
          rating_average: number
          review_count: number
          slug: string
          sport_id: number
          status: Database["public"]["Enums"]["court_status"]
          surface_id: number
          updated_at: string
          venue_id: string
          width_m: number
        }
        Insert: {
          capacity: number
          created_at?: string
          has_lighting?: boolean
          id?: string
          is_roofed?: boolean
          length_m: number
          modality_id: number
          name: string
          rating_average?: number
          review_count?: number
          slug: string
          sport_id: number
          status?: Database["public"]["Enums"]["court_status"]
          surface_id: number
          updated_at?: string
          venue_id: string
          width_m: number
        }
        Update: {
          capacity?: number
          created_at?: string
          has_lighting?: boolean
          id?: string
          is_roofed?: boolean
          length_m?: number
          modality_id?: number
          name?: string
          rating_average?: number
          review_count?: number
          slug?: string
          sport_id?: number
          status?: Database["public"]["Enums"]["court_status"]
          surface_id?: number
          updated_at?: string
          venue_id?: string
          width_m?: number
        }
        Relationships: [
          {
            foreignKeyName: "courts_modality_matches_sport"
            columns: ["modality_id", "sport_id"]
            isOneToOne: false
            referencedRelation: "sport_modalities"
            referencedColumns: ["id", "sport_id"]
          },
          {
            foreignKeyName: "courts_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courts_surface_id_fkey"
            columns: ["surface_id"]
            isOneToOne: false
            referencedRelation: "court_surfaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courts_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_courts: {
        Row: {
          court_id: string
          created_at: string
          player_id: string
        }
        Insert: {
          court_id: string
          created_at?: string
          player_id: string
        }
        Update: {
          court_id?: string
          created_at?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_courts_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_courts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_venues: {
        Row: {
          created_at: string
          player_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          player_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          player_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_venues_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_venues_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account: Database["public"]["Enums"]["ledger_account"]
          amount_bob: number
          created_at: string
          currency: string
          direction: Database["public"]["Enums"]["ledger_direction"]
          id: number
          transaction_id: string
        }
        Insert: {
          account: Database["public"]["Enums"]["ledger_account"]
          amount_bob: number
          created_at?: string
          currency?: string
          direction: Database["public"]["Enums"]["ledger_direction"]
          id?: never
          transaction_id: string
        }
        Update: {
          account?: Database["public"]["Enums"]["ledger_account"]
          amount_bob?: number
          created_at?: string
          currency?: string
          direction?: Database["public"]["Enums"]["ledger_direction"]
          id?: never
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "ledger_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          booking_id: string
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["ledger_transaction_kind"]
          metadata: Json
          occurred_at: string
          payment_order_id: string | null
          reference: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["ledger_transaction_kind"]
          metadata?: Json
          occurred_at?: string
          payment_order_id?: string | null
          reference: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["ledger_transaction_kind"]
          metadata?: Json
          occurred_at?: string
          payment_order_id?: string | null
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_transactions_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempts: number
          channel: string
          id: string
          last_error_code: string | null
          notification_id: string
          provider: string | null
          provider_message_id: string | null
          queued_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel: string
          id?: string
          last_error_code?: string | null
          notification_id: string
          provider?: string | null
          provider_message_id?: string | null
          queued_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          id?: string
          last_error_code?: string | null
          notification_id?: string
          provider?: string | null
          provider_message_id?: string | null
          queued_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          read_at: string | null
          recipient_id: string
          title: string
        }
        Insert: {
          action_url?: string | null
          body: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: string
          read_at?: string | null
          recipient_id: string
          title: string
        }
        Update: {
          action_url?: string | null
          body?: string
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          recipient_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount_bob: number
          booking_id: string
          checkout_url: string | null
          created_at: string
          currency: string
          expires_at: string
          failed_at: string | null
          id: string
          idempotency_key: string
          paid_at: string | null
          provider: string
          provider_metadata: Json
          provider_order_id: string
          qr_payload: string | null
          status: Database["public"]["Enums"]["payment_order_status"]
          updated_at: string
        }
        Insert: {
          amount_bob: number
          booking_id: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          expires_at: string
          failed_at?: string | null
          id?: string
          idempotency_key: string
          paid_at?: string | null
          provider: string
          provider_metadata?: Json
          provider_order_id: string
          qr_payload?: string | null
          status?: Database["public"]["Enums"]["payment_order_status"]
          updated_at?: string
        }
        Update: {
          amount_bob?: number
          booking_id?: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          expires_at?: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          paid_at?: string | null
          provider?: string
          provider_metadata?: Json
          provider_order_id?: string
          qr_payload?: string | null
          status?: Database["public"]["Enums"]["payment_order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          booking_id: string | null
          error_code: string | null
          event_type: string
          id: string
          payload: Json
          payment_order_id: string | null
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          signature_valid: boolean
          status: Database["public"]["Enums"]["payment_event_status"]
        }
        Insert: {
          booking_id?: string | null
          error_code?: string | null
          event_type: string
          id?: string
          payload: Json
          payment_order_id?: string | null
          processed_at?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
          signature_valid?: boolean
          status?: Database["public"]["Enums"]["payment_event_status"]
        }
        Update: {
          booking_id?: string | null
          error_code?: string | null
          event_type?: string
          id?: string
          payload?: Json
          payment_order_id?: string | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          signature_valid?: boolean
          status?: Database["public"]["Enums"]["payment_event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_webhook_events_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description: string
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          onboarding_completed_at: string | null
          phone_e164: string | null
          privacy_accepted_at: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          onboarding_completed_at?: string | null
          phone_e164?: string | null
          privacy_accepted_at?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed_at?: string | null
          phone_e164?: string | null
          privacy_accepted_at?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount_bob: number
          booking_id: string
          currency: string
          id: string
          payment_order_id: string
          processed_at: string | null
          provider_refund_id: string | null
          reason: string
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount_bob: number
          booking_id: string
          currency?: string
          id?: string
          payment_order_id: string
          processed_at?: string | null
          provider_refund_id?: string | null
          reason: string
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount_bob?: number
          booking_id?: string
          currency?: string
          id?: string
          payment_order_id?: string
          processed_at?: string | null
          provider_refund_id?: string | null
          reason?: string
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_order_id_fkey"
            columns: ["payment_order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          court_id: string
          created_at: string
          id: string
          player_id: string
          rating: number
          updated_at: string
          venue_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          court_id: string
          created_at?: string
          id?: string
          player_id: string
          rating: number
          updated_at?: string
          venue_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          court_id?: string
          created_at?: string
          id?: string
          player_id?: string
          rating?: number
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          icon: string
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon: string
          id?: number
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string
          id?: number
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      settlement_items: {
        Row: {
          amount_bob: number
          booking_id: string
          settlement_id: string
        }
        Insert: {
          amount_bob: number
          booking_id: string
          settlement_id: string
        }
        Update: {
          amount_bob?: number
          booking_id?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount_bob: number
          created_at: string
          created_by: string
          currency: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          reference: string
          status: Database["public"]["Enums"]["settlement_status"]
          venue_id: string
        }
        Insert: {
          amount_bob: number
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          reference: string
          status?: Database["public"]["Enums"]["settlement_status"]
          venue_id: string
        }
        Update: {
          amount_bob?: number
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          reference?: string
          status?: Database["public"]["Enums"]["settlement_status"]
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      sport_modalities: {
        Row: {
          created_at: string
          default_capacity: number
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          sport_id: number
        }
        Insert: {
          created_at?: string
          default_capacity: number
          id?: number
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          sport_id: number
        }
        Update: {
          created_at?: string
          default_capacity?: number
          id?: number
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          sport_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sport_modalities_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      venue_opening_hours: {
        Row: {
          closes_at: string | null
          day_of_week: number
          is_closed: boolean
          opens_at: string | null
          venue_id: string
        }
        Insert: {
          closes_at?: string | null
          day_of_week: number
          is_closed?: boolean
          opens_at?: string | null
          venue_id: string
        }
        Update: {
          closes_at?: string | null
          day_of_week?: number
          is_closed?: boolean
          opens_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_opening_hours_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_photos: {
        Row: {
          alt_text: string
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["venue_photo_kind"]
          object_path: string
          sort_order: number
          venue_id: string
        }
        Insert: {
          alt_text: string
          created_at?: string
          created_by: string
          id?: string
          kind: Database["public"]["Enums"]["venue_photo_kind"]
          object_path: string
          sort_order?: number
          venue_id: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["venue_photo_kind"]
          object_path?: string
          sort_order?: number
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_photos_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_photos_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_services: {
        Row: {
          service_id: number
          venue_id: string
        }
        Insert: {
          service_id: number
          venue_id: string
        }
        Update: {
          service_id?: number
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_services_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_status_history: {
        Row: {
          changed_by: string
          created_at: string
          from_status: Database["public"]["Enums"]["venue_status"] | null
          id: number
          note: string | null
          to_status: Database["public"]["Enums"]["venue_status"]
          venue_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["venue_status"] | null
          id?: never
          note?: string | null
          to_status: Database["public"]["Enums"]["venue_status"]
          venue_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["venue_status"] | null
          id?: never
          note?: string | null
          to_status?: Database["public"]["Enums"]["venue_status"]
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_status_history_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string
          approved_at: string | null
          booking_count: number
          city: string
          commercial_name: string
          created_at: string
          description: string
          id: string
          latitude: number
          longitude: number
          owner_id: string
          phone_e164: string
          rating_average: number
          review_count: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["venue_status"]
          submitted_at: string | null
          subscription_status: Database["public"]["Enums"]["venue_subscription_status"]
          timezone: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          whatsapp_e164: string
          zone: string
        }
        Insert: {
          address: string
          approved_at?: string | null
          booking_count?: number
          city?: string
          commercial_name: string
          created_at?: string
          description: string
          id?: string
          latitude: number
          longitude: number
          owner_id: string
          phone_e164: string
          rating_average?: number
          review_count?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          status?: Database["public"]["Enums"]["venue_status"]
          submitted_at?: string | null
          subscription_status?: Database["public"]["Enums"]["venue_subscription_status"]
          timezone?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          whatsapp_e164: string
          zone: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          booking_count?: number
          city?: string
          commercial_name?: string
          created_at?: string
          description?: string
          id?: string
          latitude?: number
          longitude?: number
          owner_id?: string
          phone_e164?: string
          rating_average?: number
          review_count?: number
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["venue_status"]
          submitted_at?: string | null
          subscription_status?: Database["public"]["Enums"]["venue_subscription_status"]
          timezone?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          whatsapp_e164?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_settlement: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_venue_id: string
        }
        Returns: {
          amount_bob: number
          created_at: string
          created_by: string
          currency: string
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          reference: string
          status: Database["public"]["Enums"]["settlement_status"]
          venue_id: string
        }
        SetofOptions: {
          from: "*"
          to: "settlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_mark_refund_processed: {
        Args: { p_provider_refund_id?: string; p_refund_id: string }
        Returns: {
          amount_bob: number
          booking_id: string
          currency: string
          id: string
          payment_order_id: string
          processed_at: string | null
          provider_refund_id: string | null
          reason: string
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "refunds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_review_complaint: {
        Args: {
          p_complaint_id: string
          p_resolution_note?: string
          p_status: Database["public"]["Enums"]["complaint_status"]
        }
        Returns: {
          booking_id: string
          category: Database["public"]["Enums"]["complaint_category"]
          created_at: string
          description: string
          id: string
          player_id: string
          resolution_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          updated_at: string
          venue_id: string
        }
        SetofOptions: {
          from: "*"
          to: "complaints"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_platform_setting: {
        Args: { p_key: string; p_value: Json }
        Returns: {
          description: string
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        SetofOptions: {
          from: "*"
          to: "platform_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_my_booking: {
        Args: { p_booking_id: string }
        Returns: {
          cancellation_policy_tier: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_amount_bob: number
          commission_percentage: number
          completed_at: string | null
          completed_by: string | null
          confirmed_at: string | null
          court_id: string
          created_at: string
          deposit_amount_bob: number
          deposit_paid_at: string | null
          duration_minutes: number
          ends_at: string
          expired_at: string | null
          hold_expires_at: string | null
          id: string
          in_progress_at: string | null
          no_show_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          penalty_amount_bob: number
          player_id: string
          public_code: string
          refund_amount_bob: number
          remaining_balance_bob: number
          settlement_status: Database["public"]["Enums"]["settlement_status"]
          slot_period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price_bob: number
          updated_at: string
          venue_id: string
          venue_net_amount_bob: number
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_onboarding: {
        Args: {
          p_accept_privacy: boolean
          p_accept_terms: boolean
          p_city: string
          p_first_name: string
          p_last_name: string
          p_phone_e164: string
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: {
          city: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          onboarding_completed_at: string | null
          phone_e164: string | null
          privacy_accepted_at: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          terms_accepted_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_booking_hold: {
        Args: {
          p_court_id: string
          p_duration_minutes: number
          p_starts_at: string
        }
        Returns: {
          cancellation_policy_tier: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_amount_bob: number
          commission_percentage: number
          completed_at: string | null
          completed_by: string | null
          confirmed_at: string | null
          court_id: string
          created_at: string
          deposit_amount_bob: number
          deposit_paid_at: string | null
          duration_minutes: number
          ends_at: string
          expired_at: string | null
          hold_expires_at: string | null
          id: string
          in_progress_at: string | null
          no_show_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          penalty_amount_bob: number
          player_id: string
          public_code: string
          refund_amount_bob: number
          remaining_balance_bob: number
          settlement_status: Database["public"]["Enums"]["settlement_status"]
          slot_period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price_bob: number
          updated_at: string
          venue_id: string
          venue_net_amount_bob: number
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_my_complaint: {
        Args: {
          p_booking_id: string
          p_category: Database["public"]["Enums"]["complaint_category"]
          p_description: string
        }
        Returns: {
          booking_id: string
          category: Database["public"]["Enums"]["complaint_category"]
          created_at: string
          description: string
          id: string
          player_id: string
          resolution_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          updated_at: string
          venue_id: string
        }
        SetofOptions: {
          from: "*"
          to: "complaints"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_my_court_block: {
        Args: {
          p_court_id: string
          p_ends_local: string
          p_kind: Database["public"]["Enums"]["court_block_kind"]
          p_reason?: string
          p_starts_local: string
        }
        Returns: {
          court_id: string
          created_at: string
          created_by: string
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["court_block_kind"]
          period: unknown
          reason: string | null
          starts_at: string
        }
        SetofOptions: {
          from: "*"
          to: "court_blocks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_my_mock_payment_order: {
        Args: { p_booking_id: string; p_idempotency_key: string }
        Returns: {
          amount_bob: number
          booking_id: string
          checkout_url: string | null
          created_at: string
          currency: string
          expires_at: string
          failed_at: string | null
          id: string
          idempotency_key: string
          paid_at: string | null
          provider: string
          provider_metadata: Json
          provider_order_id: string
          qr_payload: string | null
          status: Database["public"]["Enums"]["payment_order_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_my_pricing_rule: {
        Args: {
          p_court_id: string
          p_day_of_week: number
          p_duration_minutes: number
          p_ends_minute: number
          p_price_bob: number
          p_starts_minute: number
        }
        Returns: {
          court_id: string
          created_at: string
          created_by: string
          day_of_week: number
          duration_minutes: number
          ends_minute: number
          id: string
          is_active: boolean
          minute_range: unknown
          price_bob: number
          starts_minute: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "court_pricing_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_my_court_block: { Args: { p_block_id: string }; Returns: string }
      delete_my_court_photo: { Args: { p_photo_id: string }; Returns: string }
      delete_my_pricing_rule: { Args: { p_rule_id: string }; Returns: string }
      delete_my_venue_photo: { Args: { p_photo_id: string }; Returns: string }
      get_booking_deposit_quote: { Args: { p_price: number }; Returns: number }
      get_funnel_summary: { Args: { p_days?: number }; Returns: Json }
      get_court_availability: {
        Args: { p_court_id: string; p_date: string }
        Returns: {
          court_id: string
          duration_minutes: number
          ends_at: string
          price_bob: number
          slot_date: string
          start_time: string
          starts_at: string
        }[]
      }
      get_court_availability_range: {
        Args: { p_court_id: string; p_days?: number; p_start_date: string }
        Returns: {
          court_id: string
          duration_minutes: number
          ends_at: string
          price_bob: number
          slot_date: string
          start_time: string
          starts_at: string
        }[]
      }
      get_my_booking_checkout: {
        Args: { p_booking_id: string }
        Returns: {
          cancellation_policy_tier: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_amount_bob: number
          commission_percentage: number
          completed_at: string | null
          completed_by: string | null
          confirmed_at: string | null
          court_id: string
          created_at: string
          deposit_amount_bob: number
          deposit_paid_at: string | null
          duration_minutes: number
          ends_at: string
          expired_at: string | null
          hold_expires_at: string | null
          id: string
          in_progress_at: string | null
          no_show_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          penalty_amount_bob: number
          player_id: string
          public_code: string
          refund_amount_bob: number
          remaining_balance_bob: number
          settlement_status: Database["public"]["Enums"]["settlement_status"]
          slot_period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price_bob: number
          updated_at: string
          venue_id: string
          venue_net_amount_bob: number
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_payment_order: {
        Args: { p_booking_id: string }
        Returns: {
          amount_bob: number
          booking_id: string
          checkout_url: string | null
          created_at: string
          currency: string
          expires_at: string
          failed_at: string | null
          id: string
          idempotency_key: string
          paid_at: string | null
          provider: string
          provider_metadata: Json
          provider_order_id: string
          qr_payload: string | null
          status: Database["public"]["Enums"]["payment_order_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "payment_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_notification_deliveries: {
        Args: { p_channels: string[]; p_limit?: number }
        Returns: {
          action_url: string | null
          body: string
          channel: string
          delivery_id: string
          recipient_email: string | null
          recipient_phone: string | null
          title: string
        }[]
      }
      complete_notification_delivery: {
        Args: {
          p_delivery_id: string
          p_error_code?: string | null
          p_provider: string
          p_provider_message_id?: string | null
          p_success: boolean
        }
        Returns: boolean
      }
      mark_all_my_notifications_read: { Args: never; Returns: number }
      mark_my_notification_read: {
        Args: { p_notification_id: string }
        Returns: {
          action_url: string | null
          body: string
          created_at: string
          dedupe_key: string | null
          id: string
          kind: string
          read_at: string | null
          recipient_id: string
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      owner_update_booking_status: {
        Args: { p_action: string; p_booking_id: string }
        Returns: {
          cancellation_policy_tier: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_amount_bob: number
          commission_percentage: number
          completed_at: string | null
          completed_by: string | null
          confirmed_at: string | null
          court_id: string
          created_at: string
          deposit_amount_bob: number
          deposit_paid_at: string | null
          duration_minutes: number
          ends_at: string
          expired_at: string | null
          hold_expires_at: string | null
          id: string
          in_progress_at: string | null
          no_show_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          penalty_amount_bob: number
          player_id: string
          public_code: string
          refund_amount_bob: number
          remaining_balance_bob: number
          settlement_status: Database["public"]["Enums"]["settlement_status"]
          slot_period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price_bob: number
          updated_at: string
          venue_id: string
          venue_net_amount_bob: number
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      process_payment_webhook: {
        Args: {
          p_amount_bob: number
          p_currency: string
          p_event_type: string
          p_payload: Json
          p_provider: string
          p_provider_event_id: string
          p_provider_order_id: string
        }
        Returns: Json
      }
      queue_due_booking_reminders: { Args: never; Returns: number }
      register_my_court_photo: {
        Args: {
          p_alt_text: string
          p_court_id: string
          p_kind: Database["public"]["Enums"]["court_photo_kind"]
          p_object_path: string
        }
        Returns: {
          alt_text: string
          court_id: string
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["court_photo_kind"]
          object_path: string
          sort_order: number
        }
        SetofOptions: {
          from: "*"
          to: "court_photos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_my_venue_photo: {
        Args: {
          p_alt_text: string
          p_kind: Database["public"]["Enums"]["venue_photo_kind"]
          p_object_path: string
          p_venue_id: string
        }
        Returns: {
          alt_text: string
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["venue_photo_kind"]
          object_path: string
          sort_order: number
          venue_id: string
        }
        SetofOptions: {
          from: "*"
          to: "venue_photos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_my_booking_hold: {
        Args: { p_booking_id: string }
        Returns: {
          cancellation_policy_tier: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          commission_amount_bob: number
          commission_percentage: number
          completed_at: string | null
          completed_by: string | null
          confirmed_at: string | null
          court_id: string
          created_at: string
          deposit_amount_bob: number
          deposit_paid_at: string | null
          duration_minutes: number
          ends_at: string
          expired_at: string | null
          hold_expires_at: string | null
          id: string
          in_progress_at: string | null
          no_show_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          penalty_amount_bob: number
          player_id: string
          public_code: string
          refund_amount_bob: number
          remaining_balance_bob: number
          settlement_status: Database["public"]["Enums"]["settlement_status"]
          slot_period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          total_price_bob: number
          updated_at: string
          venue_id: string
          venue_net_amount_bob: number
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_venue: {
        Args: { p_decision: string; p_note?: string; p_venue_id: string }
        Returns: {
          address: string
          approved_at: string | null
          city: string
          commercial_name: string
          created_at: string
          description: string
          id: string
          latitude: number
          longitude: number
          owner_id: string
          phone_e164: string
          rating_average: number
          review_count: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["venue_status"]
          submitted_at: string | null
          subscription_status: Database["public"]["Enums"]["venue_subscription_status"]
          timezone: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          whatsapp_e164: string
          zone: string
        }
        SetofOptions: {
          from: "*"
          to: "venues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_my_court: {
        Args: {
          p_venue_id: string
          p_capacity: number
          p_court_id: string
          p_duration_minutes: number[]
          p_feature_slugs: string[]
          p_has_lighting: boolean
          p_is_roofed: boolean
          p_length_m: number
          p_modality_slug: string
          p_name: string
          p_sport_slug: string
          p_surface_slug: string
          p_width_m: number
        }
        Returns: {
          capacity: number
          created_at: string
          has_lighting: boolean
          id: string
          is_roofed: boolean
          length_m: number
          modality_id: number
          name: string
          rating_average: number
          review_count: number
          slug: string
          sport_id: number
          status: Database["public"]["Enums"]["court_status"]
          surface_id: number
          updated_at: string
          venue_id: string
          width_m: number
        }
        SetofOptions: {
          from: "*"
          to: "courts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_my_court_schedule: {
        Args: { p_court_id: string; p_schedule: Json }
        Returns: {
          closes_minute: number | null
          court_id: string
          day_of_week: number
          is_available: boolean
          opens_minute: number | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "court_weekly_schedules"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      save_my_venue: {
        Args: {
          p_venue_id: string
          p_address: string
          p_city: string
          p_commercial_name: string
          p_description: string
          p_hours: Json
          p_latitude: number
          p_longitude: number
          p_phone_e164: string
          p_service_slugs: string[]
          p_whatsapp_e164: string
          p_zone: string
        }
        Returns: {
          address: string
          approved_at: string | null
          city: string
          commercial_name: string
          created_at: string
          description: string
          id: string
          latitude: number
          longitude: number
          owner_id: string
          phone_e164: string
          rating_average: number
          review_count: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["venue_status"]
          submitted_at: string | null
          subscription_status: Database["public"]["Enums"]["venue_subscription_status"]
          timezone: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          whatsapp_e164: string
          zone: string
        }
        SetofOptions: {
          from: "*"
          to: "venues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      search_available_courts: {
        Args: {
          p_date?: string
          p_duration_minutes?: number
          p_latitude?: number
          p_limit?: number
          p_longitude?: number
          p_max_price_bob?: number
          p_min_price_bob?: number
          p_offset?: number
          p_sort?: string
          p_sport_slug?: string
          p_time?: string
          p_zone?: string
        }
        Returns: {
          capacity: number
          court_features: string[]
          court_id: string
          court_name: string
          cover_alt_text: string
          cover_object_path: string
          distance_km: number
          duration_minutes: number
          ends_at: string
          has_lighting: boolean
          is_roofed: boolean
          modality_name: string
          price_bob: number
          slot_date: string
          sport_name: string
          sport_slug: string
          start_time: string
          starts_at: string
          surface_name: string
          total_count: number
          venue_city: string
          venue_id: string
          venue_latitude: number
          venue_longitude: number
          venue_name: string
          venue_services: string[]
          venue_slug: string
          venue_zone: string
        }[]
      }
      set_my_court_status: {
        Args: { p_court_id: string; p_status: string }
        Returns: {
          capacity: number
          created_at: string
          has_lighting: boolean
          id: string
          is_roofed: boolean
          length_m: number
          modality_id: number
          name: string
          rating_average: number
          review_count: number
          slug: string
          sport_id: number
          status: Database["public"]["Enums"]["court_status"]
          surface_id: number
          updated_at: string
          venue_id: string
          width_m: number
        }
        SetofOptions: {
          from: "*"
          to: "courts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      simulate_my_mock_payment: {
        Args: { p_idempotency_key: string; p_payment_order_id: string }
        Returns: Json
      }
      submit_my_review: {
        Args: { p_booking_id: string; p_comment?: string; p_rating: number }
        Returns: {
          booking_id: string
          comment: string | null
          court_id: string
          created_at: string
          id: string
          player_id: string
          rating: number
          updated_at: string
          venue_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reviews"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_my_venue: {
        Args: { p_venue_id: string }
        Returns: {
          address: string
          approved_at: string | null
          city: string
          commercial_name: string
          created_at: string
          description: string
          id: string
          latitude: number
          longitude: number
          owner_id: string
          phone_e164: string
          rating_average: number
          review_count: number
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: Database["public"]["Enums"]["venue_status"]
          submitted_at: string | null
          subscription_status: Database["public"]["Enums"]["venue_subscription_status"]
          timezone: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          whatsapp_e164: string
          zone: string
        }
        SetofOptions: {
          from: "*"
          to: "venues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_my_venue_booking_states: { Args: never; Returns: number }
      toggle_my_court_favorite: {
        Args: { p_court_id: string }
        Returns: boolean
      }
      toggle_my_venue_favorite: {
        Args: { p_venue_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "player" | "venue_owner" | "super_admin"
      booking_status:
        | "pending_payment"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
        | "expired"
        | "refunded_partial"
      complaint_category:
        | "court_unavailable"
        | "venue_closed"
        | "payment_issue"
        | "facility_mismatch"
        | "cancellation"
        | "other"
      complaint_status: "open" | "in_review" | "resolved" | "rejected"
      court_block_kind: "maintenance" | "event" | "internal_use" | "other"
      court_photo_kind: "cover" | "gallery"
      court_status: "draft" | "active" | "inactive"
      ledger_account:
        | "platform_cash"
        | "platform_commission_revenue"
        | "commission_receivable"
        | "venue_payable"
        | "player_refund_payable"
        | "platform_cancellation_revenue"
      ledger_direction: "debit" | "credit"
      ledger_transaction_kind:
        | "deposit_payment"
        | "refund"
        | "settlement"
        | "adjustment"
        | "cancellation"
        | "refund_processed"
      notification_delivery_status: "queued" | "sent" | "failed" | "cancelled"
      payment_event_status: "received" | "processed" | "ignored" | "failed"
      payment_order_status:
        | "pending"
        | "paid"
        | "failed"
        | "expired"
        | "cancelled"
        | "refunded_partial"
        | "refunded"
      payment_status:
        | "unpaid"
        | "pending"
        | "paid"
        | "failed"
        | "refunded_partial"
        | "refunded"
      refund_status: "pending" | "processed" | "failed" | "cancelled"
      settlement_status: "not_due" | "pending" | "settled" | "reversed"
      venue_photo_kind: "logo" | "cover" | "gallery"
      venue_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "changes_requested"
      venue_subscription_status:
        | "trial"
        | "inactive"
        | "active"
        | "past_due"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["player", "venue_owner", "super_admin"],
      booking_status: [
        "pending_payment",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
        "expired",
        "refunded_partial",
      ],
      complaint_category: [
        "court_unavailable",
        "venue_closed",
        "payment_issue",
        "facility_mismatch",
        "cancellation",
        "other",
      ],
      complaint_status: ["open", "in_review", "resolved", "rejected"],
      court_block_kind: ["maintenance", "event", "internal_use", "other"],
      court_photo_kind: ["cover", "gallery"],
      court_status: ["draft", "active", "inactive"],
      ledger_account: [
        "platform_cash",
        "platform_commission_revenue",
        "commission_receivable",
        "venue_payable",
        "player_refund_payable",
        "platform_cancellation_revenue",
      ],
      ledger_direction: ["debit", "credit"],
      ledger_transaction_kind: [
        "deposit_payment",
        "refund",
        "settlement",
        "adjustment",
        "cancellation",
        "refund_processed",
      ],
      notification_delivery_status: ["queued", "sent", "failed", "cancelled"],
      payment_event_status: ["received", "processed", "ignored", "failed"],
      payment_order_status: [
        "pending",
        "paid",
        "failed",
        "expired",
        "cancelled",
        "refunded_partial",
        "refunded",
      ],
      payment_status: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "refunded_partial",
        "refunded",
      ],
      refund_status: ["pending", "processed", "failed", "cancelled"],
      settlement_status: ["not_due", "pending", "settled", "reversed"],
      venue_photo_kind: ["logo", "cover", "gallery"],
      venue_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "changes_requested",
      ],
      venue_subscription_status: [
        "trial",
        "inactive",
        "active",
        "past_due",
        "cancelled",
      ],
    },
  },
} as const

export type AppRole = Database["public"]["Enums"]["app_role"]
export type VenueStatus = Database["public"]["Enums"]["venue_status"]
export type VenuePhotoKind = Database["public"]["Enums"]["venue_photo_kind"]
export type CourtPhotoKind = Database["public"]["Enums"]["court_photo_kind"]
export type CourtBlockKind = Database["public"]["Enums"]["court_block_kind"]
export type BookingStatus = Database["public"]["Enums"]["booking_status"]
export type PaymentStatus = Database["public"]["Enums"]["payment_status"]
export type PaymentOrderStatus = Database["public"]["Enums"]["payment_order_status"]
export type SettlementStatus = Database["public"]["Enums"]["settlement_status"]
export type ComplaintCategory = Database["public"]["Enums"]["complaint_category"]
export type ComplaintStatus = Database["public"]["Enums"]["complaint_status"]

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Venue = Database["public"]["Tables"]["venues"]["Row"]
export type VenuePhoto = Database["public"]["Tables"]["venue_photos"]["Row"]
export type Court = Database["public"]["Tables"]["courts"]["Row"]
export type CourtPhoto = Database["public"]["Tables"]["court_photos"]["Row"]
export type Booking = Database["public"]["Tables"]["bookings"]["Row"]
export type PaymentOrder = Database["public"]["Tables"]["payment_orders"]["Row"]
export type BookingStatusHistory = Database["public"]["Tables"]["booking_status_history"]["Row"]
export type SearchAvailabilityResult = Database["public"]["Functions"]["search_available_courts"]["Returns"][number]
