export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      calendar_members: {
        Row: {
          calendar_id: string;
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["calendar_role"];
          user_id: string;
        };
        Insert: {
          calendar_id: string;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["calendar_role"];
          user_id: string;
        };
        Update: {
          calendar_id?: string;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["calendar_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_members_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "calendars";
            referencedColumns: ["id"];
          },
        ];
      };
      calendars: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          is_personal: boolean;
          name: string;
          owner_id: string;
          space_type: string;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          is_personal?: boolean;
          name: string;
          owner_id: string;
          space_type?: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          is_personal?: boolean;
          name?: string;
          owner_id?: string;
          space_type?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          all_day: boolean;
          calendar_id: string;
          color: string | null;
          created_at: string;
          created_by: string;
          description: string | null;
          end_at: string;
          id: string;
          location: string | null;
          reminder_minutes: number | null;
          recurrence: string;
          recurrence_until: string | null;
          recurrence_exdates: string[];
          start_at: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          all_day?: boolean;
          calendar_id: string;
          color?: string | null;
          created_at?: string;
          created_by: string;
          description?: string | null;
          end_at: string;
          id?: string;
          location?: string | null;
          reminder_minutes?: number | null;
          recurrence?: string;
          recurrence_until?: string | null;
          recurrence_exdates?: string[];
          start_at: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          all_day?: boolean;
          calendar_id?: string;
          color?: string | null;
          created_at?: string;
          created_by?: string;
          description?: string | null;
          end_at?: string;
          id?: string;
          location?: string | null;
          reminder_minutes?: number | null;
          recurrence?: string;
          recurrence_until?: string | null;
          recurrence_exdates?: string[];
          start_at?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "calendars";
            referencedColumns: ["id"];
          },
        ];
      };
      event_attendance: {
        Row: {
          event_id: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          event_id: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          event_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_attendance_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          accepted: boolean;
          calendar_id: string;
          created_at: string;
          id: string;
          invited_by: string;
          invited_email: string;
          role: Database["public"]["Enums"]["calendar_role"];
        };
        Insert: {
          accepted?: boolean;
          calendar_id: string;
          created_at?: string;
          id?: string;
          invited_by: string;
          invited_email: string;
          role?: Database["public"]["Enums"]["calendar_role"];
        };
        Update: {
          accepted?: boolean;
          calendar_id?: string;
          created_at?: string;
          id?: string;
          invited_by?: string;
          invited_email?: string;
          role?: Database["public"]["Enums"]["calendar_role"];
        };
        Relationships: [
          {
            foreignKeyName: "invitations_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "calendars";
            referencedColumns: ["id"];
          },
        ];
      };
      moments: {
        Row: {
          body: string | null;
          calendar_id: string;
          created_at: string;
          created_by: string;
          happened_on: string;
          id: string;
          kind: Database["public"]["Enums"]["moment_kind"];
          lat: number | null;
          lng: number | null;
          location: string | null;
          mood: string | null;
          photo_url: string | null;
          prompt_key: string | null;
          prompt_text: string | null;
          reveal_at: string | null;
          updated_at: string;
          voice_url: string | null;
        };
        Insert: {
          body?: string | null;
          calendar_id: string;
          created_at?: string;
          created_by: string;
          happened_on?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["moment_kind"];
          lat?: number | null;
          lng?: number | null;
          location?: string | null;
          mood?: string | null;
          photo_url?: string | null;
          prompt_key?: string | null;
          prompt_text?: string | null;
          reveal_at?: string | null;
          updated_at?: string;
          voice_url?: string | null;
        };
        Update: {
          body?: string | null;
          calendar_id?: string;
          created_at?: string;
          created_by?: string;
          happened_on?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["moment_kind"];
          lat?: number | null;
          lng?: number | null;
          location?: string | null;
          mood?: string | null;
          photo_url?: string | null;
          prompt_key?: string | null;
          prompt_text?: string | null;
          reveal_at?: string | null;
          updated_at?: string;
          voice_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "moments_calendar_id_fkey";
            columns: ["calendar_id"];
            isOneToOne: false;
            referencedRelation: "calendars";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          color: string;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          color?: string;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          color?: string;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calendar_role_of: {
        Args: { _calendar_id: string; _user_id: string };
        Returns: Database["public"]["Enums"]["calendar_role"];
      };
      create_shared_space: {
        Args: { p_color: string; p_name: string };
        Returns: string;
      };
      is_calendar_member: {
        Args: { _calendar_id: string; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      calendar_role: "owner" | "editor" | "viewer";
      moment_kind: "reflection" | "note" | "capsule";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      calendar_role: ["owner", "editor", "viewer"],
      moment_kind: ["reflection", "note", "capsule"],
    },
  },
} as const;
