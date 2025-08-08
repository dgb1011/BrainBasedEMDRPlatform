import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';

interface KajabiIntegrationPanelProps {
  clientId: string;
}

interface IntegrationStatus {
  status: string;
  webhook_url?: string;
  students_count?: number;
  last_sync?: string;
}

export function KajabiIntegrationPanel({ clientId }: KajabiIntegrationPanelProps) {
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch integration status on component mount
  useEffect(() => {
    fetchIntegrationStatus();
  }, [clientId]);

  const fetchIntegrationStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/client/${clientId}/kajabi/status`);
      const data = await response.json();
      
      if (data.success) {
        setIntegrationStatus(data);
      } else {
        setError(data.message || 'Failed to fetch integration status');
      }
    } catch (error) {
      setError('Failed to fetch integration status');
    } finally {
      setIsLoading(false);
    }
  };

  const connectKajabi = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const response = await fetch(`/api/client/${clientId}/kajabi/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Kajabi integration configured successfully!');
        setIntegrationStatus({
          status: 'ready',
          webhook_url: data.webhook_url,
          students_count: 0
        });
      } else {
        setError(data.message || 'Failed to connect Kajabi');
      }
    } catch (error) {
      setError('Failed to connect Kajabi');
    } finally {
      setIsConnecting(false);
    }
  };

  const testIntegration = async () => {
    try {
      setIsTesting(true);
      setError(null);
      
      const response = await fetch(`/api/client/${clientId}/kajabi/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Integration test successful!');
      } else {
        setError(data.message || 'Integration test failed');
      }
    } catch (error) {
      setError('Failed to test integration');
    } finally {
      setIsTesting(false);
    }
  };

  const copyWebhookUrl = async () => {
    if (integrationStatus?.webhook_url) {
      try {
        await navigator.clipboard.writeText(integrationStatus.webhook_url);
        setSuccess('Webhook URL copied to clipboard!');
      } catch (error) {
        setError('Failed to copy webhook URL');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_connected':
        return <Badge variant="secondary">Not Connected</Badge>;
      case 'ready':
        return <Badge variant="default">Ready</Badge>;
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kajabi Integration</CardTitle>
          <CardDescription>Loading integration status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔗 Kajabi Integration
          {integrationStatus && getStatusBadge(integrationStatus.status)}
        </CardTitle>
        <CardDescription>
          Connect your Kajabi account to automatically sync students and course completions
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Not Connected State */}
        {(!integrationStatus || integrationStatus.status === 'not_connected') && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Connect your Kajabi account to start automatically syncing students and course data.
            </p>
            <Button 
              onClick={connectKajabi} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : '🔗 Connect Kajabi (One Click)'}
            </Button>
          </div>
        )}

        {/* Connected State */}
        {integrationStatus && integrationStatus.status !== 'not_connected' && (
          <div className="space-y-4">
            {/* Integration Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">{integrationStatus.students_count || 0}</div>
                <div className="text-sm text-muted-foreground">Students Synced</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {integrationStatus.last_sync ? 'Active' : 'Pending'}
                </div>
                <div className="text-sm text-muted-foreground">Last Sync</div>
              </div>
            </div>

            {/* Webhook URL */}
            {integrationStatus.webhook_url && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                    {integrationStatus.webhook_url}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyWebhookUrl}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Instructions */}
            {integrationStatus.status === 'ready' && (
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Next Steps in Kajabi:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Log into your Kajabi dashboard</li>
                  <li>Go to Settings → Webhooks</li>
                  <li>Click "Add New Webhook"</li>
                  <li>Copy the webhook URL above</li>
                  <li>Select events: "student.enrolled", "course.completed"</li>
                  <li>Click "Save"</li>
                </ol>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={testIntegration}
                disabled={isTesting}
                variant="outline"
                className="flex-1"
              >
                {isTesting ? 'Testing...' : '🧪 Test Integration'}
              </Button>
              
              {integrationStatus.status === 'ready' && (
                <Button
                  onClick={() => window.open('https://help.kajabi.com/hc/en-us/articles/360019034514-Webhooks', '_blank')}
                  variant="outline"
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Kajabi Help
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
