"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type User = {
  id: string;
  name: string;
  email: string;
  type: string;
  avatar_url?: string;
  receiverId: string;
  appointmentId: string;
};

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, token, BASE_URL } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      // First get all users
      const usersRes = await fetch(`${BASE_URL}/api/chat/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!usersRes.ok) {
        throw new Error("Failed to fetch users");
      }

      const usersData = await usersRes.json();
      const allUsers = usersData.data;

      // Then get connected users based on user type
      const endpoint =
        user?.type === "user"
          ? "/api/user-dashboard/all-hired-coachs"
          : "/api/coach-dashboard/all-consumer-list";

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch connected users");
      }

      const result = await res.json();
      const items =
        user?.type === "user" ? result.coachesList : result.customerlist;

      // Map the users
      const mappedList: User[] = [];
      const seenIds = new Set<string>();

      for (const item of items) {
        const name = user?.type === "user" ? item.name : item.customer_name;
        const email = user?.type === "user" ? item.email : null;
        const match = allUsers.find((u: any) =>
          email ? u.email === email : u.name === name
        );

        if (!match) continue;

        // Skip if we've already seen this ID
        if (seenIds.has(match.id)) {
          console.warn(`Duplicate user ID found: ${match.id} for user ${name}`);
          continue;
        }

        seenIds.add(match.id);

        mappedList.push({
          id: match.id,
          name,
          email: match.email,
          type: match.type,
          avatar_url: match.avatar_url || "https://via.placeholder.com/40",
          receiverId: match.id,
          appointmentId: item.orderId,
        });
      }

      setUsers(mappedList);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initiateCall = (
    userId: string,
    appointmentId: string,
    isVideo: boolean
  ) => {
    router.push(
      `/call?receiver=${userId}&appointment=${appointmentId}&video=${isVideo}`
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 h-24"></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No contacts found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((contact) => (
        <Card
          key={`${contact.id}-${contact.appointmentId}`}
          className="overflow-hidden"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage
                      src={contact.avatar_url || "/placeholder.svg"}
                      alt={contact.name}
                    />
                    <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                  </Avatar>
                  {/* Online status indicator - this is just visual and would need real-time status in a production app */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 rounded-full border-2 border-white"></span>
                </div>
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.email}</p>
                  <p className="text-xs text-gray-400 capitalize">
                    {contact.type}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    initiateCall(
                      contact.receiverId,
                      contact.appointmentId,
                      false
                    )
                  }
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    initiateCall(
                      contact.receiverId,
                      contact.appointmentId,
                      true
                    )
                  }
                >
                  <Video className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
