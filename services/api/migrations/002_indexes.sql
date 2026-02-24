CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions (user_id);
CREATE INDEX IF NOT EXISTS idx_positions_linked_account_id ON positions (linked_account_id);
CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_user_date ON valuation_snapshots (user_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_position_id ON valuation_snapshots (position_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_user_id_status ON conflicts (user_id, status);
CREATE INDEX IF NOT EXISTS idx_conflicts_position_id ON conflicts (position_id);
CREATE INDEX IF NOT EXISTS idx_preference_rules_user_id ON preference_rules (user_id);
