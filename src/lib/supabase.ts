import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  job_title?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface ThreatDetection {
  id: string;
  user_id: string;
  threat_type: string;
  severity_level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  source_type: string;
  source_content: string;
  detected_patterns: string[];
  confidence_score: number;
  nlp_explanation: string;
  status: 'new' | 'acknowledged' | 'resolved' | 'false_positive';
  detected_at: string;
  resolved_at?: string;
}

export interface DetectionStats {
  id: string;
  user_id: string;
  date: string;
  total_scanned: number;
  threats_detected: number;
  false_positives: number;
  threats_by_severity: {
    safe: number;
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}
