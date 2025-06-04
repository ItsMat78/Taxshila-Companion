
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
  "Maintain silence in all study areas. Mobile phones should be on silent mode.",
  "No food or beverages (except water in a sealed container) are allowed near books or computers.",
  "Personal belongings should not be left unattended. The library is not responsible for lost items.",
  "Respect library property. Do not write on, deface, or damage any library materials or furniture.",
  "Seats are for registered members only and cannot be reserved by placing belongings.",
  "Adhere to your allocated shift timings to ensure fair access for all members.",
  "Misconduct or violation of library rules may result in suspension of membership.",
  "Dispose of waste properly in designated bins.",
  "Report any issues or concerns to the library staff immediately.",
  "Follow all instructions given by the library staff.",
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
