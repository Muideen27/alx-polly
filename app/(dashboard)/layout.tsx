"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/app/lib/context/auth-context";

/**
 * Dashboard layout component with authentication guard and navigation.
 * 
 * Provides the main dashboard shell with header navigation, user menu,
 * and authentication state management. Automatically redirects unauthenticated
 * users to login page. Uses client-side authentication context for real-time
 * auth state updates.
 * 
 * @param children - Dashboard page components to render
 * @returns JSX element containing the dashboard layout
 * 
 * @sideEffects
 * - Redirects to /login if user is not authenticated
 * - Calls signOut() on logout action
 * - Redirects to /login after logout
 * 
 * @uiStateReasoning
 * - Loading state: Shows loading message while auth state is being determined
 * - Disabled states: None (all actions are always available when authenticated)
 * - Aria-live: Not applicable (no dynamic content updates)
 * 
 * @securityConsiderations
 * - Client-side auth guard (server-side middleware provides primary protection)
 * - Automatic logout handling with navigation
 * - User data display from authenticated context
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();

  // Client-side authentication guard (server middleware provides primary protection)
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  /**
   * Handles user logout with navigation.
   * 
   * Calls the signOut function from auth context and redirects
   * to login page. Provides user feedback through navigation.
   */
  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // Show loading state while determining authentication status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <p>Loading user session...</p>
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Sticky header with navigation and user menu */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand logo with navigation to polls */}
          <Link href="/polls" className="text-xl font-bold text-slate-800">
            ALX Polly
          </Link>
          {/* Desktop navigation menu */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/polls" className="text-slate-600 hover:text-slate-900">
              My Polls
            </Link>
            <Link
              href="/create"
              className="text-slate-600 hover:text-slate-900"
            >
              Create Poll
            </Link>
          </nav>
          {/* Action buttons and user menu */}
          <div className="flex items-center space-x-4">
            <Button asChild>
              <Link href="/create">Create Poll</Link>
            </Button>
            {/* User avatar dropdown menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        user?.user_metadata?.avatar_url ||
                        "/placeholder-user.jpg"
                      }
                      alt={user?.email || "User"}
                    />
                    <AvatarFallback>
                      {user?.email ? user.email[0].toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/profile" className="w-full">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings" className="w-full">
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      {/* Main content area for dashboard pages */}
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
      {/* Footer with copyright information */}
      <footer className="border-t bg-white py-4">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} ALX Polly. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
