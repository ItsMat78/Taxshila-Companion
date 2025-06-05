
import Image from 'next/image'
import { Metadata } from 'next/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const LIBRARY_INTERIOR_URL = '/cover.png' // Changed filename here
const LOGO_URL = '/logo.png'

export const metadata: Metadata = {
  title: 'Admin Login',
  description: 'Admin login page',
}

export default function AdminLoginPage() {
  return (
    <div
      style={{ backgroundImage: `url(${LIBRARY_INTERIOR_URL})` }}
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
    >
      <Card className="w-full max-w-md md:max-w-3xl shadow-xl bg-background/70 backdrop-blur-md rounded-lg flex flex-col md:flex-row max-h-[calc(100vh_-_theme(space.8))] overflow-y-auto">

        {/* Logo Section (Left Column on MD+) */}
        <div className="flex flex-col items-center justify-center px-4 pt-4 pb-0 sm:p-6 md:w-1/3 md:border-r md:border-border/30">
          <div className="relative w-16 h-auto sm:w-24 md:w-28 mb-0 sm:mb-6 md:mb-0">
            <Image
              src={LOGO_URL}
              alt="Taxshila Companion Logo"
              width={150}
              height={150}
              className="w-full h-auto object-contain"
              data-ai-hint="logo brand"
              priority
            />
          </div>
        </div>

        {/* Form Section (Right Column on MD+) */}
       <div className="flex flex-col flex-grow md:w-2/3">
         <CardHeader className="text-center px-4 pb-4 pt-4 sm:p-6">
           <CardTitle className="text-base sm:text-lg md:text-xl font-headline text-foreground">Welcome Back!</CardTitle>
           <CardDescription className="text-xs sm:text-xs md:text-sm text-foreground/80">Login to Taxshila Companion.</CardDescription>
         </CardHeader>
         <CardContent className="px-4 sm:px-6">
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm">Email or Phone Number</Label>
                <Input id="email" placeholder="Enter your email or phone" type="email" className="text-xs sm:text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs sm:text-sm">Password</Label>
                <Input id="password" placeholder="Enter your password" type="password" className="text-xs sm:text-sm" />
              </div>
              <Button className="w-full" size="sm">Login</Button>
            </form>
         </CardContent>
       </div>
      </Card>
    </div>
  )
}
