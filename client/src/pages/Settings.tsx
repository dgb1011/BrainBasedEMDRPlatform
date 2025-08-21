import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/layout/Navigation';
import { 
  User, 
  Camera, 
  Save, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Bell,
  Eye,
  Lock,
  Upload,
  X,
  Check,
  CheckCircle,
  AlertCircle,
  Globe,
  Clock
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Password Change Component
function PasswordChangeSection() {
  const { toast } = useToast();
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: async (passwordData: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest('/api/auth/change-password', 'POST', passwordData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been successfully updated."
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive"
      });
    }
  });

  const handlePasswordChange = () => {
    // Validation
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match",
        variant: "destructive"
      });
      return;
    }

    if (passwords.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword
    });
  };

  if (!showPasswordForm) {
    return (
      <Button 
        variant="outline" 
        className="w-full justify-start"
        onClick={() => setShowPasswordForm(true)}
      >
        <Lock className="h-4 w-4 mr-2" />
        Change Password
      </Button>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Change Password</h4>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            setShowPasswordForm(false);
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
            placeholder="Enter current password"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
            placeholder="Enter new password (min 8 characters)"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
            placeholder="Confirm new password"
          />
        </div>
        
        <Button 
          onClick={handlePasswordChange}
          disabled={changePasswordMutation.isPending || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
          className="w-full"
        >
          {changePasswordMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Update Password
        </Button>
      </div>
      
      <div className="text-xs text-gray-600 space-y-1">
        <p>• Password must be at least 8 characters long</p>
        <p>• Include a mix of letters, numbers, and symbols</p>
        <p>• For Kajabi users: This will update your platform password only</p>
      </div>
    </div>
  );
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profileImageUrl?: string;
  phone?: string;
  bio?: string;
  timezone?: string;
  preferences?: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    weeklyReports: boolean;
  };
}

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({});

  // Get current user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      const res = await apiRequest('/api/auth/me', 'GET');
      const json = await res.json();
      const merged = {
        id: json?.user?.id,
        email: json?.user?.email,
        firstName: json?.user?.first_name || json?.user?.firstName,
        lastName: json?.user?.last_name || json?.user?.lastName,
        role: json?.user?.role,
        phone: json?.profile?.phone,
        timezone: json?.profile?.timezone,
        bio: json?.profile?.bio,
        preferences: json?.profile?.preferences
      } as Partial<UserProfile>;
      setProfileData(merged);
      return merged;
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const endpoint = (user?.role === 'student')
        ? '/api/students/profile'
        : (user?.role === 'consultant')
          ? '/api/consultants/profile'
          : '/api/auth/me';
      const res = await apiRequest(endpoint, 'PUT', updates);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      refreshUser(); // Update auth context
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    }
  });

  // Upload profile image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await fetch('/api/uploads/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Upload failed');
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Image Uploaded",
        description: "Your profile image has been updated."
      });
      setProfileData(prev => ({ ...prev, profileImageUrl: data.imageUrl }));
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }

      uploadImageMutation.mutate(file);
    }
  };

  const handleSaveProfile = async () => {
    // Save notification preferences first if available
    try {
      if (profileData?.preferences) {
        await apiRequest('/api/notifications/preferences', 'PUT', profileData.preferences);
      }
    } catch (e: any) {
      toast({ title: 'Failed to update preferences', description: e?.message || 'Unknown error', variant: 'destructive' });
    }
    updateProfileMutation.mutate(profileData);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'consultant': return 'EMDR Consultant';
      case 'student': return 'EMDR Student';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'consultant': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <User className="h-8 w-8 mr-3 text-blue-600" />
              Profile Settings
            </h1>
            <p className="text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>
          <Badge className={`px-3 py-1 ${getRoleColor(user?.role || '')}`}>
            {getRoleLabel(user?.role || '')}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Image & Basic Info */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Profile Photo</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                    {profileData?.profileImageUrl ? (
                      <img 
                        src={profileData.profileImageUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{user?.firstName} {user?.lastName}</h3>
                  <p className="text-gray-600">{user?.email}</p>
                  <Badge className={getRoleColor(user?.role || '')}>
                    {getRoleLabel(user?.role || '')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg mt-6">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Status</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="text-sm font-medium">
                    {user ? new Date().toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Updated</span>
                  <span className="text-sm font-medium">
                    Never
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profileData?.firstName || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData?.lastName || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData?.email || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={profileData?.phone || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about your professional background and expertise..."
                    value={profileData?.bio || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={profileData?.timezone || 'America/New_York'}
                    onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Bell className="h-5 w-5 mr-2 text-purple-600" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Receive updates about sessions and progress</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={profileData?.preferences?.emailNotifications ?? true}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        preferences: {
                          emailNotifications: e.target.checked,
                          smsNotifications: prev.preferences?.smsNotifications ?? false,
                          weeklyReports: prev.preferences?.weeklyReports ?? true
                        }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">SMS Notifications</h4>
                      <p className="text-sm text-gray-600">Get text reminders for upcoming sessions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={profileData?.preferences?.smsNotifications ?? false}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        preferences: {
                          emailNotifications: prev.preferences?.emailNotifications ?? true,
                          smsNotifications: e.target.checked,
                          weeklyReports: prev.preferences?.weeklyReports ?? true
                        }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Weekly Reports</h4>
                      <p className="text-sm text-gray-600">Receive weekly progress summaries</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={profileData?.preferences?.weeklyReports ?? true}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        preferences: {
                          emailNotifications: prev.preferences?.emailNotifications ?? true,
                          smsNotifications: prev.preferences?.smsNotifications ?? false,
                          weeklyReports: e.target.checked
                        }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg font-semibold">
                  <Shield className="h-5 w-5 mr-2 text-red-600" />
                  Security & Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PasswordChangeSection />
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Account Security</p>
                  <div className="space-y-2">
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Email Verified
                    </Badge>
                    <div className="text-xs text-gray-500">
                      Last password change: Never
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
                className="px-8"
              >
                {updateProfileMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
