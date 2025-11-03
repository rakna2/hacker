import { useState } from 'react';
import { X, Scan, Mail, MessageSquare, Link as LinkIcon, Loader } from 'lucide-react';
import { scanCommunication } from '../services/threatDetection';

interface ThreatScannerProps {
  userId: string;
  onClose: () => void;
  onScanComplete: () => void;
}

export default function ThreatScanner({ userId, onClose, onScanComplete }: ThreatScannerProps) {
  const [sourceType, setSourceType] = useState<'email' | 'message' | 'link' | 'other'>('email');
  const [content, setContent] = useState('');
  const [scanning, setScanning] = useState(false);

  const handleScan = async () => {
    if (!content.trim()) return;

    setScanning(true);

    try {
      await scanCommunication(userId, content, sourceType);
      onScanComplete();
    } catch (error) {
      console.error('Error scanning:', error);
    } finally {
      setScanning(false);
    }
  };

  const sourceTypes = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'message', label: 'Message', icon: MessageSquare },
    { value: 'link', label: 'Link/URL', icon: LinkIcon },
    { value: 'other', label: 'Other', icon: Scan },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Scan className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scan Communication</h3>
              <p className="text-sm text-gray-500">AI-powered threat detection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Source Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {sourceTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setSourceType(type.value as any)}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition ${
                      sourceType === type.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        sourceType === type.value ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        sourceType === type.value ? 'text-blue-900' : 'text-gray-700'
                      }`}
                    >
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content to Analyze
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste the email, message, or URL you want to scan for social engineering threats..."
              className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-2 text-xs text-gray-500">
              Our AI will analyze this content for manipulation techniques, urgency cues, suspicious links, and other social engineering indicators.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2 text-sm">What we analyze:</h4>
            <ul className="space-y-1 text-xs text-blue-800">
              <li>• Urgency and pressure tactics</li>
              <li>• Authority impersonation attempts</li>
              <li>• Suspicious links and attachments</li>
              <li>• Credential harvesting patterns</li>
              <li>• Emotional manipulation techniques</li>
              <li>• Financial request indicators</li>
            </ul>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleScan}
              disabled={!content.trim() || scanning}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {scanning ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5" />
                  <span>Scan Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
