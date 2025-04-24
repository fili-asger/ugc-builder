import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import React from "react";
import Link from "next/link";
import { Home, Settings, Users, FileText, Menu, Building } from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function Sidebar() {
  return (
    <div className="h-full flex flex-col border-r bg-muted/40 p-4">
      <div className="mb-4 flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="">UGC Builder</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-1 text-sm font-medium">
        <Link
          href="#"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "justify-start text-muted-foreground hover:text-foreground"
          )}
        >
          <Home className="mr-2 h-4 w-4" /> Dashboard
        </Link>
        <Link
          href="/briefs"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "justify-start text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText className="mr-2 h-4 w-4" /> Briefs
        </Link>
        <Link
          href="/brands"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "justify-start text-muted-foreground hover:text-foreground"
          )}
        >
          <Building className="mr-2 h-4 w-4" /> Brands
        </Link>
        <Link
          href="/actors"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "justify-start text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="mr-2 h-4 w-4" /> Actors
        </Link>
        <Link
          href="#"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "justify-start text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="mr-2 h-4 w-4" /> Settings
        </Link>
      </nav>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>
      <div className="flex-1"></div>
      <div className="relative ml-auto flex-1 grow-0"></div>
      <div className="relative ml-auto flex-initial"></div>
    </header>
  );
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UGC Builder",
  description: "Platform for generating UGC briefs and managing actors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen w-full bg-background font-sans antialiased",
          geistSans.variable,
          geistMono.variable
        )}
      >
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
            <Sidebar />
          </aside>

          <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-60">
            <Header />
            <main className="flex-1 gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
