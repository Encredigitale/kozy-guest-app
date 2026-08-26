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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      api_tokens: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          scopes: string[]
          token_hash: string
          token_prefix: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash: string
          token_prefix: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          scopes?: string[]
          token_hash?: string
          token_prefix?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          target: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          target?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          target?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contribution_categories: {
        Row: {
          active: boolean
          created_at: string
          event_type_keys: string[]
          icon: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          event_type_keys?: string[]
          icon?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          event_type_keys?: string[]
          icon?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      contribution_choices: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          sort_order: number
          type_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          type_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_choices_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "contribution_types"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_commitments: {
        Row: {
          contact_id: string | null
          created_at: string
          guest_name: string | null
          id: string
          invitation_id: string | null
          need_id: string
          note: string | null
          quantity: number
          status: Database["public"]["Enums"]["contribution_commitment_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          invitation_id?: string | null
          need_id: string
          note?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["contribution_commitment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          invitation_id?: string | null
          need_id?: string
          note?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["contribution_commitment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_commitments_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_commitments_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "contribution_needs"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_logs: {
        Row: {
          action: string
          actor_label: string | null
          created_at: string
          event_id: string
          id: string
          metadata: Json
          need_id: string | null
        }
        Insert: {
          action: string
          actor_label?: string | null
          created_at?: string
          event_id: string
          id?: string
          metadata?: Json
          need_id?: string | null
        }
        Update: {
          action?: string
          actor_label?: string | null
          created_at?: string
          event_id?: string
          id?: string
          metadata?: Json
          need_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_needs: {
        Row: {
          allow_overcommitment: boolean
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string
          id: string
          label: string
          need_type: Database["public"]["Enums"]["contribution_need_type"]
          priority: Database["public"]["Enums"]["contribution_need_priority"]
          status: Database["public"]["Enums"]["contribution_need_status"]
          target_quantity: number
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          allow_overcommitment?: boolean
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id: string
          id?: string
          label: string
          need_type?: Database["public"]["Enums"]["contribution_need_type"]
          priority?: Database["public"]["Enums"]["contribution_need_priority"]
          status?: Database["public"]["Enums"]["contribution_need_status"]
          target_quantity?: number
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          allow_overcommitment?: boolean
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string
          id?: string
          label?: string
          need_type?: Database["public"]["Enums"]["contribution_need_type"]
          priority?: Database["public"]["Enums"]["contribution_need_priority"]
          status?: Database["public"]["Enums"]["contribution_need_status"]
          target_quantity?: number
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_needs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "contribution_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_needs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_needs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "contribution_units"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_suggestions: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          event_type_key: string | null
          id: string
          label: string
          need_type: Database["public"]["Enums"]["contribution_need_type"]
          sort_order: number
          target_quantity: number | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          event_type_key?: string | null
          id?: string
          label: string
          need_type?: Database["public"]["Enums"]["contribution_need_type"]
          sort_order?: number
          target_quantity?: number | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          event_type_key?: string | null
          id?: string
          label?: string
          need_type?: Database["public"]["Enums"]["contribution_need_type"]
          sort_order?: number
          target_quantity?: number | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_suggestions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "contribution_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_suggestions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "contribution_units"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_types: {
        Row: {
          active: boolean
          allow_free_text: boolean
          allow_subchoices: boolean
          created_at: string
          event_type_keys: string[]
          icon: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allow_free_text?: boolean
          allow_subchoices?: boolean
          created_at?: string
          event_type_keys?: string[]
          icon?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allow_free_text?: boolean
          allow_subchoices?: boolean
          created_at?: string
          event_type_keys?: string[]
          icon?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      contribution_units: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          kind: Database["public"]["Enums"]["contribution_unit_kind"]
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          kind?: Database["public"]["Enums"]["contribution_unit_kind"]
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          kind?: Database["public"]["Enums"]["contribution_unit_kind"]
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_layout: {
        Row: {
          created_at: string
          id: string
          position: number
          size: string
          updated_at: string
          user_id: string | null
          visible: boolean
          widget_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          size?: string
          updated_at?: string
          user_id?: string | null
          visible?: boolean
          widget_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          size?: string
          updated_at?: string
          user_id?: string | null
          visible?: boolean
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layout_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      event_extensions: {
        Row: {
          created_at: string
          enabled: boolean
          event_id: string
          extension_key: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_id: string
          extension_key: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_id?: string
          extension_key?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_extensions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          email: string | null
          event_id: string
          id: string
          role: Database["public"]["Enums"]["participant_role"]
          rsvp_status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          role?: Database["public"]["Enums"]["participant_role"]
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          role?: Database["public"]["Enums"]["participant_role"]
          rsvp_status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_types: {
        Row: {
          active: boolean
          created_at: string
          default_widgets: string[]
          description: string | null
          icon: string
          id: string
          key: string
          label: string
          menu_components: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_widgets?: string[]
          description?: string | null
          icon?: string
          id?: string
          key: string
          label: string
          menu_components?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_widgets?: string[]
          description?: string | null
          icon?: string
          id?: string
          key?: string
          label?: string
          menu_components?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_widgets: {
        Row: {
          created_at: string
          enabled: boolean
          event_id: string
          position: number
          size: string | null
          updated_at: string
          widget_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          event_id: string
          position?: number
          size?: string | null
          updated_at?: string
          widget_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          event_id?: string
          position?: number
          size?: string | null
          updated_at?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_widgets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_widgets_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          metadata: Json
          organizer_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          organizer_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          metadata?: Json
          organizer_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      extension_settings: {
        Row: {
          created_at: string
          event_id: string | null
          extension_key: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          extension_key: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          extension_key?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_settings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      extensions: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          installed_from: string | null
          key: string
          manifest: Json
          menu_order: Json
          min_core_version: string
          min_db_version: number
          name: string
          scope: string
          sort_order: number
          updated_at: string
          version: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          installed_from?: string | null
          key: string
          manifest?: Json
          menu_order?: Json
          min_core_version?: string
          min_db_version?: number
          name: string
          scope?: string
          sort_order?: number
          updated_at?: string
          version?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          installed_from?: string | null
          key?: string
          manifest?: Json
          menu_order?: Json
          min_core_version?: string
          min_db_version?: number
          name?: string
          scope?: string
          sort_order?: number
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      guest_contributions: {
        Row: {
          choice_id: string | null
          contact_id: string | null
          contribution_type_id: string | null
          created_at: string
          event_id: string
          guest_user_id: string | null
          id: string
          invitation_id: string
          label: string
          note: string | null
          quantity: number | null
          status: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          choice_id?: string | null
          contact_id?: string | null
          contribution_type_id?: string | null
          created_at?: string
          event_id: string
          guest_user_id?: string | null
          id?: string
          invitation_id: string
          label: string
          note?: string | null
          quantity?: number | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          choice_id?: string | null
          contact_id?: string | null
          contribution_type_id?: string | null
          created_at?: string
          event_id?: string
          guest_user_id?: string | null
          id?: string
          invitation_id?: string
          label?: string
          note?: string | null
          quantity?: number | null
          status?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_contributions_choice_id_fkey"
            columns: ["choice_id"]
            isOneToOne: false
            referencedRelation: "contribution_choices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_contributions_contribution_type_id_fkey"
            columns: ["contribution_type_id"]
            isOneToOne: false
            referencedRelation: "contribution_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_contributions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_contributions_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          invitation_id: string
          metadata: Json
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          invitation_id: string
          metadata?: Json
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          invitation_id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "invitation_logs_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_settings: {
        Row: {
          created_at: string
          key: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          key?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          key?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          contact_id: string | null
          created_at: string
          email: string | null
          event_id: string
          expires_at: string | null
          guest_user_id: string | null
          id: string
          message: string | null
          name: string | null
          opened_at: string | null
          organizer_id: string
          phone: string | null
          responded_at: string | null
          revoked_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          expires_at?: string | null
          guest_user_id?: string | null
          id?: string
          message?: string | null
          name?: string | null
          opened_at?: string | null
          organizer_id: string
          phone?: string | null
          responded_at?: string | null
          revoked_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          expires_at?: string | null
          guest_user_id?: string | null
          id?: string
          message?: string | null
          name?: string | null
          opened_at?: string | null
          organizer_id?: string
          phone?: string | null
          responded_at?: string | null
          revoked_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "widget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_components: {
        Row: {
          active: boolean
          created_at: string
          event_types: string[]
          icon: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          event_types?: string[]
          icon?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          event_types?: string[]
          icon?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          metadata: Json
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          metadata?: Json
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email_verified_at: string | null
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email_verified_at?: string | null
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email_verified_at?: string | null
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      widget_items: {
        Row: {
          created_at: string
          done: boolean
          id: string
          owner_id: string
          payload: Json
          position: number
          scope_id: string | null
          scope_type: string
          updated_at: string
          widget_key: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          owner_id: string
          payload?: Json
          position?: number
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
          widget_key: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          owner_id?: string
          payload?: Json
          position?: number
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
          widget_key?: string
        }
        Relationships: []
      }
      widget_role_bindings: {
        Row: {
          created_at: string
          role: string
          widget_id: string
        }
        Insert: {
          created_at?: string
          role: string
          widget_id: string
        }
        Update: {
          created_at?: string
          role?: string
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "widget_role_bindings_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      widgets: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          manifest: Json
          name: string
          size: string
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id: string
          manifest?: Json
          name: string
          size?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          manifest?: Json
          name?: string
          size?: string
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commit_contribution: {
        Args: {
          _commitment_id?: string
          _contact_id?: string
          _guest_name?: string
          _invitation_id: string
          _need_id: string
          _note?: string
          _quantity: number
          _user_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      contact_group: "family" | "friends" | "colleagues" | "neighbors" | "other"
      contact_source: "personal" | "imported" | "member"
      contribution_commitment_status: "active" | "cancelled"
      contribution_need_priority: "normal" | "important" | "high"
      contribution_need_status: "open" | "closed" | "cancelled"
      contribution_need_type: "quantity" | "unique" | "people" | "money"
      contribution_unit_kind: "quantity" | "money" | "none"
      event_status: "draft" | "published" | "archived"
      invitation_status:
        | "draft"
        | "sent"
        | "opened"
        | "accepted"
        | "declined"
        | "maybe"
        | "cancelled"
        | "expired"
      notification_channel: "inapp" | "email" | "push"
      notification_status: "pending" | "sent" | "failed"
      participant_role: "organizer" | "guest"
      rsvp_status: "pending" | "accepted" | "declined"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
      contact_group: ["family", "friends", "colleagues", "neighbors", "other"],
      contact_source: ["personal", "imported", "member"],
      contribution_commitment_status: ["active", "cancelled"],
      contribution_need_priority: ["normal", "important", "high"],
      contribution_need_status: ["open", "closed", "cancelled"],
      contribution_need_type: ["quantity", "unique", "people", "money"],
      contribution_unit_kind: ["quantity", "money", "none"],
      event_status: ["draft", "published", "archived"],
      invitation_status: [
        "draft",
        "sent",
        "opened",
        "accepted",
        "declined",
        "maybe",
        "cancelled",
        "expired",
      ],
      notification_channel: ["inapp", "email", "push"],
      notification_status: ["pending", "sent", "failed"],
      participant_role: ["organizer", "guest"],
      rsvp_status: ["pending", "accepted", "declined"],
    },
  },
} as const
