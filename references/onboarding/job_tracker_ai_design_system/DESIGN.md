---
name: Job Tracker AI Design System
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#585f6c'
  on-secondary: '#ffffff'
  secondary-container: '#dce2f3'
  on-secondary-container: '#5e6572'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#dce2f3'
  secondary-fixed-dim: '#c0c7d6'
  on-secondary-fixed: '#151c27'
  on-secondary-fixed-variant: '#404754'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
  display-mobile:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
This design system embodies a **Premium Minimalist** aesthetic, drawing inspiration from high-end utility tools like Apple, Linear, and Raycast. The brand personality is professional, hyper-focused, and trustworthy, aimed at high-achieving professionals navigating their career growth.

The visual narrative relies on extreme clarity, intentional whitespace, and a monochromatic palette to convey sophistication. By stripping away decorative gradients and vibrant colors, the UI positions itself as a serious tool for serious work. The mood is "quiet luxury" for software: fast, responsive, and impeccably organized.

## Colors
The palette is strictly monochromatic to maintain a premium SaaS feel. 
- **Primary (#111111):** Used for primary actions, headings, and the core brand mark. It provides the necessary weight and authority.
- **Secondary (#6B7280):** Reserved for body text, descriptions, and metadata to create a clear hierarchy.
- **Accent (#F5F5F5):** Used for subtle component backgrounds, hover states, and "ghost" buttons.
- **Pure White (#FFFFFF):** The base for all surfaces to maximize "breathability" and cleanliness.
- **Borders (#ECECEC):** Ultra-thin dividers and container outlines that define structure without adding visual noise.

## Typography
We use **Geist** for its technical precision and modern Swiss-inspired proportions. 
- **Headlines:** Set in bold weights with tight letter-spacing to create a "strong" editorial look.
- **Body:** Generous line heights ensure maximum readability during long sessions of data entry or review.
- **Data Labels:** Use the medium weight at smaller scales to ensure tabular data and form labels remain legible but secondary to the primary content.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for dashboard views to maintain a "contained" and organized feel, while landing pages utilize a more fluid, centered approach.

- **Desktop:** 12-column grid with a 1200px max-width. Large 48px margins create the "Apple-style" breathing room.
- **Tablet:** 8-column grid with 32px margins.
- **Mobile:** 4-column grid with 16px margins.

Spacing follows an 8px linear scale. Large components (like cards) should be separated by `stack-lg` (32px) to maintain the minimalist narrative.

## Elevation & Depth
Hierarchy is established through **Soft Ambient Shadows** and **Low-Contrast Outlines** rather than heavy color fills.

- **Level 1 (Base):** Pure #FFFFFF background.
- **Level 2 (Cards):** Soft #ECECEC 1px border with a massive, diffused shadow: `0 20px 60px rgba(0,0,0,0.08)`. This creates a "floating" effect synonymous with premium modern software.
- **Level 3 (Modals/Popovers):** Same shadow profile as Level 2 but with a slightly thicker 1.5px border to emphasize the foreground state.

Avoid inner shadows or heavy bevels. Surfaces should feel flat, matte, and light.

## Shapes
The shape language is defined by high-radius "squircle" containers.
- **Large Containers/Cards:** Use a fixed **24px** radius to create a soft, friendly, yet professional framing for content.
- **Interactive Elements:** Buttons and Input fields use a tighter **8px** radius to provide a functional contrast against the larger containers.
- **Icons:** Should follow a 1.5px to 2px stroke weight with rounded terminals to match the Geist typeface.

## Components
Components are inspired by the `shadcn/ui` philosophy: functional, accessible, and unstyled by default, then layered with premium tokens.

- **Buttons:**
  - *Primary:* Solid #111111 background, white text. No gradient.
  - *Secondary:* #F5F5F5 background with a subtle #ECECEC border.
- **Input Fields:** 1px #ECECEC border that transitions to #111111 on focus. Use a subtle 2px offset ring for focus states.
- **Cards:** The signature component. Pure white background, 24px corner radius, and the 60px blur shadow. Internal padding should be a minimum of 32px.
- **Chips/Badges:** Small, 12px font size, #F5F5F5 background with a soft #6B7280 text color for non-intrusive status indicators.
- **Status Indicators:** Use small 8px solid dots for "AI Status" (pulsing white/black) to maintain the monochrome theme without using red/green unless absolutely necessary for error handling.