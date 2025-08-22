import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import Navigation from '@/components/layout/Navigation';
import { 
  Webhook, 
  Globe, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Copy,
  Settings,
  Zap,
  Database,
  Users,
  Activity,
  Shield
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface WebhookConfig {
  id: string;
  endpoint: string;
  isActive: boolean;
  lastTriggered: Date | null;
  eventsReceived: number;
  secretKey: string;
  events: string[];
}

export default function KajabiIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Get current webhook configuration
  const { data: webhookConfig, isLoading } = useQuery({
    queryKey: ['/api/admin/kajabi/webhook'],
    queryFn: async () => {
      const res = await apiRequest('/api/admin/kajabi/webhook', 'GET');
      return await res.json();
    }
  });

  // Configure webhook
  const configureWebhookMutation = useMutation({
    mutationFn: async (config: { endpoint: string; secretKey: string; events: string[] }) => {
      const res = await apiRequest('/api/admin/kajabi/webhook', 'POST', config);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Webhook Configured",
        description: "Kajabi webhook has been successfully configured and activated."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/kajabi/webhook'] });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to configure webhook",
        variant: "destructive"
      });
    }
  });

  // Test webhook connection
  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      setIsTestingConnection(true);
      const res = await apiRequest('/api/admin/kajabi/webhook/test', 'POST');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Connection Test Successful",
        description: `Webhook is working correctly. Response: ${data.status}`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Test Failed",
        description: error.message || "Webhook connection test failed",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsTestingConnection(false);
    }
  });

  const copyWebhookUrl = () => {
    const fullUrl = `${window.location.origin}/api/webhooks/kajabi`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: "URL Copied",
      description: "Webhook URL copied to clipboard"
    });
  };

  const generateSecretKey = () => {
    const newKey = crypto.randomUUID().replace(/-/g, '');
    setSecretKey(newKey);
  };

  const handleConfigureWebhook = () => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter the Kajabi webhook URL",
        variant: "destructive"
      });
      return;
    }

    configureWebhookMutation.mutate({
      endpoint: webhookUrl,
      secretKey: secretKey,
      events: ['course_completion', 'student_enrollment', 'payment_completed']
    });
  };

  useEffect(() => {
    if (webhookConfig) {
      setWebhookUrl(webhookConfig.endpoint || '');
      setSecretKey(webhookConfig.secretKey || '');
    }
  }, [webhookConfig]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Webhook className="h-8 w-8 mr-3 text-blue-600" />
              Kajabi Integration
            </h1>
            <p className="text-gray-600">
              Configure Kajabi webhook to enable autonomous student enrollment and course completion tracking
            </p>
          </div>
          <Badge variant={webhookConfig?.isActive ? "default" : "secondary"} className="px-3 py-1">
            {webhookConfig?.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Settings className="h-5 w-5 mr-2 text-blue-600" />
                  Webhook Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* BrainBased Platform Webhook URL */}
                <div className="space-y-2">
                  <Label htmlFor="platform-webhook">BrainBased Platform Webhook URL</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="platform-webhook"
                      value={`${window.location.origin}/api/webhooks/kajabi`}
                      readOnly
                      className="bg-gray-50"
                    />
                    <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">
                    Use this URL in your Kajabi webhook settings
                  </p>
                </div>

                {/* Kajabi Webhook URL */}
                <div className="space-y-2">
                  <Label htmlFor="kajabi-webhook">Kajabi API Endpoint (Optional)</Label>
                  <Input
                    id="kajabi-webhook"
                    placeholder="https://your-kajabi-domain.com/api/webhooks"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-600">
                    Enter if you need to send data back to Kajabi
                  </p>
                </div>

                {/* Secret Key */}
                <div className="space-y-2">
                  <Label htmlFor="secret-key">Webhook Secret Key</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="secret-key"
                      type="password"
                      placeholder="Generate or enter your secret key"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                    />
                    <Button variant="outline" size="sm" onClick={generateSecretKey}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">
                    This key will be used to verify webhook authenticity
                  </p>
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button 
                    onClick={handleConfigureWebhook}
                    disabled={configureWebhookMutation.isPending}
                    className="flex-1"
                  >
                    {configureWebhookMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Configure Webhook
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => testWebhookMutation.mutate()}
                    disabled={isTestingConnection || !webhookConfig?.isActive}
                  >
                    {isTestingConnection ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Setup Instructions */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Globe className="h-5 w-5 mr-2 text-green-600" />
                  Kajabi Setup Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <div>
                      <p className="font-medium">Login to your Kajabi dashboard</p>
                      <p className="text-gray-600">Go to Settings → Integrations → Webhooks</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <p className="font-medium">Add new webhook</p>
                      <p className="text-gray-600">Copy the BrainBased Platform Webhook URL above</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <p className="font-medium">Configure events</p>
                      <p className="text-gray-600">Enable: Course Completion, Student Enrollment, Payment Completed</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                    <div>
                      <p className="font-medium">Add secret key</p>
                      <p className="text-gray-600">Use the secret key generated above for security</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status & Monitoring Panel */}
          <div className="space-y-6">
            {/* Connection Status */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Activity className="h-5 w-5 mr-2 text-purple-600" />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {webhookConfig?.eventsReceived || 0}
                    </div>
                    <div className="text-sm text-gray-600">Events Received</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {webhookConfig?.lastTriggered ? 'Connected' : 'Pending'}
                    </div>
                    <div className="text-sm text-gray-600">Status</div>
                  </div>
                </div>
                
                {webhookConfig?.lastTriggered && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Last triggered: {new Date(webhookConfig.lastTriggered).toLocaleString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Autonomous System Benefits */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Shield className="h-5 w-5 mr-2 text-indigo-600" />
                  Autonomous System Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-indigo-500" />
                  <span className="text-sm">Automatic student enrollment from Kajabi courses</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-indigo-500" />
                  <span className="text-sm">Real-time sync of course completion status</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-indigo-500" />
                  <span className="text-sm">Zero manual intervention for student onboarding</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-indigo-500" />
                  <span className="text-sm">Automated certification eligibility tracking</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Webhook Events */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Activity className="h-5 w-5 mr-2 text-orange-600" />
                  Recent Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {webhookConfig?.eventsReceived > 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Event monitoring will show recent webhook activities</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No events received yet</p>
                      <p className="text-sm mt-1">Configure the webhook to start receiving events</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}






