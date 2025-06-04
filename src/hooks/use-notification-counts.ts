
"use client";

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getAllFeedback, getAlertsForStudent, getStudentByEmail } from '@/services/student-service';
import type { FeedbackItem } from '@/types/communication';
import type { AlertItem } from '@/types/communication';

export function useNotificationCounts() {
  const { user } = useAuth();
  const [count, setCount] = React.useState(0);
  const [isLoadingCount, setIsLoadingCount] = React.useState(false);

  const fetchCounts = React.useCallback(async () => {
    if (!user) {
      setCount(0);
      setIsLoadingCount(false);
      return;
    }

    setIsLoadingCount(true);
    try {
      if (user.role === 'admin') {
        const feedbackItems: FeedbackItem[] = await getAllFeedback();
        const openFeedbackCount = feedbackItems.filter(item => item.status === "Open").length;
        setCount(openFeedbackCount);
      } else if (user.role === 'member' && user.email) {
        const student = await getStudentByEmail(user.email);
        if (student && student.studentId) {
          const alerts: AlertItem[] = await getAlertsForStudent(student.studentId);
          const unreadAlertsCount = alerts.filter(alert => !alert.isRead).length;
          setCount(unreadAlertsCount);
        } else {
          setCount(0); // Student not found or no studentId
        }
      } else {
        setCount(0);
      }
    } catch (error) {
      console.error("Error fetching notification counts:", error);
      setCount(0);
    } finally {
      setIsLoadingCount(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Optional: Refetch counts periodically or on specific events if needed
  // For now, it refetches when the user object changes (e.g., login/logout)

  return { count, isLoadingCount };
}
