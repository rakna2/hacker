import { supabase, ThreatDetection } from '../lib/supabase';

interface ThreatPattern {
  pattern_name: string;
  pattern_type: string;
  indicators: string[];
  severity_weight: number;
}

export async function analyzeThreatWithNLP(content: string, sourceType: string): Promise<{
  threatType: string;
  severityLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  detectedPatterns: string[];
  confidenceScore: number;
  nlpExplanation: string;
}> {
  const { data: patterns } = await supabase
    .from('threat_patterns')
    .select('*')
    .eq('is_active', true);

  if (!patterns) {
    return {
      threatType: 'none',
      severityLevel: 'safe',
      detectedPatterns: [],
      confidenceScore: 0,
      nlpExplanation: 'No threats detected. This communication appears safe.',
    };
  }

  const contentLower = content.toLowerCase();
  const detectedPatterns: Array<{ pattern: ThreatPattern; matches: string[] }> = [];

  patterns.forEach((pattern) => {
    const matches: string[] = [];
    const indicators = pattern.indicators as string[];

    indicators.forEach((indicator) => {
      if (contentLower.includes(indicator.toLowerCase())) {
        matches.push(indicator);
      }
    });

    if (matches.length > 0) {
      detectedPatterns.push({ pattern, matches });
    }
  });

  if (detectedPatterns.length === 0) {
    return {
      threatType: 'none',
      severityLevel: 'safe',
      detectedPatterns: [],
      confidenceScore: 95,
      nlpExplanation: 'Analysis complete: No social engineering indicators detected. This communication appears legitimate and safe.',
    };
  }

  const totalWeight = detectedPatterns.reduce((sum, p) => sum + p.pattern.severity_weight, 0);
  const avgWeight = totalWeight / detectedPatterns.length;
  const confidenceScore = Math.min(95, 50 + (detectedPatterns.length * 15) + (avgWeight * 20));

  let severityLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  if (avgWeight >= 0.9) severityLevel = 'critical';
  else if (avgWeight >= 0.75) severityLevel = 'high';
  else if (avgWeight >= 0.5) severityLevel = 'medium';
  else severityLevel = 'low';

  const patternNames = detectedPatterns.map(p => p.pattern.pattern_name);
  const threatType = detectedPatterns[0].pattern.pattern_type;

  const explanation = generateNLPExplanation(detectedPatterns, severityLevel, sourceType);

  return {
    threatType,
    severityLevel,
    detectedPatterns: patternNames,
    confidenceScore,
    nlpExplanation: explanation,
  };
}

function generateNLPExplanation(
  detectedPatterns: Array<{ pattern: ThreatPattern; matches: string[] }>,
  severityLevel: string,
  sourceType: string
): string {
  const patternDescriptions = detectedPatterns.map(p => {
    const matchList = p.matches.slice(0, 3).map(m => `"${m}"`).join(', ');
    return `• ${p.pattern.pattern_name}: Detected ${p.matches.length} indicator(s) including ${matchList}`;
  }).join('\n');

  let severityDescription = '';
  let recommendation = '';

  switch (severityLevel) {
    case 'critical':
      severityDescription = 'CRITICAL THREAT - This communication exhibits multiple high-risk social engineering tactics commonly used in sophisticated attacks.';
      recommendation = 'DO NOT interact with this message. Do not click any links, download attachments, or provide any information. Report this immediately to your security team and delete it.';
      break;
    case 'high':
      severityDescription = 'HIGH RISK - This communication shows strong indicators of a social engineering attack designed to manipulate you into taking harmful actions.';
      recommendation = 'Exercise extreme caution. Verify the sender through a separate, trusted communication channel before taking any action. Do not click links or provide sensitive information.';
      break;
    case 'medium':
      severityDescription = 'MEDIUM RISK - This communication contains suspicious elements that may indicate a social engineering attempt.';
      recommendation = 'Be cautious. Independently verify the legitimacy of this communication before responding or taking action. Look for additional warning signs.';
      break;
    case 'low':
      severityDescription = 'LOW RISK - Minor indicators detected that warrant attention, though the threat level is relatively low.';
      recommendation = 'Remain alert. While not immediately dangerous, verify the authenticity if the message requests any action or information from you.';
      break;
    default:
      severityDescription = 'Safe communication detected.';
      recommendation = 'No immediate action required.';
  }

  return `🎯 THREAT ANALYSIS SUMMARY

${severityDescription}

📊 SOURCE TYPE: ${sourceType.toUpperCase()}

🔍 DETECTED ATTACK PATTERNS:
${patternDescriptions}

💡 WHY THIS IS A THREAT:
Social engineering attacks exploit human psychology rather than technical vulnerabilities. Attackers use manipulation techniques like urgency, authority, fear, or reward to bypass your natural skepticism and trick you into:
- Revealing sensitive information (passwords, financial data)
- Clicking malicious links that install malware
- Transferring money or making unauthorized purchases
- Granting access to secure systems

The patterns detected in this communication are consistent with known social engineering tactics used by cybercriminals to compromise individuals and organizations.

✅ RECOMMENDED ACTION:
${recommendation}

🛡️ REMEMBER: Legitimate organizations will never:
- Demand immediate action with threats
- Ask for passwords or sensitive data via email
- Use urgent language to prevent you from thinking clearly
- Send unsolicited links requiring immediate clicks`;
}

export async function scanCommunication(
  userId: string,
  content: string,
  sourceType: string
): Promise<ThreatDetection | null> {
  const analysis = await analyzeThreatWithNLP(content, sourceType);

  const { data, error } = await supabase
    .from('threat_detections')
    .insert({
      user_id: userId,
      threat_type: analysis.threatType,
      severity_level: analysis.severityLevel,
      source_type: sourceType,
      source_content: content,
      detected_patterns: analysis.detectedPatterns,
      confidence_score: analysis.confidenceScore,
      nlp_explanation: analysis.nlpExplanation,
      status: 'new',
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving threat detection:', error);
    return null;
  }

  await updateUserStats(userId, analysis.severityLevel);

  return data;
}

async function updateUserStats(userId: string, severityLevel: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('detection_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (existing) {
    const threatsBySeverity = existing.threats_by_severity as Record<string, number>;
    threatsBySeverity[severityLevel] = (threatsBySeverity[severityLevel] || 0) + 1;

    await supabase
      .from('detection_stats')
      .update({
        total_scanned: existing.total_scanned + 1,
        threats_detected: existing.threats_detected + (severityLevel !== 'safe' ? 1 : 0),
        threats_by_severity: threatsBySeverity,
      })
      .eq('id', existing.id);
  } else {
    const threatsBySeverity = { safe: 0, low: 0, medium: 0, high: 0, critical: 0 };
    threatsBySeverity[severityLevel] = 1;

    await supabase.from('detection_stats').insert({
      user_id: userId,
      date: today,
      total_scanned: 1,
      threats_detected: severityLevel !== 'safe' ? 1 : 0,
      false_positives: 0,
      threats_by_severity: threatsBySeverity,
    });
  }
}

export async function getUserThreats(userId: string): Promise<ThreatDetection[]> {
  const { data, error } = await supabase
    .from('threat_detections')
    .select('*')
    .eq('user_id', userId)
    .order('detected_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching threats:', error);
    return [];
  }

  return data || [];
}

export async function markThreatResolved(threatId: string) {
  await supabase
    .from('threat_detections')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', threatId);
}

export async function markThreatAcknowledged(threatId: string) {
  await supabase
    .from('threat_detections')
    .update({ status: 'acknowledged' })
    .eq('id', threatId);
}
