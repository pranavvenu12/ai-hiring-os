# UI/UX Design Specification

## 1. Design Philosophy
AI Hiring OS is designed around the principles of **clarity, premium aesthetics, and responsive micro-interactions**. The core philosophy is to simplify complex multi-role HR processes into visually stunning workspaces that minimize cognitive load. 

By leveraging **glassmorphism**, dynamic state transitions, and harmonious color palettes, the application delivers a modern software experience that is both functional and delightful.

---

## 2. Brand Identity
*   **Personality**: Professional, cutting-edge, secure, and human-centric.
*   **Design Language**: Glassmorphism (subtle blurs, white borders, light backgrounds) combined with clean layout boxes and structured typography.
*   **Motion**: Fluid transitions powered by Framer Motion to provide instant feedback and make the app feel alive.

---

## 3. Color System
The color system features a tailored slate-gray base paired with modern, vibrant brand colors:

| Category | Primary Color | HSL Code | Purpose |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | Indigo Violet | `hsl(243, 75%, 59%)` | High-importance actions, active tabs, buttons. |
| **Brand Accent** | Deep Violet | `hsl(263, 70%, 50%)` | Secondary accents and visual gradients. |
| **Neutral Dark** | Slate 900 | `hsl(222, 47%, 11%)` | Headings, main text, and structural accents. |
| **Neutral Muted** | Slate 400 | `hsl(215, 16%, 57%)` | Subtitles, helper text, and secondary details. |
| **Success** | Emerald Green | `hsl(142, 70%, 45%)` | Status badges (e.g., active, completed, present). |
| **Warning** | Amber Yellow | `hsl(35, 92%, 50%)` | Pending items, half-days, and warning notices. |
| **Danger** | Rose Red | `hsl(346, 84%, 61%)` | Deleted items, alerts, and failed screens. |

---

## 4. Typography
The system uses the **Inter** font family, optimized for readability on multiple screen sizes:

*   **Display / Hero Headings**: `font-black font-inter tracking-tight` (used for titles and key metrics).
*   **Section Headers**: `font-bold text-slate-800 text-lg` (titles for lists and card sections).
*   **Status / Badge Text**: `font-black text-[10px] tracking-widest uppercase` (ensures readability for badges).
*   **Body Copy**: `font-medium text-slate-500 text-sm` (clean, legible body text).

---

## 5. Layout Principles
The layout uses a **persistent sidebar + fixed header** grid structure:
*   **Desktop Layout**: A 280px wide sidebar is locked to the left. The remaining space features a scrollable content box with standard 40px margins.
*   **Grid Gradients**: Interactive cards feature HSL-based border overlays, giving them a premium feel as they hover.
*   **Glassmorphic Overlays**: Dropdowns and drawers use light background blurs (`backdrop-blur-md bg-white/80`) to maintain a clean visual hierarchy.

---

## 6. Dashboard Workspaces

### 6.1 HR & Recruiter Dashboard
*   **Key Widgets**: Total Employees, Attendance Today, Average Performance, and Interview Completion Rate.
*   **Interaction**: Clickable quick links allow users to open candidate profiles, launch active job boards, or review attendance lists with a single click.

### 6.2 Manager Dashboard
*   **Focus**: Appraising team performance and tracking direct reports.
*   **Interaction**: Features a quick-action review drawer that allows managers to submit appraisal scorecards directly from their dashboard.

### 6.3 Employee Portal
*   **Focus**: Single-click clock-in and profile management.
*   **Interaction**: Prominently displays the daily attendance widget with a high-contrast check-in button, alongside a list of historic performance ratings.

---

## 7. AI Interview Workspace
The AI Interview Assistant interface features a step-by-step wizard to set up and conduct interviews:

```
+--------------------------------------------------------------+
| [Step 1: Select Job] -> [Step 2: Candidate] -> [Step 3: Type]|
+--------------------------------------------------------------+
|                                                              |
|                "AI INTERVIEW SESSION ACTIVE"                 |
|                                                              |
|   [Question Card]                                            |
|   "Describe a complex technical challenge you solved."        |
|                                                              |
|   [Record Button (Mic)]                                      |
|   "Click to speak..."                                        |
|                                                              |
|   [Real-time Transcript Box]                                 |
|   "I designed a secure multi-tenant indexing layer..."       |
|                                                              |
+--------------------------------------------------------------+
```

*   **Voice Integration**: Features an interactive microphone button with pulse animations during active recording, alongside real-time transcript generation.

---

## 8. UX States

### 8.1 Loading State
*   **Visual**: Displays a subtle indigo loading spinner (`Loader2`) with page-level fade-ins to prevent visual stuttering.

### 8.2 Error State
*   **Visual**: Uses soft rose warning cards (`bg-rose-50 border-rose-100`) to display clear error messages and include a "Try again" action button.

### 8.3 Empty State
*   **Visual**: Displays a clean, muted icon (e.g., folder or group) centered with clear copy (e.g., "Talent Pool is empty") and an primary CTA to take action.

### 8.4 Success State
*   **Visual**: Features slide-down emerald notification alerts with clear feedback messages (e.g., "Employee profile updated successfully!").

---

## 9. Mobile Responsiveness
*   **Collapsible Menu**: The desktop sidebar collapses on mobile screens into a slide-out drawer triggered by a responsive menu button.
*   **Fluid Grids**: Dashboard metrics automatically stack, transitioning from 4 columns on desktop to 2 columns on tablet and 1 column on mobile devices.
*   **Mobile-Friendly Inputs**: Interactive tables automatically transition into easy-to-read vertical cards on mobile screens.

---

## 10. Design Rules & Accessibility
*   **High Contrast**: Maintain a WCAG 2.1 AA compliant contrast ratio (minimum 4.5:1) for all core headings and body text.
*   **Keyboard Navigation**: Form modals are fully accessible, supporting keyboard controls like escaping modals via the `ESC` key.
*   **Aria Roles**: Interactive elements feature descriptive labels to ensure compatibility with screen readers.
