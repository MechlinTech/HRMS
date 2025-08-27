import { supabase } from './supabase';
import type { User } from '@/types';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  created_at: string;
}

export const notificationApi = {
  // Get user notifications
  async getUserNotifications(userId: string, limit: number = 50) {
    console.log('Fetching notifications for user:', userId);
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} notifications for user ${userId}:`, data);
    return data;
  },

  // Get unread notifications count
  async getUnreadCount(userId: string) {
    console.log('Fetching unread count for user:', userId);
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
    
    console.log(`Unread count for user ${userId}:`, count || 0);
    return count || 0;
  },

  // Mark notification as read
  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select()
      .single();
    
    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
    return data;
  },

  // Mark all notifications as read
  async markAllAsRead(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
    return data;
  },

  // Delete notification
  async deleteNotification(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .select()
      .single();
    
    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
    return data;
  },

  // Delete all read notifications
  async deleteAllReadNotifications(userId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);
    
    if (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }
    return data;
  },

  // Create notification (for testing or manual creation)
  async createNotification(notification: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    data?: Record<string, any>;
  }) {
    console.log('Creating notification with data:', {
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'general',
      data: notification.data || {}
    });
    
    const attempt = async (forcedType?: string) => {
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: notification.user_id,
        p_title: notification.title,
        p_message: notification.message,
        p_type: forcedType || notification.type || 'general',
        p_data: notification.data || {}
      });
      if (error) throw error;
      return data;
    };

    try {
      const data = await attempt();
      console.log('Notification created successfully via RPC:', data);
      return data;
    } catch (error: any) {
      // If type violates constraint (code 23514), retry with 'general'
      if (error?.code === '23514') {
        try {
          console.warn('Notification type not allowed by constraint; retrying with general. Original type:', notification.type);
          const data = await attempt('general');
          return data;
        } catch (retryError) {
          console.error('Retry with general type failed:', retryError);
          throw retryError;
        }
      }
      console.error('Exception in createNotification:', error);
      throw error;
    }
  },

  // Push subscription management
  async savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint!,
        p256dh_key: subscription.keys!.p256dh,
        auth_key: subscription.keys!.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,endpoint'
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async removePushSubscription(userId: string, endpoint: string) {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint);
    
    if (error) throw error;
  },

  async getUserPushSubscriptions(userId: string) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
  },
}