
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollText } from 'lucide-react';

const libraryRules = [
  "Library Timings 7am to 2pm (Morning shift) & 2pm to 9:30 pm (Evening shift) through Monday to Saturday.",
  "Timings for sunday are 7am to 2pm only, and members from any shift are allowed to come before this time.",
  "Attendance is mandatory. Fill out your own attendance only.",
  "Girls will be seated separately.",
  "Single Shift fee Rs. 600. Both Shifts fee Rs. 1000. Subjected to change according to season.",
  "Demo will be given only for 1 day.",
  "Remove shoes outside on the shoe rack. Do not litter.",
  "Payment of fee due shall be made within 5 days after due date.",
  "First time visitors are prohibited from sitting in the library without informing at the reception.",
  "Maintain silence in all study areas. Mobile phones should be on silent mode.",
  "Adhere to your allocated shift timings to ensure fair access for all members.",
  "Misconduct or violation of library rules may result in suspension of membership.",
  "Report any issues or concerns to the library staff immediately or through the feedback option in the app.",
];

export default function MemberRulesPage() {
  return (
    <>
      <PageTitle title="Library Rules & Regulations" description="Please adhere to the following guidelines to ensure a conducive study environment for everyone." />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ScrollText className="mr-2 h-5 w-5" />
            Our Code of Conduct
          </CardTitle>
          <CardDescription>Familiarize yourself with these rules to make the most of your study time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 list-decimal list-inside text-foreground">
            {libraryRules.map((rule, index) => (
              <li key={index} className="pl-2">{rule}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
