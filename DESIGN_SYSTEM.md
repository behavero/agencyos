# 🎨 OnyxOS Design System

> **Style**: Vega | **Theme**: Lime | **Base**: Neutral | **Font**: Inter | **Icons**: Lucide

This document defines the official design system for OnyxOS. All components, pages, and features **MUST** follow these guidelines.

---

## 🎯 Core Principles

1. **Consistency** - Every UI element follows the same patterns
2. **Dark-First** - Dark mode is the primary experience
3. **Lime Accent** - Lime green (`oklch(0.841 0.238 116.029)`) is our brand color
4. **Vega Style** - Clean, modern, subtle interactions
5. **Inter Font** - Professional, readable typography

---

## 🎨 Color Palette

### Brand Colors (Lime)
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary` | `oklch(0.532 0.157 131.589)` | `oklch(0.841 0.238 116.029)` | CTAs, links, focus rings |
| `primary-foreground` | Light text on primary | Dark text on primary | Text on primary buttons |

### Neutral Base
| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Page backgrounds |
| `foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Primary text |
| `muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Subtle backgrounds |
| `muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Secondary text |
| `border` | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` | Borders, dividers |

### Semantic Colors
| Token | Color | Usage |
|-------|-------|-------|
| `destructive` | Red | Errors, delete actions |
| `chart-1` | Lime | Primary chart color |
| `chart-2` | Teal | Secondary chart color |
| `chart-3` | Blue | Tertiary chart color |
| `chart-4` | Amber | Warning/highlight |
| `chart-5` | Orange | Accent |

---

## 📐 Spacing & Radius

| Property | Value | Token |
|----------|-------|-------|
| **Border Radius** | `0.625rem` (10px) | `--radius` |
| **Radius SM** | `0.375rem` (6px) | `--radius-sm` |
| **Radius LG** | `0.625rem` (10px) | `--radius-lg` |
| **Radius XL** | `1.025rem` (16px) | `--radius-xl` |

### Padding Guidelines
- **Mobile**: `16px` horizontal padding
- **Desktop**: `32px` horizontal padding
- **Cards**: `16px` (sm) / `24px` (default) internal padding
- **Buttons**: `12px 16px` (sm) / `12px 24px` (default)

---

## 🔤 Typography

### Font Family
```css
font-family: var(--font-inter), system-ui, sans-serif;
```

### Font Sizes
| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 12px | Labels, badges |
| `text-sm` | 14px | Body text, descriptions |
| `text-base` | 16px | Default body |
| `text-lg` | 18px | Section titles |
| `text-xl` | 20px | Card titles |
| `text-2xl` | 24px | Page headings |
| `text-3xl` | 30px | Hero text |

### Font Weights
- `font-normal` (400) - Body text
- `font-medium` (500) - Labels, buttons
- `font-semibold` (600) - Headings
- `font-bold` (700) - Emphasis

---

## 🧩 Component Standards

### Buttons
**Always use shadcn/ui Button component**

```tsx
import { Button } from '@/components/ui/button'

// Primary (Lime)
<Button>Primary Action</Button>

// Secondary
<Button variant="secondary">Secondary</Button>

// Outline
<Button variant="outline">Outline</Button>

// Ghost (subtle)
<Button variant="ghost">Ghost</Button>

// Destructive
<Button variant="destructive">Delete</Button>
```

### Cards
**Always use shadcn/ui Card component**

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

<Card className="hover:border-primary/30 transition-colors">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Forms
**Always use shadcn/ui form components**

```tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

<div className="space-y-2">
  <Label>Field Label</Label>
  <Input placeholder="Enter value..." />
</div>
```

### Tables
**Always use shadcn/ui Table component**

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
```

### Dialogs
**Always use shadcn/ui Dialog component**

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
```

---

## 🎭 Utility Classes

### Available in globals.css

| Class | Description |
|-------|-------------|
| `.glass` | Glassmorphism effect (blur + transparency) |
| `.hover-lift` | Subtle lift on hover |
| `.gradient-text` | Lime-green gradient text |
| `.glow-lime` | Lime glow shadow |
| `.card-interactive` | Card with hover border effect |
| `.menu-item-subtle` | Vega-style menu item |
| `.stat-card` | Stats card with hover |
| `.section-title` | Section heading style |
| `.section-subtitle` | Section description style |
| `.scrollbar-thin` | Custom thin scrollbar |

### Badge Variants
| Class | Usage |
|-------|-------|
| `.badge-lime` | Primary/brand badges |
| `.badge-success` | Success states |
| `.badge-warning` | Warnings |
| `.badge-danger` | Errors/danger |

---

## 📊 Charts

**Always use shadcn/ui Chart components with Recharts**

### Chart Colors (in order of priority)
1. `--chart-1` - Lime (primary data)
2. `--chart-2` - Teal (secondary data)
3. `--chart-3` - Blue (tertiary data)
4. `--chart-4` - Amber (highlights)
5. `--chart-5` - Orange (accents)

```tsx
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

const chartConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--chart-1))' },
  expenses: { label: 'Expenses', color: 'hsl(var(--chart-2))' },
}
```

---

## 🖼️ Icons

**Always use Lucide React**

```tsx
import { Home, Users, Settings, ChevronRight } from 'lucide-react'

<Home className="w-5 h-5" />
```

### Icon Sizes
- **Small**: `w-4 h-4` (16px)
- **Default**: `w-5 h-5` (20px)
- **Large**: `w-6 h-6` (24px)
- **XL**: `w-8 h-8` (32px)

---

## 📱 Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Ultra-wide |

---

## 🚫 Don'ts

1. ❌ **Don't use custom CSS when shadcn/ui has the component**
2. ❌ **Don't use colors outside the palette**
3. ❌ **Don't use fonts other than Inter**
4. ❌ **Don't use icons from libraries other than Lucide**
5. ❌ **Don't hardcode color values - use CSS variables**
6. ❌ **Don't create new button/card/form styles**
7. ❌ **Don't use light mode as default (dark is primary)**

---

## ✅ Do's

1. ✅ **Use `primary` color for CTAs and focus states**
2. ✅ **Use `muted-foreground` for secondary text**
3. ✅ **Use `.hover-lift` for interactive cards**
4. ✅ **Use shadcn/ui components exclusively**
5. ✅ **Use `transition-colors` for hover effects**
6. ✅ **Use `rounded-lg` (or radius tokens) for corners**
7. ✅ **Use `gap-*` for spacing between elements**

---

## 📋 Quick Reference

```tsx
// Standard page structure
export default function Page() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Page Title</h1>
        <p className="text-muted-foreground">Page description text.</p>
      </div>
      
      {/* Content grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:border-primary/30 transition-colors">
          {/* Card content */}
        </Card>
      </div>
    </div>
  )
}
```

---

## 🔗 Resources

- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [shadcn/ui Create Tool](https://ui.shadcn.com/create)
- [Lucide Icons](https://lucide.dev/icons)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Last Updated**: February 2026
**Theme Version**: Vega + Lime v1.0
