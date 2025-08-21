import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Calendar,
  Clock,
  Award,
  BookOpen,
  CheckCircle,
  Upload,
  Edit,
  UserCheck,
  Briefcase
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

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
  createdAt: string;
  // Role-specific data
  specializations?: string[];
  certifications?: string[];
  hourlyRate?: number;
  totalHours?: number;
  totalSessions?: number;
  averageRating?: number;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<Partial<UserProfile>>({});

  // Get comprehensive user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/me/profile'],
    queryFn: async () => {
      const res = await apiRequest('/api/me/profile', 'GET');
      const json = await res.json();
      
      let profileInfo = {};
      
      // Handle different response structures
      if (json.user) {
        profileInfo = {
          id: json.user.id,
          email: json.user.email,
          firstName: json.user.first_name || json.user.firstName,
          lastName: json.user.last_name || json.user.lastName,
          role: json.user.role,
          profileImageUrl: json.user.profile_image_url,
          createdAt: json.user.created_at || json.user.createdAt,
          phone: json.profile?.phone,
          bio: json.profile?.bio,
          timezone: json.profile?.timezone,
          specializations: json.profile?.specializations,
          certifications: json.profile?.certifications,
          hourlyRate: json.profile?.hourly_rate,
          totalHours: json.stats?.total_hours || json.profile?.total_hours,
          totalSessions: json.stats?.total_sessions || json.profile?.total_sessions,
          averageRating: json.stats?.average_rating || json.profile?.average_rating
        };
      } else {
        // Fallback to auth/me endpoint
        const authRes = await apiRequest('/api/auth/me', 'GET');
        const authJson = await authRes.json();
        profileInfo = {
          id: authJson?.user?.id,
          email: authJson?.user?.email,
          firstName: authJson?.user?.first_name || authJson?.user?.firstName,
          lastName: authJson?.user?.last_name || authJson?.user?.lastName,
          role: authJson?.user?.role,
          profileImageUrl: authJson?.user?.profile_image_url,
          createdAt: authJson?.user?.created_at || authJson?.user?.createdAt
        };
      }
      
      setProfileData(profileInfo);
      return profileInfo as UserProfile;
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const endpoint = '/api/me/profile';
      const res = await apiRequest(endpoint, 'PUT', updates);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated."
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/me/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      refreshUser();
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
      queryClient.invalidateQueries({ queryKey: ['/api/me/profile'] });
      refreshUser();
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

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleCancelEdit = () => {
    setProfileData(profile || {});
    setIsEditing(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Platform Administrator';
      case 'consultant': return 'EMDR Consultant';
      case 'student': return 'EMDR Student';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'consultant': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'student': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return UserCheck;
      case 'consultant': return Briefcase;
      case 'student': return BookOpen;
      default: return User;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="h-96 bg-gray-200 rounded"></div>
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(profile?.role || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navigation />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <User className="h-8 w-8 mr-3 text-blue-600" />
              Profile
            </h1>
            <p className="text-gray-600">
              View and manage your profile information
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button onClick={handleCancelEdit} variant="outline">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Image & Quick Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                      {profile?.profileImageUrl ? (
                        <img 
                          src={profile.profileImageUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold">
                          {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                        </div>
                      )}
                    </div>
                    {isEditing && (
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
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    <h3 className="font-bold text-xl">{profile?.firstName} {profile?.lastName}</h3>
                    <p className="text-gray-600 flex items-center justify-center">
                      <Mail className="h-4 w-4 mr-2" />
                      {profile?.email}
                    </p>
                    <Badge className={`inline-flex items-center px-3 py-1 text-sm font-medium border ${getRoleColor(profile?.role || '')}`}>
                      <RoleIcon className="h-4 w-4 mr-1" />
                      {getRoleLabel(profile?.role || '')}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Account Status</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="text-sm font-medium">
                    {profile?.createdAt ? format(new Date(profile.createdAt), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                </div>
                {profile?.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Phone</span>
                    <span className="text-sm font-medium">{profile.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Role-specific Stats */}
            {(profile?.role === 'consultant' || profile?.role === 'student') && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">
                    {profile.role === 'consultant' ? 'Consultant Stats' : 'Progress Stats'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profile.totalHours !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Hours</span>
                      <span className="text-sm font-bold text-blue-600">{profile.totalHours}h</span>
                    </div>
                  )}
                  {profile.totalSessions !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Sessions</span>
                      <span className="text-sm font-bold text-green-600">{profile.totalSessions}</span>
                    </div>
                  )}
                  {profile.averageRating !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Average Rating</span>
                      <span className="text-sm font-bold text-yellow-600">{profile.averageRating}/5</span>
                    </div>
                  )}
                  {profile.role === 'consultant' && profile.hourlyRate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Hourly Rate</span>
                      <span className="text-sm font-bold text-purple-600">${profile.hourlyRate}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Profile Details */}
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
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profileData?.lastName || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!isEditing}
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about your professional background and expertise..."
                    value={profileData?.bio || ''}
                    onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!isEditing}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <select
                    id="timezone"
                    value={profileData?.timezone || 'America/New_York'}
                    onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                    disabled={!isEditing}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
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

            {/* Professional Information (for consultants) */}
            {profile?.role === 'consultant' && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <Briefcase className="h-5 w-5 mr-2 text-purple-600" />
                    Professional Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="specializations">Specializations</Label>
                    <Input
                      id="specializations"
                      placeholder="e.g., Trauma therapy, PTSD treatment, etc."
                      value={Array.isArray(profileData?.specializations) ? profileData.specializations.join(', ') : ''}
                      onChange={(e) => setProfileData(prev => ({ 
                        ...prev, 
                        specializations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="certifications">Certifications</Label>
                    <Input
                      id="certifications"
                      placeholder="e.g., EMDR Level 1, EMDR Level 2, etc."
                      value={Array.isArray(profileData?.certifications) ? profileData.certifications.join(', ') : ''}
                      onChange={(e) => setProfileData(prev => ({ 
                        ...prev, 
                        certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      placeholder="150"
                      value={profileData?.hourlyRate || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Learning Progress (for students) */}
            {profile?.role === 'student' && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-lg font-semibold">
                    <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                    Learning Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{profile.totalHours || 0}/40</div>
                      <div className="text-sm text-gray-600">Consultation Hours</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{profile.totalSessions || 0}</div>
                      <div className="text-sm text-gray-600">Completed Sessions</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to Certification</span>
                      <span>{Math.round(((profile.totalHours || 0) / 40) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(((profile.totalHours || 0) / 40) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




