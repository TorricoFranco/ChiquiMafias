---
name: Estadio Digital Core
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c6c9ab'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#909378'
  outline-variant: '#454932'
  surface-tint: '#b8d300'
  primary: '#ffffff'
  on-primary: '#2c3400'
  primary-container: '#d2f000'
  on-primary-container: '#5d6b00'
  inverse-primary: '#576500'
  secondary: '#ffb4ab'
  on-secondary: '#690006'
  secondary-container: '#d30017'
  on-secondary-container: '#ffe2de'
  tertiary: '#ffffff'
  on-tertiary: '#313030'
  tertiary-container: '#e5e2e1'
  on-tertiary-container: '#656464'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d2f000'
  primary-fixed-dim: '#b8d300'
  on-primary-fixed: '#191e00'
  on-primary-fixed-variant: '#414c00'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb4ab'
  on-secondary-fixed: '#410002'
  on-secondary-fixed-variant: '#93000c'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  stats-number:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  sidebar-width: 280px
---

## Brand & Style
The design system is engineered for the high-intensity world of Argentine football, targeting a passionate, tech-savvy audience that demands real-time data and immersive streaming. The brand personality is aggressive, digital-first, and energetic.

The design style is **High-Contrast Modern with Cyber-Athletic influences**. It leverages a deep, "True Black" foundation to make neon accents oscillate with perceived luminosity. The aesthetic draws from the tension of a stadium under floodlights—dark shadows contrasted against hyper-bright focal points. Visual interest is maintained through subtle glows, sharp geometry, and a focus on "Live" kinetic energy.

## Colors
This design system utilizes a high-octane dark palette designed for OLED screens and low-light viewing environments typical of sports fans.

- **Backgrounds**: Use `#050505` for the primary canvas and `#121212` for elevated containers (cards, sidebars).
- **Primary (Electric Lime)**: `#DFFF00` is reserved for action-oriented elements, active navigation states, and primary buttons. Use with a 10-15% opacity outer glow for "glow" effects.
- **Secondary (Live Red)**: `#FF3131` is strictly for real-time indicators ("VIVO"), urgent alerts, and losing odds/indicators.
- **Surface Accents**: Use `#1E1E1E` for borders and dividers to maintain a subtle structure without breaking the dark immersion.

## Typography
The typography system balances the editorial weight of **Montserrat** for headlines with the technical precision of **Inter** for data-heavy interfaces.

- **Headlines**: Use Montserrat in Bold or ExtraBold weights. All-caps should be applied to section headers and "Live" badges to evoke a stadium scoreboard feel.
- **Body & Data**: Inter is used for match stats, betting odds, and chat logs to ensure maximum legibility at small sizes.
- **Numerical Data**: Always use the "stats-number" role for match scores and betting odds to ensure they stand out as primary information.

## Layout & Spacing
The layout follows a **structured fluid grid** with a fixed vertical sidebar for navigation and a persistent right-hand drawer for chat/betting slips.

- **Grid**: Use a 12-column grid for the main content area. Gutter width is fixed at 16px to keep content dense and energetic.
- **Sidebar**: The navigation sidebar is 280px wide. On mobile, this collapses into a bottom navigation bar.
- **Density**: Spacing is tight (4px/8px increments) to reflect the data-rich nature of sports betting. 
- **Chat Layout**: The chat interface uses a "bubble-less" design, relying on vertical indentation and subtle background shifts to differentiate users.

## Elevation & Depth
Depth in this design system is achieved through **Tonal Layering and Inner Glows** rather than traditional shadows.

- **Base Layer**: `#050505` (Deepest depth).
- **Surface Layer**: `#121212` (Cards, sidebar, chat input). Use a 1px solid border of `#1E1E1E` to define edges.
- **Active State Elevation**: When a match card or button is focused, apply a subtle 4px blur glow using the Primary Accent color at 20% opacity.
- **Interactive Depth**: Elements should feel like they are "lit from within." Use 1px inner borders (top and left) with a slight white opacity (5%) to simulate light hitting the edge of a physical console.

## Shapes
The shape language is **Technical and Precise**. 

- **Corners**: Use a "Soft" radius (4px to 8px) for cards and buttons. Avoid fully rounded pill shapes except for status indicators (e.g., "LIVE" badges).
- **Interactive Elements**: Buttons use a subtle 4px radius to feel modern but maintain a structural, serious edge.
- **Progress Bars**: Betting bars and polling indicators should have sharp corners (0px or 2px) to look like precision instruments.

## Components

### Buttons & Inputs
- **Primary Button**: Background `#DFFF00`, text `#050505`, Bold weight. On hover, apply a `box-shadow: 0 0 15px rgba(223, 255, 0, 0.4)`.
- **Ghost Input**: Background `#121212`, border 1px solid `#1E1E1E`. Focused state uses a `#DFFF00` border.

### Match Cards
- Background: `#121212`.
- Header: Displays league name and a "Live" pulse indicator in `#FF3131`.
- Content: Two-column layout for teams with prominent Montserrat scores.
- Footer: Contains quick-bet odds in high-contrast boxes.

### Chat Interface
- **User Banners**: Tiered users (VIP, Mods) get a 2px left-border accent in the Primary color.
- **Messages**: Direct, no-bubble text. Username in white, body text in light gray.
- **Mentions**: Background highlight of `#DFFF00` at 10% opacity with a solid left-edge stroke.

### Betting & Polling
- **Progress Bars**: Dual-color bars (e.g., Team A vs Team B). Use Primary for the leading option and a muted gray for the trailing.
- **Odds Toggle**: Segmented controls with a high-contrast `#DFFF00` indicator for the active selection.

### Live Indicators
- A blinking dot animation paired with "VIVO" text in `#FF3131`. Text should use `label-md` for maximum impact.
