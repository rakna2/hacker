import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';

interface StatusIndicatorProps {
  status: 'safe' | 'warning' | 'danger';
}

export default function StatusIndicator({ status }: StatusIndicatorProps) {
  const configs = {
    safe: {
      icon: Shield,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-900',
      lightColor: 'bg-green-500',
      title: 'System Status: SECURE',
      description: 'No active threats detected. Your communications are being monitored and protected.',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconColor: 'text-orange-600',
      textColor: 'text-orange-900',
      lightColor: 'bg-orange-500',
      title: 'System Status: CAUTION',
      description: 'Medium-risk threats detected. Review alerts and proceed with caution.',
    },
    danger: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-900',
      lightColor: 'bg-red-500',
      title: 'System Status: ALERT',
      description: 'High-risk or critical threats detected. Immediate attention required!',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-xl p-6`}>
      <div className="flex items-start space-x-4">
        <div className="relative">
          <div className={`${config.lightColor} absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse`} />
          <div className={`relative p-3 ${config.bgColor} rounded-full border-2 ${config.borderColor}`}>
            <Icon className={`w-8 h-8 ${config.iconColor}`} />
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className={`text-xl font-bold ${config.textColor}`}>{config.title}</h3>
            <div className={`w-3 h-3 ${config.lightColor} rounded-full animate-pulse`} />
          </div>
          <p className={`text-sm ${config.textColor} opacity-80`}>{config.description}</p>
        </div>
      </div>
    </div>
  );
}
