
"use client";

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getAlertsForStudent, getStudentByEmail, getStudentByCustomId, getAllFeedback } from '@/services/student-service';
import type { FeedbackItem } from '@/types/communication';
import { useNotificationContext } from '@/contexts/notification-context';

export function useNotificationCounts() {
  const { user } = useAuth();
  const { refreshKey } = useNotificationContext();
  const [count, setCount] = React.useState(0);
  const [isLoadingCount, setIsLoadingCount] = React.useState(true);

  const fetchCounts = React.useCallback(async () => {
    if (!user) {
      setCount(0);
      setIsLoadingCount(false);
      return;
    }

    setIsLoadingCount(true);
    try {
      if (user.role === 'admin') {
        const allFeedback = await getAllFeedback();
        const openFeedbackCount = allFeedback.filter((item: FeedbackItem) => item.status === 'Open').length;
        setCount(openFeedbackCount);
      } else if (user.role === 'member') {
        let studentId = user.studentId;
        if (!studentId) {
            const student = await getStudentByEmail(user.email!);
            if(student) studentId = student.studentId;
        }
        
        if (studentId) {
            const alerts = await getAlertsForStudent(studentId);
            const unreadCount = alerts.filter(alert => !alert.isRead).length;
            setCount(unreadCount);
        } else {
            setCount(0);
        }
      }
    } catch (error) {
      console.error("Error fetching notification counts:", error);
      setCount(0); // Reset count on error
    } finally {
      setIsLoadingCount(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchCounts();
  }, [fetchCounts, refreshKey]);

  return { count, isLoadingCount };
}
