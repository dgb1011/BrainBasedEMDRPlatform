import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Brain, LogOut, User, Settings, Calendar, BookOpen, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function Navigation() {
  const { user, signOut } = useAuth();
  const [location] = useLocation();

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'consultant':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'consultant':
        return 'Consultant';
      case 'student':
        return 'Student';
      default:
        return 'User';
    }
  };

  const getNavigationItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'admin':
        return [
          { href: '/', label: 'Dashboard', icon: BarChart3 },
          { href: '/admin', label: 'Admin Panel', icon: Settings },
        ];
      case 'consultant':
        return [
          { href: '/', label: 'Dashboard', icon: BarChart3 },
          { href: '/schedule', label: 'Schedule', icon: Calendar },
          { href: '/sessions', label: 'Sessions', icon: BookOpen },
        ];
      case 'student':
        return [
          { href: '/', label: 'Dashboard', icon: BarChart3 },
          { href: '/schedule', label: 'Schedule', icon: Calendar },
          { href: '/progress', label: 'Progress', icon: BookOpen },
          { href: '/sessions', label: 'Sessions', icon: BookOpen },
        ];
      default:
        return [];
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) return null;

  const navItems = getNavigationItems();

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-4">
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <Brain className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">BrainBased EMDR</span>
            </div>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="flex items-center space-x-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
            {getRoleLabel(user.role)}
          </span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl} alt={user.firstName} />
                  <AvatarFallback>
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
} 