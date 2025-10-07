import React from 'react'
import { Menu, Search, Bell, Settings } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { Input } from './ui/input'
import { Button } from './ui/button'

const Header = ({ onMenuClick }) => {
  return (
    <header className="flex h-16 items-center justify-between bg-background border-b border-border px-6 relative">
      {/* Left side - Menu and divider */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="h-6 w-px bg-border hidden lg:block"></div>
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
        </div>
      </div>
      
      {/* Center - Logo */}
      <div className="absolute left-1/2 transform -translate-x-1/2 z-10">
        <img 
          src="/Meal.svg" 
          alt="Meal Saver Logo" 
          className="h-32 w-auto"
        />
      </div>
      
      <div className="flex items-center gap-2 lg:gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full"></span>
        </Button>
        
        <ThemeToggle />
      </div>
    </header>
  )
}

export default Header
