# Navigation & Learning Resources - README

## Overview
This document explains the new Candidates menu and Resources/Learning dropdown navigation structure.

## Where to Update Content

### Course Counts & Categories
- **File**: `src/data/learningCategories.ts`
- Update the `count` field for each subcategory
- Add new categories by adding objects to the `learningCategories` array
- Add new subcategories by adding objects to the `subcategories` array

### Category Icons
- Update the `icon` field in `learningCategories.ts`
- Use emoji or lucide-react icon names

### Link Targets
- Update the `path` field in each category/subcategory
- Current paths point to learning pages that can be customized

## Navigation Structure

### Candidates Menu
Located in: `src/components/layout/Header.tsx`
- All items are public (accessible without authentication)
- Items marked with `badge` show "*" to indicate login requirement for certain actions
- Update `candidateMenuItems` array to modify menu items

### Resources / Learning Dropdown
Located in: `src/components/layout/Header.tsx`
- Multi-column layout (4 columns on desktop)
- Mobile: Accordion-style collapsible categories
- Data source: `src/data/learningCategories.ts`
- "View All Categories" button links to `/learning/all-categories`

### Companies (formerly Resources)
- Renamed to avoid confusion with learning resources
- Contains company research and discovery features
- Update `companyResourceCategories` in Header.tsx

## Pages Created

### Candidate Pages
- `/candidate/resume-builder` - Resume Builder tool
- `/candidate/interview-prep` - Interview practice & tips
- `/candidate/coaching` - Career coaching request form
- `/jobs` - Browse all jobs
- `/jobs/software` - Software jobs (filtered)
- `/jobs/education` - Education jobs (filtered)

### Learning Pages
- `/learning/tech` - Tech Learning hub
- `/learning/non-tech` - Non-Tech Learning hub
- `/learning/education` - Education & Teaching hub
- `/learning/languages` - Languages & Communication hub
- `/learning/all-categories` - Complete catalog

## Customization Guide

### To Add a New Learning Category
1. Edit `src/data/learningCategories.ts`
2. Add a new object to the `learningCategories` array:
```typescript
{
  name: "Your Category",
  icon: "🎯",
  subcategories: [
    { name: "Subcategory 1", path: "/learning/your-path", count: 50 },
    // ... more subcategories
  ],
}
```

### To Replace Mock Learning Catalog
1. Create your backend API endpoints for courses
2. Update the `path` fields in `learningCategories.ts` to point to your API
3. Replace the mock course data in learning page files
4. Implement real course fetching in learning components

### To Add Authentication Requirements
In `Header.tsx`, update `candidateMenuItems`:
```typescript
{ name: "Your Item", path: "/path", public: false, badge: "Login required" }
```

Then add authentication checks in the target component.

## Mobile Behavior
- Hamburger menu collapses all navigation
- Resources/Learning uses accordion (Collapsible component)
- "View All Categories" button remains visible in mobile accordion

## Accessibility
- All dropdowns are keyboard-navigable
- ARIA attributes on dropdown triggers
- Semantic HTML structure
- Focus states on interactive elements
