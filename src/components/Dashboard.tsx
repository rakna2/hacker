import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, LogOut, User, Scan } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ThreatDetection, UserProfile } from '../lib/supabase';
import { getUserThreats } from '../services/threatDetection';
import ThreatCard from './ThreatCard';
import ThreatScanner from './ThreatScanner';
import UserProfileModal from './UserProfileModal';
import StatusIndicator from './StatusIndicator';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
      subscribeToThreats();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    const [threatsData, profileData] = await Promise.all([
      getUserThreats(user.id),
      supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
    ]);

    setThreats(threatsData);
    if (profileData.data) {
      setProfile(profileData.data);
    }
    setLoading(false);
  };

  const subscribeToThreats = () => {
    if (!user) return;

    const channel = supabase
      .channel('threat_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threat_detections',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getOverallStatus = (): 'safe' | 'warning' | 'danger' => {
    const recentThreats = threats.filter(t => {
      const hoursSinceDetection = (Date.now() - new Date(t.detected_at).getTime()) / (1000 * 60 * 60);
      return hoursSinceDetection < 24 && t.status === 'new';
    });

    const hasCritical = recentThreats.some(t => t.severity_level === 'critical');
    const hasHigh = recentThreats.some(t => t.severity_level === 'high');
    const hasMedium = recentThreats.some(t => t.severity_level === 'medium');

    if (hasCritical || hasHigh) return 'danger';
    if (hasMedium) return 'warning';
    return 'safe';
  };

  const stats = {
    total: threats.length,
    critical: threats.filter(t => t.severity_level === 'critical' && t.status === 'new').length,
    high: threats.filter(t => t.severity_level === 'high' && t.status === 'new').length,
    medium: threats.filter(t => t.severity_level === 'medium' && t.status === 'new').length,
    resolved: threats.filter(t => t.status === 'resolved').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Shield</h1>
                <p className="text-xs text-gray-500">Threat Detection Platform</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Scan className="w-4 h-4" />
                <span>Scan Communication</span>
              </button>

              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <User className="w-4 h-4" />
                <span>{profile?.full_name || 'Profile'}</span>
              </button>

              <button
                onClick={() => signOut()}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <StatusIndicator status={getOverallStatus()} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Threats</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 mb-1">Critical</p>
                <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 mb-1">Medium Risk</p>
                <p className="text-3xl font-bold text-orange-600">{stats.medium}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 mb-1">Resolved</p>
                <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Threat Detections</h2>
            <p className="text-sm text-gray-500 mt-1">
              AI-powered analysis of communications with detailed explanations
            </p>
          </div>

          <div className="p-6">
            {threats.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No threats detected yet</p>
                <p className="text-sm text-gray-400">
                  Click "Scan Communication" to analyze messages for social engineering attacks
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {threats.map((threat) => (
                  <ThreatCard key={threat.id} threat={threat} onUpdate={loadData} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showScanner && (
        <ThreatScanner
          userId={user!.id}
          onClose={() => setShowScanner(false)}
          onScanComplete={() => {
            setShowScanner(false);
            loadData();
          }}
        />
      )}

      {showProfile && profile && (
        <UserProfileModal
          profile={profile}
          onClose={() => setShowProfile(false)}
          onUpdate={() => {
            loadData();
            setShowProfile(false);
          }}
        />
      )}
    </div>
  );
}
