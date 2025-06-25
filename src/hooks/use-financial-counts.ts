"use client";

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getAllStudents } from '@/services/student-service';
import { useNotificationContext } from '@/contexts/notification-context';

export function useFinancialCounts() {
  const { user } = useAuth();
  const { refreshKey } = useNotificationContext();
  const [count, setCount] = React.useState(0);
  const [isLoadingCount, setIsLoadingCount] = React.useState(true);

  const fetchCounts = React.useCallback(async () => {
    if (!user || user.role !== 'admin') {
      setCount(0);
      setIsLoadingCount(false);
      return;
    }

    setIsLoadingCount(true);
    try {
      const students = await getAllStudents();
      const dueOrOverdueCount = students.filter(
        student => student.activityStatus === 'Active' && (student.feeStatus === "Due" || student.feeStatus === "Overdue")
      ).length;
      setCount(dueOrOverdueCount);
    } catch (error) {
      console.error("Error fetching financial counts:", error);
      setCount(0);
    } finally {
      setIsLoadingCount(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchCounts();
  }, [fetchCounts, refreshKey]);

  return { count, isLoadingCount };
}
