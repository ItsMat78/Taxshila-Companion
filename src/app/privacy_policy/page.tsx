
"use client";

import * as React from 'react';
import { PageTitle } from '@/components/shared/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <PageTitle title="Privacy Policy" description="Last updated: July 28, 2024">
         <Link href="/home" passHref>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </PageTitle>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ScrollText className="mr-2 h-5 w-5" />
            Our Commitment to Your Privacy
          </CardTitle>
          <CardDescription>
            This Privacy Policy describes how Taxshila Companion ("we", "us", or "our") collects, uses, and discloses your information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-foreground/90 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
            <p>We collect several types of information in order to provide and improve our service to you:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-4">
              <li><strong>Personal Identification Information:</strong> Name, phone number, email address, and physical address provided during registration.</li>
              <li><strong>Membership Details:</strong> Your assigned student ID, selected shift (Morning, Evening, or Full-day), and allocated seat number.</li>
              <li><strong>Attendance Data:</strong> Check-in and check-out timestamps recorded via QR code scans.</li>
              <li><strong>Financial Information:</strong> Records of your fee payments, including date, amount, and payment method (e.g., Cash, Online).</li>
              <li><strong>Communication Data:</strong> Feedback, complaints, or suggestions you submit through the app, and records of alerts sent to you.</li>
              <li><strong>Device Information:</strong> Push notification tokens (e.g., for Firebase Cloud Messaging or OneSignal) to send you alerts and updates if you grant permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
            <p>We use the collected data for various purposes:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 pl-4">
              <li>To manage your membership and provide you with our library services.</li>
              <li>To track attendance and manage seat availability.</li>
              <li>To manage fee payments, calculate dues, and maintain financial records.</li>
              <li>To communicate with you, including sending important alerts, fee reminders, and responding to your feedback.</li>
              <li>To monitor and improve the usage and functionality of our service.</li>
              <li>To ensure the security and safety of our members and premises.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-lg font-semibold mb-2">3. Data Storage and Security</h2>
            <p>
              Your data is securely stored on Google Firebase, a platform that uses robust security measures to protect your information. We take reasonable steps to protect your personal data from loss, misuse, and unauthorized access or disclosure. However, no internet-based service is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. Your data is used exclusively for the operational purposes of Taxshila Digital Library. We may disclose your information if required to do so by law or in response to valid requests by public authorities.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Your Rights</h2>
            <p>
              You have the right to access and view the personal information we hold about you through your profile in the app. If you believe any information is incorrect, please contact the library administration to have it corrected.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at <a href="mailto:taxshiladigitallibrary@gmail.com" className="text-primary underline hover:text-primary/80">taxshiladigitallibrary@gmail.com</a>.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

