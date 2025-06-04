
"use client";

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getAllFeedback, getAlertsForStudent, getStudentByEmail } from '@/services/student-service';
import type { FeedbackItem } from '@/types/communication';
import type { AlertItem } from '@/types/communication';
import { useNotificationContext } from '@/contexts/notification-context'; // Import context hook

export function useNotificationCounts() {
  const { user } = useAuth();
  const { refreshKey } = useNotificationContext(); // Consume refreshKey from context
  const [count, setCount] = React.useState(0);
  const [isLoadingCount, setIsLoadingCount] = React.useState(true); // Default to true

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
          setCount(0); 
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
  }, [fetchCounts, refreshKey]); // Add refreshKey as a dependency

  return { count, isLoadingCount };
}
