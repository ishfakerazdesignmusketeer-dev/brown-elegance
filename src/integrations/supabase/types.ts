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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          converted: boolean | null
          converted_order_id: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          items: Json
          recovery_sent: boolean | null
          recovery_sent_at: string | null
          session_id: string
          subtotal: number
          updated_at: string | null
        }
        Insert: {
          converted?: boolean | null
          converted_order_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          recovery_sent?: boolean | null
          recovery_sent_at?: string | null
          session_id: string
          subtotal?: number
          updated_at?: string | null
        }
        Update: {
          converted?: boolean | null
          converted_order_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          recovery_sent?: boolean | null
          recovery_sent_at?: string | null
          session_id?: string
          subtotal?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_converted_order_id_fkey"
            columns: ["converted_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_settings: {
        Row: {
          id: string
          key: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      courier_bookings: {
        Row: {
          api_response: Json | null
          booked_at: string | null
          booking_status: string | null
          cod_amount: number | null
          consignee_address: string | null
          consignee_name: string | null
          consignee_phone: string | null
          courier_service: string
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          tracking_number: string | null
          weight: number | null
        }
        Insert: {
          api_response?: Json | null
          booked_at?: string | null
          booking_status?: string | null
          cod_amount?: number | null
          consignee_address?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          courier_service?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          tracking_number?: string | null
          weight?: number | null
        }
        Update: {
          api_response?: Json | null
          booked_at?: string | null
          booking_status?: string | null
          cod_amount?: number | null
          consignee_address?: string | null
          consignee_name?: string | null
          consignee_phone?: string | null
          courier_service?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          tracking_number?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_bookings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          last_order_at: string | null
          name: string
          phone: string
          total_orders: number | null
          total_spent: number | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          last_order_at?: string | null
          name: string
          phone: string
          total_orders?: number | null
          total_spent?: number | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          phone?: string
          total_orders?: number | null
          total_spent?: number | null
        }
        Relationships: []
      }
      footer_settings: {
        Row: {
          id: string
          key: string
          sort_order: number | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          sort_order?: number | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          sort_order?: number | null
          value?: string | null
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string | null
          cta_text: string | null
          cta_url: string | null
          id: string
          image_url: string
          is_active: boolean | null
          sort_order: number | null
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size: string
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          size: string
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          note: string
          order_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note: string
          order_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          courier_booking_id: string | null
          created_at: string | null
          customer_address: string
          customer_city: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          delivery_charge: number | null
          delivery_note: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_number: string | null
          payment_method: string | null
          payment_status: string | null
          source: string | null
          status: string | null
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          coupon_code?: string | null
          courier_booking_id?: string | null
          created_at?: string | null
          customer_address: string
          customer_city: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          delivery_charge?: number | null
          delivery_note?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string | null
          source?: string | null
          status?: string | null
          subtotal: number
          total: number
          updated_at?: string | null
          user_id?: string | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          coupon_code?: string | null
          courier_booking_id?: string | null
          created_at?: string | null
          customer_address?: string
          customer_city?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_charge?: number | null
          delivery_note?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_method?: string | null
          payment_status?: string | null
          source?: string | null
          status?: string | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_courier_booking_id_fkey"
            columns: ["courier_booking_id"]
            isOneToOne: false
            referencedRelation: "courier_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          payment_method: string
          screenshot_url: string | null
          status: string | null
          transaction_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method: string
          screenshot_url?: string | null
          status?: string | null
          transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string
          screenshot_url?: string | null
          status?: string | null
          transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          id: string
          is_available: boolean | null
          product_id: string
          size: string
          stock: number
        }
        Insert: {
          id?: string
          is_available?: boolean | null
          product_id: string
          size: string
          stock?: number
        }
        Update: {
          id?: string
          is_available?: boolean | null
          product_id?: string
          size?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          is_preorder: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          offer_price: number | null
          price: number
          sku: string | null
          slug: string
          weight: number | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_preorder?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          offer_price?: number | null
          price: number
          sku?: string | null
          slug: string
          weight?: number | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_preorder?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          offer_price?: number | null
          price?: number
          sku?: string | null
          slug?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          default_address: string | null
          default_city: string | null
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          default_address?: string | null
          default_city?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          default_address?: string | null
          default_city?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      reels: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          thumbnail_url: string | null
          video_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          video_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          thumbnail_url?: string | null
          video_url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
