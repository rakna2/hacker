/*
  # Social Engineering Detection Platform Database Schema

  ## Overview
  This migration creates the complete database structure for an AI-powered social engineering detection platform
  that monitors communications, detects threats, and provides real-time alerts to users.

  ## New Tables Created

  ### 1. `user_profiles` - Extended user profile information
    - `id` (uuid, primary key) - Links to auth.users
    - `full_name` (text) - User's full name
    - `email` (text) - User's email address
    - `avatar_url` (text, nullable) - Profile picture URL
    - `job_title` (text, nullable) - User's job title
    - `department` (text, nullable) - User's department
    - `created_at` (timestamptz) - Account creation timestamp
    - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. `threat_detections` - Records of detected threats
    - `id` (uuid, primary key) - Unique threat detection ID
    - `user_id` (uuid, foreign key) - User who received the threat
    - `threat_type` (text) - Type of social engineering attack (phishing, pretexting, baiting, etc.)
    - `severity_level` (text) - Threat severity: 'safe', 'low', 'medium', 'high', 'critical'
    - `source_type` (text) - Communication source (email, message, link, etc.)
    - `source_content` (text) - Original content analyzed
    - `detected_patterns` (jsonb) - Detected manipulation patterns
    - `confidence_score` (numeric) - Detection confidence (0-100)
    - `nlp_explanation` (text) - AI-generated explanation of the threat
    - `status` (text) - Alert status: 'new', 'acknowledged', 'resolved', 'false_positive'
    - `detected_at` (timestamptz) - When threat was detected
    - `resolved_at` (timestamptz, nullable) - When threat was resolved

  ### 3. `alert_settings` - User-specific alert preferences
    - `id` (uuid, primary key) - Settings ID
    - `user_id` (uuid, foreign key) - User these settings belong to
    - `email_alerts` (boolean) - Enable email notifications
    - `push_alerts` (boolean) - Enable push notifications
    - `minimum_severity` (text) - Minimum severity to alert on
    - `quiet_hours_start` (time, nullable) - Start of quiet period
    - `quiet_hours_end` (time, nullable) - End of quiet period
    - `created_at` (timestamptz) - Settings creation time
    - `updated_at` (timestamptz) - Last update time

  ### 4. `threat_patterns` - Known attack patterns for ML training
    - `id` (uuid, primary key) - Pattern ID
    - `pattern_name` (text) - Name of the attack pattern
    - `pattern_type` (text) - Category of social engineering
    - `indicators` (jsonb) - Array of indicators (keywords, phrases, tactics)
    - `severity_weight` (numeric) - How severe this pattern is (0-1)
    - `is_active` (boolean) - Whether this pattern is currently used in detection
    - `created_at` (timestamptz) - Pattern creation time
    - `updated_at` (timestamptz) - Last pattern update

  ### 5. `detection_stats` - Analytics and statistics
    - `id` (uuid, primary key) - Stats entry ID
    - `user_id` (uuid, foreign key) - User these stats belong to
    - `date` (date) - Date of statistics
    - `total_scanned` (integer) - Total communications scanned
    - `threats_detected` (integer) - Number of threats found
    - `false_positives` (integer) - Number of false positives reported
    - `threats_by_severity` (jsonb) - Breakdown by severity level
    - `created_at` (timestamptz) - Stats creation time

  ## Security Configuration

  ### Row Level Security (RLS)
  All tables have RLS enabled with policies ensuring:
  - Users can only access their own data
  - Threat patterns are readable by all authenticated users
  - User profiles are only editable by the owner

  ### Policies Created
  For each table:
  - SELECT: Users can view their own records
  - INSERT: Users can create records for themselves
  - UPDATE: Users can update their own records
  - DELETE: Users can delete their own records (where applicable)

  ## Indexes
  Performance indexes on:
  - Foreign keys for joins
  - Timestamp columns for time-based queries
  - Severity levels for filtering
  - Status fields for dashboard queries

  ## Notes
  - All timestamps use timestamptz for timezone awareness
  - JSONB used for flexible storage of patterns and metadata
  - Confidence scores are numeric to allow for precise ML model outputs
  - Default values ensure data integrity
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  job_title text,
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create threat_detections table
CREATE TABLE IF NOT EXISTS threat_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threat_type text NOT NULL,
  severity_level text NOT NULL CHECK (severity_level IN ('safe', 'low', 'medium', 'high', 'critical')),
  source_type text NOT NULL,
  source_content text NOT NULL,
  detected_patterns jsonb DEFAULT '[]'::jsonb,
  confidence_score numeric(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  nlp_explanation text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved', 'false_positive')),
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Create alert_settings table
CREATE TABLE IF NOT EXISTS alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_alerts boolean DEFAULT true,
  push_alerts boolean DEFAULT true,
  minimum_severity text DEFAULT 'low' CHECK (minimum_severity IN ('low', 'medium', 'high', 'critical')),
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create threat_patterns table
CREATE TABLE IF NOT EXISTS threat_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_name text NOT NULL,
  pattern_type text NOT NULL,
  indicators jsonb NOT NULL DEFAULT '[]'::jsonb,
  severity_weight numeric(3,2) NOT NULL CHECK (severity_weight >= 0 AND severity_weight <= 1),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create detection_stats table
CREATE TABLE IF NOT EXISTS detection_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_scanned integer DEFAULT 0,
  threats_detected integer DEFAULT 0,
  false_positives integer DEFAULT 0,
  threats_by_severity jsonb DEFAULT '{"safe": 0, "low": 0, "medium": 0, "high": 0, "critical": 0}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE detection_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for threat_detections
CREATE POLICY "Users can view own threat detections"
  ON threat_detections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own threat detections"
  ON threat_detections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own threat detections"
  ON threat_detections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own threat detections"
  ON threat_detections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for alert_settings
CREATE POLICY "Users can view own alert settings"
  ON alert_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert settings"
  ON alert_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert settings"
  ON alert_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for threat_patterns (readable by all authenticated users)
CREATE POLICY "Authenticated users can view threat patterns"
  ON threat_patterns FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for detection_stats
CREATE POLICY "Users can view own detection stats"
  ON detection_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own detection stats"
  ON detection_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own detection stats"
  ON detection_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_threat_detections_user_id ON threat_detections(user_id);
CREATE INDEX IF NOT EXISTS idx_threat_detections_severity ON threat_detections(severity_level);
CREATE INDEX IF NOT EXISTS idx_threat_detections_status ON threat_detections(status);
CREATE INDEX IF NOT EXISTS idx_threat_detections_detected_at ON threat_detections(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_detection_stats_user_date ON detection_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_alert_settings_user_id ON alert_settings(user_id);

-- Insert some default threat patterns for detection
INSERT INTO threat_patterns (pattern_name, pattern_type, indicators, severity_weight, is_active)
VALUES
  (
    'Urgent Action Required',
    'urgency_manipulation',
    '["urgent", "immediately", "act now", "expires today", "final notice", "account suspended", "verify now"]'::jsonb,
    0.75,
    true
  ),
  (
    'Authority Impersonation',
    'pretexting',
    '["from: ceo", "from: it department", "from: security team", "official notice", "compliance required", "mandatory update"]'::jsonb,
    0.85,
    true
  ),
  (
    'Suspicious Links',
    'phishing',
    '["bit.ly", "tinyurl", "click here", "verify account", "confirm identity", "unusual login", "security alert"]'::jsonb,
    0.90,
    true
  ),
  (
    'Financial Request',
    'baiting',
    '["wire transfer", "payment urgent", "invoice attached", "refund processing", "prize winner", "unclaimed money", "tax refund"]'::jsonb,
    0.95,
    true
  ),
  (
    'Credential Harvesting',
    'phishing',
    '["reset password", "confirm password", "update payment", "verify credit card", "login credentials", "username and password"]'::jsonb,
    0.95,
    true
  ),
  (
    'Emotional Manipulation',
    'manipulation',
    '["help needed", "emergency", "family member", "sick relative", "in trouble", "need help", "please help"]'::jsonb,
    0.70,
    true
  );
