import { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Eye, EyeOff, XCircle, Check, X } from 'lucide-react';
import { ThreatDetection } from '../lib/supabase';
import { markThreatResolved, markThreatAcknowledged } from '../services/threatDetection';

interface ThreatCardProps {
  threat: ThreatDetection;
  onUpdate: () => void;
}

export default function ThreatCard({ threat, onUpdate }: ThreatCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);

  const severityConfig = {
    safe: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: CheckCircle,
      label: 'Safe',
      badge: 'bg-green-100 text-green-800',
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: AlertTriangle,
      label: 'Low Risk',
      badge: 'bg-blue-100 text-blue-800',
    },
    medium: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      icon: AlertTriangle,
      label: 'Medium Risk',
      badge: 'bg-orange-100 text-orange-800',
    },
    high: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: XCircle,
      label: 'High Risk',
      badge: 'bg-red-100 text-red-800',
    },
    critical: {
      bg: 'bg-red-100',
      border: 'border-red-300',
      text: 'text-red-900',
      icon: XCircle,
      label: 'Critical',
      badge: 'bg-red-200 text-red-900',
    },
  };

  const statusConfig = {
    new: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'New' },
    acknowledged: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Acknowledged' },
    resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
    false_positive: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'False Positive' },
  };

  const config = severityConfig[threat.severity_level];
  const statusStyle = statusConfig[threat.status];
  const Icon = config.icon;

  const handleResolve = async () => {
    setProcessing(true);
    await markThreatResolved(threat.id);
    onUpdate();
    setProcessing(false);
  };

  const handleAcknowledge = async () => {
    setProcessing(true);
    await markThreatAcknowledged(threat.id);
    onUpdate();
    setProcessing(false);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg transition-all duration-200`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1">
            <Icon className={`w-6 h-6 ${config.text} flex-shrink-0 mt-1`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className={`${config.badge} px-2 py-1 rounded text-xs font-semibold`}>
                  {config.label}
                </span>
                <span className={`${statusStyle.bg} ${statusStyle.text} px-2 py-1 rounded text-xs font-medium`}>
                  {statusStyle.label}
                </span>
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatDate(threat.detected_at)}
                </span>
              </div>

              <h4 className={`font-semibold ${config.text} mb-1`}>
                {threat.threat_type.replace(/_/g, ' ').toUpperCase()} DETECTED
              </h4>

              <p className="text-sm text-gray-600 mb-2">
                Source: {threat.source_type} | Confidence: {threat.confidence_score}%
              </p>

              {threat.detected_patterns && threat.detected_patterns.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {threat.detected_patterns.map((pattern, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-white/60 px-2 py-1 rounded border border-gray-200"
                    >
                      {pattern}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`${config.text} hover:opacity-70 transition p-2`}
          >
            {showDetails ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="bg-white/60 rounded-lg p-4 mb-4">
              <h5 className="font-semibold text-gray-900 mb-2">Source Content:</h5>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{threat.source_content}</p>
            </div>

            <div className="bg-white/80 rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                AI Analysis & Explanation
              </h5>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {threat.nlp_explanation}
              </div>
            </div>
          </div>
        )}

        {threat.status === 'new' && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-3">
            <button
              onClick={handleAcknowledge}
              disabled={processing}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Acknowledge</span>
            </button>
            <button
              onClick={handleResolve}
              disabled={processing}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Resolve</span>
            </button>
          </div>
        )}

        {threat.status === 'acknowledged' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleResolve}
              disabled={processing}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark as Resolved</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
