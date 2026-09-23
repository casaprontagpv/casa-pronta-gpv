export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
      agencies: {
        Row: {
          active: boolean;
          cnpj: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          cnpj?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          cnpj?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      agency_members: {
        Row: {
          agency_id: string;
          created_at: string;
          profile_id: string;
        };
        Insert: {
          agency_id: string;
          created_at?: string;
          profile_id: string;
        };
        Update: {
          agency_id?: string;
          created_at?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'agency_members_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agency_members_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      appointments: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          notes: string | null;
          service_type: string;
          starts_at: string;
          status: Database['public']['Enums']['appointment_status'];
          technician_id: string;
          tenant_confirmed: boolean;
          tenant_confirmed_at: string | null;
          ticket_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          notes?: string | null;
          service_type?: string;
          starts_at: string;
          status?: Database['public']['Enums']['appointment_status'];
          technician_id: string;
          tenant_confirmed?: boolean;
          tenant_confirmed_at?: string | null;
          ticket_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          notes?: string | null;
          service_type?: string;
          starts_at?: string;
          status?: Database['public']['Enums']['appointment_status'];
          technician_id?: string;
          tenant_confirmed?: boolean;
          tenant_confirmed_at?: string | null;
          ticket_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'appointments_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_technician_id_fkey';
            columns: ['technician_id'];
            isOneToOne: false;
            referencedRelation: 'technicians';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'appointments_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      attachments: {
        Row: {
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['attachment_kind'];
          storage_path: string;
          ticket_id: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['attachment_kind'];
          storage_path: string;
          ticket_id: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['attachment_kind'];
          storage_path?: string;
          ticket_id?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'attachments_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'attachments_uploaded_by_fkey';
            columns: ['uploaded_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      evaluations: {
        Row: {
          comments: string;
          created_at: string;
          created_by: string | null;
          id: string;
          punctual: boolean;
          rating: number;
          satisfactory: boolean;
          solved: boolean;
          ticket_id: string;
        };
        Insert: {
          comments?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          punctual?: boolean;
          rating: number;
          satisfactory?: boolean;
          solved?: boolean;
          ticket_id: string;
        };
        Update: {
          comments?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          punctual?: boolean;
          rating?: number;
          satisfactory?: boolean;
          solved?: boolean;
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'evaluations_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'evaluations_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: true;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          read_at: string | null;
          recipient_profile_id: string;
          ticket_id: string | null;
          title: string;
          type: Database['public']['Enums']['notification_type'];
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_profile_id: string;
          ticket_id?: string | null;
          title: string;
          type?: Database['public']['Enums']['notification_type'];
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          recipient_profile_id?: string;
          ticket_id?: string | null;
          title?: string;
          type?: Database['public']['Enums']['notification_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_profile_id_fkey';
            columns: ['recipient_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          created_at: string;
          email: string;
          id: string;
          name: string;
          phone: string | null;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          email: string;
          id: string;
          name: string;
          phone?: string | null;
          role: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
          updated_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address: string;
          agency_id: string;
          city: string;
          code: string;
          created_at: string;
          id: string;
          neighborhood: string | null;
          property_type: Database['public']['Enums']['property_type'];
          state: string;
          unit: string | null;
          updated_at: string;
          zip_code: string | null;
        };
        Insert: {
          address: string;
          agency_id: string;
          city?: string;
          code: string;
          created_at?: string;
          id?: string;
          neighborhood?: string | null;
          property_type?: Database['public']['Enums']['property_type'];
          state?: string;
          unit?: string | null;
          updated_at?: string;
          zip_code?: string | null;
        };
        Update: {
          address?: string;
          agency_id?: string;
          city?: string;
          code?: string;
          created_at?: string;
          id?: string;
          neighborhood?: string | null;
          property_type?: Database['public']['Enums']['property_type'];
          state?: string;
          unit?: string | null;
          updated_at?: string;
          zip_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'properties_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
        ];
      };
      property_tenants: {
        Row: {
          active: boolean;
          created_at: string;
          ended_at: string | null;
          id: string;
          profile_id: string;
          property_id: string;
          started_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          profile_id: string;
          property_id: string;
          started_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          profile_id?: string;
          property_id?: string;
          started_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'property_tenants_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'property_tenants_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      quotes: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          created_by: string | null;
          execution_deadline_days: number;
          id: string;
          labor_cost: number;
          labor_summary: string;
          materials_cost: number;
          materials_summary: string;
          notes: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          service_description: string;
          status: Database['public']['Enums']['quote_status'];
          ticket_id: string;
          total_cost: number | null;
          version: number;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          execution_deadline_days?: number;
          id?: string;
          labor_cost?: number;
          labor_summary?: string;
          materials_cost?: number;
          materials_summary?: string;
          notes?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          service_description?: string;
          status?: Database['public']['Enums']['quote_status'];
          ticket_id: string;
          total_cost?: number | null;
          version: number;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          created_by?: string | null;
          execution_deadline_days?: number;
          id?: string;
          labor_cost?: number;
          labor_summary?: string;
          materials_cost?: number;
          materials_summary?: string;
          notes?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          service_description?: string;
          status?: Database['public']['Enums']['quote_status'];
          ticket_id?: string;
          total_cost?: number | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quotes_approved_by_fkey';
            columns: ['approved_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_rejected_by_fkey';
            columns: ['rejected_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      service_completions: {
        Row: {
          completed_at: string;
          created_by: string | null;
          id: string;
          materials_used: string;
          observations: string;
          services_performed: string;
          tenant_confirmed: boolean;
          tenant_confirmed_at: string | null;
          ticket_id: string;
          warranty_months: number;
        };
        Insert: {
          completed_at?: string;
          created_by?: string | null;
          id?: string;
          materials_used?: string;
          observations?: string;
          services_performed?: string;
          tenant_confirmed?: boolean;
          tenant_confirmed_at?: string | null;
          ticket_id: string;
          warranty_months?: number;
        };
        Update: {
          completed_at?: string;
          created_by?: string | null;
          id?: string;
          materials_used?: string;
          observations?: string;
          services_performed?: string;
          tenant_confirmed?: boolean;
          tenant_confirmed_at?: string | null;
          ticket_id?: string;
          warranty_months?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'service_completions_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_completions_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: true;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      technical_reports: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          needs_quote: boolean;
          needs_return: boolean;
          possible_cause: string;
          recommended_priority: Database['public']['Enums']['priority_level'];
          recommended_solution: string;
          required_materials: string;
          situation_found: string;
          technician_id: string | null;
          technician_name: string;
          tenant_problem: string;
          ticket_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          needs_quote?: boolean;
          needs_return?: boolean;
          possible_cause?: string;
          recommended_priority?: Database['public']['Enums']['priority_level'];
          recommended_solution?: string;
          required_materials?: string;
          situation_found?: string;
          technician_id?: string | null;
          technician_name: string;
          tenant_problem?: string;
          ticket_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          needs_quote?: boolean;
          needs_return?: boolean;
          possible_cause?: string;
          recommended_priority?: Database['public']['Enums']['priority_level'];
          recommended_solution?: string;
          required_materials?: string;
          situation_found?: string;
          technician_id?: string | null;
          technician_name?: string;
          tenant_problem?: string;
          ticket_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'technical_reports_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'technical_reports_technician_id_fkey';
            columns: ['technician_id'];
            isOneToOne: false;
            referencedRelation: 'technicians';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'technical_reports_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: true;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      technicians: {
        Row: {
          active: boolean;
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          profile_id: string | null;
          rating: number | null;
          specialties: string[];
          status: Database['public']['Enums']['technician_status'];
          team: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          profile_id?: string | null;
          rating?: number | null;
          specialties?: string[];
          status?: Database['public']['Enums']['technician_status'];
          team?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          profile_id?: string | null;
          rating?: number | null;
          specialties?: string[];
          status?: Database['public']['Enums']['technician_status'];
          team?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'technicians_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          sender_name: string;
          sender_profile_id: string | null;
          sender_role: Database['public']['Enums']['user_role'];
          ticket_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          sender_name: string;
          sender_profile_id?: string | null;
          sender_role: Database['public']['Enums']['user_role'];
          ticket_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          sender_name?: string;
          sender_profile_id?: string | null;
          sender_role?: Database['public']['Enums']['user_role'];
          ticket_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_messages_sender_profile_id_fkey';
            columns: ['sender_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_messages_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      ticket_status_transitions: {
        Row: {
          allowed_role: Database['public']['Enums']['user_role'];
          from_status: Database['public']['Enums']['ticket_status'];
          to_status: Database['public']['Enums']['ticket_status'];
        };
        Insert: {
          allowed_role: Database['public']['Enums']['user_role'];
          from_status: Database['public']['Enums']['ticket_status'];
          to_status: Database['public']['Enums']['ticket_status'];
        };
        Update: {
          allowed_role?: Database['public']['Enums']['user_role'];
          from_status?: Database['public']['Enums']['ticket_status'];
          to_status?: Database['public']['Enums']['ticket_status'];
        };
        Relationships: [];
      };
      ticket_timeline: {
        Row: {
          author_name: string;
          author_profile_id: string | null;
          author_role: Database['public']['Enums']['user_role'];
          created_at: string;
          description: string;
          id: string;
          status: Database['public']['Enums']['ticket_status'];
          ticket_id: string;
          title: string;
        };
        Insert: {
          author_name: string;
          author_profile_id?: string | null;
          author_role: Database['public']['Enums']['user_role'];
          created_at?: string;
          description?: string;
          id?: string;
          status: Database['public']['Enums']['ticket_status'];
          ticket_id: string;
          title: string;
        };
        Update: {
          author_name?: string;
          author_profile_id?: string | null;
          author_role?: Database['public']['Enums']['user_role'];
          created_at?: string;
          description?: string;
          id?: string;
          status?: Database['public']['Enums']['ticket_status'];
          ticket_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ticket_timeline_author_profile_id_fkey';
            columns: ['author_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ticket_timeline_ticket_id_fkey';
            columns: ['ticket_id'];
            isOneToOne: false;
            referencedRelation: 'tickets';
            referencedColumns: ['id'];
          },
        ];
      };
      tickets: {
        Row: {
          agency_id: string;
          assigned_technician_id: string | null;
          category: Database['public']['Enums']['category'];
          created_at: string;
          created_by: string;
          description: string;
          environment: string;
          id: string;
          last_action_at: string;
          preferred_period: Database['public']['Enums']['preferred_period'];
          property_id: string;
          protocol: string;
          status: Database['public']['Enums']['ticket_status'];
          tenant_profile_id: string | null;
          updated_at: string;
          urgency: Database['public']['Enums']['priority_level'];
        };
        Insert: {
          agency_id: string;
          assigned_technician_id?: string | null;
          category: Database['public']['Enums']['category'];
          created_at?: string;
          created_by: string;
          description: string;
          environment: string;
          id?: string;
          last_action_at?: string;
          preferred_period?: Database['public']['Enums']['preferred_period'];
          property_id: string;
          protocol?: string;
          status?: Database['public']['Enums']['ticket_status'];
          tenant_profile_id?: string | null;
          updated_at?: string;
          urgency?: Database['public']['Enums']['priority_level'];
        };
        Update: {
          agency_id?: string;
          assigned_technician_id?: string | null;
          category?: Database['public']['Enums']['category'];
          created_at?: string;
          created_by?: string;
          description?: string;
          environment?: string;
          id?: string;
          last_action_at?: string;
          preferred_period?: Database['public']['Enums']['preferred_period'];
          property_id?: string;
          protocol?: string;
          status?: Database['public']['Enums']['ticket_status'];
          tenant_profile_id?: string | null;
          updated_at?: string;
          urgency?: Database['public']['Enums']['priority_level'];
        };
        Relationships: [
          {
            foreignKeyName: 'tickets_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_assigned_technician_id_fkey';
            columns: ['assigned_technician_id'];
            isOneToOne: false;
            referencedRelation: 'technicians';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tickets_tenant_profile_id_fkey';
            columns: ['tenant_profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      assign_technician: {
        Args: { p_technician_id: string; p_ticket_id: string };
        Returns: {
          agency_id: string;
          assigned_technician_id: string | null;
          category: Database['public']['Enums']['category'];
          created_at: string;
          created_by: string;
          description: string;
          environment: string;
          id: string;
          last_action_at: string;
          preferred_period: Database['public']['Enums']['preferred_period'];
          property_id: string;
          protocol: string;
          status: Database['public']['Enums']['ticket_status'];
          tenant_profile_id: string | null;
          updated_at: string;
          urgency: Database['public']['Enums']['priority_level'];
        };
        SetofOptions: {
          from: '*';
          to: 'tickets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      auth_agency_ids: { Args: never; Returns: string[] };
      auth_property_ids: { Args: never; Returns: string[] };
      auth_role: {
        Args: never;
        Returns: Database['public']['Enums']['user_role'];
      };
      auth_technician_id: { Args: never; Returns: string };
      can_read_ticket: { Args: { p_ticket_id: string }; Returns: boolean };
      can_write_ticket: { Args: { p_ticket_id: string }; Returns: boolean };
      confirm_tenant_completion: {
        Args: { p_ticket_id: string };
        Returns: {
          completed_at: string;
          created_by: string | null;
          id: string;
          materials_used: string;
          observations: string;
          services_performed: string;
          tenant_confirmed: boolean;
          tenant_confirmed_at: string | null;
          ticket_id: string;
          warranty_months: number;
        };
        SetofOptions: {
          from: '*';
          to: 'service_completions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_ticket: {
        Args: {
          p_category: Database['public']['Enums']['category'];
          p_description: string;
          p_environment: string;
          p_preferred_period?: Database['public']['Enums']['preferred_period'];
          p_property_id: string;
          p_urgency?: Database['public']['Enums']['priority_level'];
        };
        Returns: {
          agency_id: string;
          assigned_technician_id: string | null;
          category: Database['public']['Enums']['category'];
          created_at: string;
          created_by: string;
          description: string;
          environment: string;
          id: string;
          last_action_at: string;
          preferred_period: Database['public']['Enums']['preferred_period'];
          property_id: string;
          protocol: string;
          status: Database['public']['Enums']['ticket_status'];
          tenant_profile_id: string | null;
          updated_at: string;
          urgency: Database['public']['Enums']['priority_level'];
        };
        SetofOptions: {
          from: '*';
          to: 'tickets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      current_profile: {
        Args: never;
        Returns: {
          active: boolean;
          created_at: string;
          email: string;
          id: string;
          name: string;
          phone: string | null;
          role: Database['public']['Enums']['user_role'];
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      finalize_service: {
        Args: {
          p_materials_used: string;
          p_observations?: string;
          p_services_performed: string;
          p_ticket_id: string;
          p_warranty_months?: number;
        };
        Returns: {
          completed_at: string;
          created_by: string | null;
          id: string;
          materials_used: string;
          observations: string;
          services_performed: string;
          tenant_confirmed: boolean;
          tenant_confirmed_at: string | null;
          ticket_id: string;
          warranty_months: number;
        };
        SetofOptions: {
          from: '*';
          to: 'service_completions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_empresa: { Args: never; Returns: boolean };
      log_timeline: {
        Args: {
          p_description?: string;
          p_status: Database['public']['Enums']['ticket_status'];
          p_ticket_id: string;
          p_title: string;
        };
        Returns: string;
      };
      mark_all_notifications_read: { Args: never; Returns: number };
      notify_ticket: {
        Args: {
          p_body?: string;
          p_roles: Database['public']['Enums']['user_role'][];
          p_ticket_id: string;
          p_title: string;
          p_type?: Database['public']['Enums']['notification_type'];
        };
        Returns: number;
      };
      post_message: {
        Args: { p_body: string; p_ticket_id: string };
        Returns: {
          body: string;
          created_at: string;
          id: string;
          sender_name: string;
          sender_profile_id: string | null;
          sender_role: Database['public']['Enums']['user_role'];
          ticket_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'ticket_messages';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      review_quote: {
        Args: { p_approve: boolean; p_quote_id: string; p_reason?: string };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          created_by: string | null;
          execution_deadline_days: number;
          id: string;
          labor_cost: number;
          labor_summary: string;
          materials_cost: number;
          materials_summary: string;
          notes: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          service_description: string;
          status: Database['public']['Enums']['quote_status'];
          ticket_id: string;
          total_cost: number | null;
          version: number;
        };
        SetofOptions: {
          from: '*';
          to: 'quotes';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      save_technical_report: {
        Args: {
          p_needs_quote: boolean;
          p_needs_return: boolean;
          p_possible_cause: string;
          p_recommended_priority: Database['public']['Enums']['priority_level'];
          p_recommended_solution: string;
          p_required_materials: string;
          p_situation_found: string;
          p_ticket_id: string;
        };
        Returns: {
          created_at: string;
          created_by: string | null;
          id: string;
          needs_quote: boolean;
          needs_return: boolean;
          possible_cause: string;
          recommended_priority: Database['public']['Enums']['priority_level'];
          recommended_solution: string;
          required_materials: string;
          situation_found: string;
          technician_id: string | null;
          technician_name: string;
          tenant_problem: string;
          ticket_id: string;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'technical_reports';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      schedule_appointment: {
        Args: {
          p_ends_at: string;
          p_notes?: string;
          p_service_type?: string;
          p_starts_at: string;
          p_technician_id: string;
          p_ticket_id?: string;
        };
        Returns: {
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          notes: string | null;
          service_type: string;
          starts_at: string;
          status: Database['public']['Enums']['appointment_status'];
          technician_id: string;
          tenant_confirmed: boolean;
          tenant_confirmed_at: string | null;
          ticket_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'appointments';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      storage_ticket_id: { Args: { p_name: string }; Returns: string };
      submit_evaluation: {
        Args: {
          p_comments?: string;
          p_punctual?: boolean;
          p_rating: number;
          p_satisfactory?: boolean;
          p_solved?: boolean;
          p_ticket_id: string;
        };
        Returns: {
          comments: string;
          created_at: string;
          created_by: string | null;
          id: string;
          punctual: boolean;
          rating: number;
          satisfactory: boolean;
          solved: boolean;
          ticket_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'evaluations';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      submit_quote: {
        Args: {
          p_execution_deadline_days: number;
          p_labor_cost: number;
          p_labor_summary: string;
          p_materials_cost: number;
          p_materials_summary: string;
          p_notes?: string;
          p_service_description: string;
          p_ticket_id: string;
        };
        Returns: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          created_by: string | null;
          execution_deadline_days: number;
          id: string;
          labor_cost: number;
          labor_summary: string;
          materials_cost: number;
          materials_summary: string;
          notes: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          service_description: string;
          status: Database['public']['Enums']['quote_status'];
          ticket_id: string;
          total_cost: number | null;
          version: number;
        };
        SetofOptions: {
          from: '*';
          to: 'quotes';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      ticket_status_label: {
        Args: { p_status: Database['public']['Enums']['ticket_status'] };
        Returns: string;
      };
      update_appointment_status: {
        Args: {
          p_appointment_id: string;
          p_status: Database['public']['Enums']['appointment_status'];
        };
        Returns: {
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          notes: string | null;
          service_type: string;
          starts_at: string;
          status: Database['public']['Enums']['appointment_status'];
          technician_id: string;
          tenant_confirmed: boolean;
          tenant_confirmed_at: string | null;
          ticket_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: '*';
          to: 'appointments';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_ticket_status: {
        Args: {
          p_description?: string;
          p_status: Database['public']['Enums']['ticket_status'];
          p_ticket_id: string;
        };
        Returns: {
          agency_id: string;
          assigned_technician_id: string | null;
          category: Database['public']['Enums']['category'];
          created_at: string;
          created_by: string;
          description: string;
          environment: string;
          id: string;
          last_action_at: string;
          preferred_period: Database['public']['Enums']['preferred_period'];
          property_id: string;
          protocol: string;
          status: Database['public']['Enums']['ticket_status'];
          tenant_profile_id: string | null;
          updated_at: string;
          urgency: Database['public']['Enums']['priority_level'];
        };
        SetofOptions: {
          from: '*';
          to: 'tickets';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      appointment_status:
        | 'agendado'
        | 'confirmado'
        | 'aguardando_confirmacao'
        | 'em_deslocamento'
        | 'em_atendimento'
        | 'concluido'
        | 'reagendar'
        | 'cancelado'
        | 'nao_realizado';
      attachment_kind: 'chamado' | 'parecer' | 'orcamento' | 'antes' | 'depois';
      category:
        | 'eletrica'
        | 'hidraulica'
        | 'pintura'
        | 'infiltracao'
        | 'porta_fechadura'
        | 'janela'
        | 'revestimento_piso'
        | 'telhado'
        | 'outro';
      notification_type: 'info' | 'success' | 'warning' | 'urgent';
      preferred_period: 'manha' | 'tarde' | 'integral' | 'sabado';
      priority_level: 'emergencial' | 'alta' | 'normal' | 'baixa';
      property_type: 'apartamento' | 'casa' | 'sobrado' | 'comercial' | 'outro';
      quote_status: 'enviado' | 'aprovado' | 'reprovado';
      technician_status: 'disponivel' | 'em_atendimento' | 'folga';
      ticket_status:
        | 'chamado_aberto'
        | 'em_analise'
        | 'aguardando_vistoria'
        | 'orcamento_enviado'
        | 'aguardando_aprovacao'
        | 'orcamento_aprovado'
        | 'orcamento_reprovado'
        | 'servico_agendado'
        | 'em_execucao'
        | 'pendente'
        | 'concluido'
        | 'cancelado';
      user_role: 'inquilino' | 'imobiliaria' | 'empresa' | 'prestador';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appointment_status: [
        'agendado',
        'confirmado',
        'aguardando_confirmacao',
        'em_deslocamento',
        'em_atendimento',
        'concluido',
        'reagendar',
        'cancelado',
        'nao_realizado',
      ],
      attachment_kind: ['chamado', 'parecer', 'orcamento', 'antes', 'depois'],
      category: [
        'eletrica',
        'hidraulica',
        'pintura',
        'infiltracao',
        'porta_fechadura',
        'janela',
        'revestimento_piso',
        'telhado',
        'outro',
      ],
      notification_type: ['info', 'success', 'warning', 'urgent'],
      preferred_period: ['manha', 'tarde', 'integral', 'sabado'],
      priority_level: ['emergencial', 'alta', 'normal', 'baixa'],
      property_type: ['apartamento', 'casa', 'sobrado', 'comercial', 'outro'],
      quote_status: ['enviado', 'aprovado', 'reprovado'],
      technician_status: ['disponivel', 'em_atendimento', 'folga'],
      ticket_status: [
        'chamado_aberto',
        'em_analise',
        'aguardando_vistoria',
        'orcamento_enviado',
        'aguardando_aprovacao',
        'orcamento_aprovado',
        'orcamento_reprovado',
        'servico_agendado',
        'em_execucao',
        'pendente',
        'concluido',
        'cancelado',
      ],
      user_role: ['inquilino', 'imobiliaria', 'empresa', 'prestador'],
    },
  },
} as const;
