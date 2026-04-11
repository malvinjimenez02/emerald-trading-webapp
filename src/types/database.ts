export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          first_name: string;
          last_name: string;
          journal_name: string;
          account_origin_capital: number | null;
          journal_start_capital: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          first_name: string;
          last_name: string;
          journal_name: string;
          account_origin_capital?: number | null;
          journal_start_capital?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          first_name?: string;
          last_name?: string;
          journal_name?: string;
          account_origin_capital?: number | null;
          journal_start_capital?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      journals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          initial_capital: number;
          currency: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          initial_capital: number;
          currency: string;
          is_active?: boolean;
          created_at: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          initial_capital?: number;
          currency?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      trades: {
        Row: {
          id: string;
          journal_id: string;
          user_id: string;
          asset_name: string;
          direction: string;
          entry_price: number;
          stop_loss: number;
          take_profit: number | null;
          exit_price: number | null;
          result: string;
          r_value: number | null;
          pnl_amount: number | null;
          status: string;
          notes: string | null;
          screenshot_uri: string | null;
          entry_date: string | null;
          close_date: string | null;
          created_at: string;
          closed_at: string | null;
        };
        Insert: {
          id: string;
          journal_id: string;
          user_id: string;
          asset_name: string;
          direction: string;
          entry_price: number;
          stop_loss: number;
          take_profit?: number | null;
          exit_price?: number | null;
          result: string;
          r_value?: number | null;
          pnl_amount?: number | null;
          status: string;
          notes?: string | null;
          screenshot_uri?: string | null;
          entry_date?: string | null;
          close_date?: string | null;
          created_at?: string;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          journal_id?: string;
          user_id?: string;
          asset_name?: string;
          direction?: string;
          entry_price?: number;
          stop_loss?: number;
          take_profit?: number | null;
          exit_price?: number | null;
          result?: string;
          r_value?: number | null;
          pnl_amount?: number | null;
          status?: string;
          notes?: string | null;
          screenshot_uri?: string | null;
          entry_date?: string | null;
          close_date?: string | null;
          created_at?: string;
          closed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
